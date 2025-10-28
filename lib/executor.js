/**
 * Core execution engine for FlowSphere
 * Orchestrates the entire sequence execution flow
 */

const readline = require('readline');
const open = require('open');
const { readJSONFile, colorize, deepMerge, formatDuration, extractValue } = require('./utils');
const { substituteInObject, substituteWithTracking } = require('./substitution');
const { executeRequest } = require('./http-client');
const { validateResponse } = require('./validator');
const { evaluateConditions } = require('./conditions');

/**
 * Merge step config with defaults
 */
function mergeWithDefaults(step, defaults) {
  const merged = { ...step };

  // Base URL
  if (defaults.baseUrl && step.url && step.url.startsWith('/')) {
    merged.url = defaults.baseUrl + step.url;
  }

  // Timeout
  if (!merged.timeout && defaults.timeout) {
    merged.timeout = defaults.timeout;
  }

  // Headers (merge)
  if (defaults.headers) {
    merged.headers = { ...(defaults.headers || {}), ...(step.headers || {}) };
  }

  // Validations (merge unless skipDefaultValidations is true)
  if (step.skipDefaultValidations === true) {
    // Skip default validations - use only step validations (or empty array)
    merged.validations = step.validations || [];
  } else {
    // Merge default validations with step validations
    if (defaults.validations || step.validations) {
      merged.validations = [
        ...(defaults.validations || []),
        ...(step.validations || [])
      ];
    }
  }

  return merged;
}

/**
 * Prompt user for input
 */
async function promptUserInput(userPrompts) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const userInput = {};

  for (const [key, prompt] of Object.entries(userPrompts)) {
    const answer = await new Promise((resolve) => {
      rl.question(`${prompt} `, resolve);
    });
    userInput[key] = answer;
  }

  rl.close();
  return userInput;
}

/**
 * Execute a single step
 * Returns both the response and the actual request details (after substitution)
 */
async function executeStep(step, context) {
  const { enableDebug } = context;

  // Substitute variables in step configuration and track substitutions
  const { result: substitutedStep, substitutions } = substituteWithTracking(step, context);

  const { method, url, headers, body, timeout } = substitutedStep;

  if (enableDebug) {
    console.error(`DEBUG: Executing ${method} ${url}`);
    if (headers) console.error(`DEBUG: Headers: ${JSON.stringify(headers)}`);
    if (body) console.error(`DEBUG: Body: ${JSON.stringify(body)}`);
  }

  // Execute HTTP request
  const response = await executeRequest({
    method,
    url,
    headers,
    body,
    timeout
  });

  // Return response, request details, and substitution info
  return {
    response,
    requestDetails: { method, url, headers, body },
    substitutions
  };
}

/**
 * Main execution function
 */
async function runSequence(configPath, options = {}) {
  const { startStep = 0, enableDebug = false } = options;

  // Load config
  const config = readJSONFile(configPath);

  // Load defaults
  const defaults = config.defaults || {};
  console.log(colorize('Loaded defaults from configuration', 'gray'));

  // Load global variables
  const vars = config.variables || {};
  const varCount = Object.keys(vars).length;
  if (varCount > 0) {
    console.log(colorize(`Loaded ${varCount} global variable(s) from configuration`, 'gray'));
  }

  // Get nodes
  const nodes = config.nodes || [];
  console.log(colorize(`\nStarting HTTP sequence with ${nodes.length} nodes...\n`, 'cyan'));

  // Execution state
  const responses = [];
  const executionLog = [];
  let stepsExecuted = 0;
  let stepsSkipped = 0;

  // Execute each node
  for (let i = 0; i < nodes.length; i++) {
    const stepNum = i + 1;
    let node = nodes[i];

    // Merge with defaults
    node = mergeWithDefaults(node, defaults);

    const { id, name, method, url, userPrompts, conditions, validations, launchBrowser } = node;

    // Skip steps before startStep
    if (i < startStep) {
      const skipReason = `--start-step: execution begins at step ${startStep + 1}`;
      console.log(`${method} ${url} ${colorize('⊘ SKIPPED', 'yellow')} (${skipReason})`);

      // Store empty response to maintain indexing
      responses.push({ id, status: 0, body: {} });

      // Log skipped step
      executionLog.push({
        step: stepNum,
        id,
        name,
        method,
        url,
        status: 'skipped',
        skip_reason: skipReason
      });

      stepsSkipped++;
      continue;
    }

    // Evaluate conditions
    let userInput = {};
    const context = { vars, responses, input: userInput, enableDebug };

    const { shouldExecute, skipReason } = evaluateConditions(conditions, context);

    if (!shouldExecute) {
      console.log(`${method} ${url} ${colorize('⊘ SKIPPED', 'blue')} (${skipReason})`);

      // Store empty response to maintain indexing
      responses.push({ id, status: 0, body: {} });

      // Log skipped step
      executionLog.push({
        step: stepNum,
        id,
        name,
        method,
        url,
        status: 'skipped',
        skip_reason: skipReason
      });

      stepsSkipped++;
      continue;
    }

    // Prompt for user input if needed
    if (userPrompts && Object.keys(userPrompts).length > 0) {
      const displayName = name ? `"${name}"` : `${method} ${url}`;
      console.log(colorize(`\n${displayName} requires user input:`, 'cyan'));
      userInput = await promptUserInput(userPrompts);
      context.input = userInput;
    }

    // Execute step
    let requestDetails = null; // Initialize outside try block for error handling
    let substitutions = []; // Track substitutions for logging
    try {
      const startTime = Date.now();
      const result = await executeStep(node, context);
      const { response } = result;
      requestDetails = result.requestDetails;
      substitutions = result.substitutions || [];
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;

      // Validate response and get validation results
      let validationResults;
      try {
        validationResults = validateResponse(response, validations, enableDebug);
      } catch (validationError) {
        // Extract validation results from error (includes failed validations)
        validationResults = validationError.validationResults || [];

        // Print validation info before failing
        if (validationResults.length > 0) {
          for (const validation of validationResults) {
            const icon = validation.passed ? '✓' : '✗';
            const iconColor = validation.passed ? 'green' : 'red';

            if (validation.type === 'httpStatusCode') {
              const label = validation.passed ? 'Validated' : 'Failed';
              const suffix = validation.passed ? '' : ` (expected ${validation.expected})`;
              console.log(colorize(`  ${icon} ${label} status = `, iconColor) + colorize(validation.actual + suffix, 'yellow'));
            } else if (validation.type === 'jsonpath') {
              const displayValue = typeof validation.value === 'object'
                ? JSON.stringify(validation.value)
                : validation.value;
              const label = validation.passed ? 'Extracted' : 'Failed';
              console.log(colorize(`  ${icon} ${label} ${validation.path} = `, iconColor) + colorize(displayValue, 'yellow'));
            }
          }
        }

        // Re-throw the validation error
        throw validationError;
      }

      // Store response for future reference
      responses.push({
        id,
        status: response.status,
        body: response.body
      });

      // Print success
      const statusText = `${response.status} ${response.statusText}`;
      console.log(
        `${requestDetails.method} ${requestDetails.url} ${colorize('✅', 'green')} Status ${statusText} (${formatDuration(duration)})`
      );

      // Print validation info (like legacy CLI)
      if (validationResults && validationResults.length > 0) {
        for (const validation of validationResults) {
          const icon = validation.passed ? '✓' : '✗';
          const iconColor = validation.passed ? 'green' : 'red';

          if (validation.type === 'httpStatusCode') {
            const label = validation.passed ? 'Validated' : 'Failed';
            const suffix = validation.passed ? '' : ` (expected ${validation.expected})`;
            console.log(colorize(`  ${icon} ${label} status = `, iconColor) + colorize(validation.actual + suffix, 'yellow'));
          } else if (validation.type === 'jsonpath') {
            const displayValue = typeof validation.value === 'object'
              ? JSON.stringify(validation.value)
              : validation.value;
            const label = validation.passed ? 'Extracted' : 'Failed';
            console.log(colorize(`  ${icon} ${label} ${validation.path} = `, iconColor) + colorize(displayValue, 'yellow'));
          }
        }
      }

      // Log execution (use substituted values from requestDetails)
      executionLog.push({
        step: stepNum,
        id,
        name,
        method: requestDetails.method,
        url: requestDetails.url,
        request: {
          headers: requestDetails.headers || {},
          body: requestDetails.body || {}
        },
        response: {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          body: response.body
        },
        substitutions: result.substitutions || [],
        duration,
        status: 'completed'
      });

      stepsExecuted++;

      // Launch browser if configured
      if (launchBrowser) {
        const browserUrl = extractValue(response.body, launchBrowser);
        if (browserUrl) {
          console.log(colorize(`  ↗ Opening browser: ${browserUrl}`, 'gray'));
          await open(browserUrl);
        }
      }

    } catch (error) {
      // Execution or validation failed
      // Use substituted values if available, otherwise fall back to originals
      const logMethod = requestDetails ? requestDetails.method : method;
      const logUrl = requestDetails ? requestDetails.url : url;

      console.log(
        `${logMethod} ${logUrl} ${colorize('❌ FAILED', 'red')}`
      );
      console.log(colorize(`Error: ${error.message}`, 'red'));

      // Log failure
      executionLog.push({
        step: stepNum,
        id,
        name,
        method: logMethod,
        url: logUrl,
        request: requestDetails ? {
          headers: requestDetails.headers || {},
          body: requestDetails.body || {}
        } : {
          headers: headers || {},
          body: body || {}
        },
        substitutions: substitutions,
        error: error.message,
        status: 'failed'
      });

      // Stop execution on error
      console.log(colorize(`\nExecution stopped due to error in step ${stepNum}`, 'red'));
      console.log(colorize(`\nSummary: ${stepsExecuted} executed, ${stepsSkipped} skipped, 1 failed`, 'red'));

      return {
        success: false,
        stepsExecuted,
        stepsSkipped,
        stepsFailed: 1,
        executionLog
      };
    }
  }

  // All steps completed successfully
  console.log(colorize(`\n✅ Sequence completed successfully!`, 'green'));
  console.log(colorize(`Summary: ${stepsExecuted} executed, ${stepsSkipped} skipped\n`, 'green'));

  return {
    success: true,
    stepsExecuted,
    stepsSkipped,
    stepsFailed: 0,
    executionLog
  };
}

module.exports = {
  runSequence,
  readJSONFile,
  mergeWithDefaults,
  promptUserInput,
  executeStep
};
