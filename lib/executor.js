/**
 * Core execution engine for FlowSphere
 * Orchestrates the entire sequence execution flow
 */

const readline = require('readline');
const open = require('open');
const { readJSONFile, colorize, deepMerge, formatDuration, extractValue } = require('./utils');
const { substituteInObject } = require('./substitution');
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

  // Validations (override or use defaults)
  if (!merged.validations && defaults.validations) {
    merged.validations = defaults.validations;
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
 */
async function executeStep(step, context) {
  const { enableDebug } = context;

  // Substitute variables in step configuration
  const substitutedStep = substituteInObject(step, context);

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

  return response;
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
      console.log(`Step ${stepNum}: ${method} ${url} ${colorize('⊘ SKIPPED', 'yellow')} (${skipReason})`);

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
      console.log(`Step ${stepNum}: ${method} ${url} ${colorize('⊘ SKIPPED', 'blue')} (${skipReason})`);

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
      console.log(colorize(`\nStep ${stepNum} requires user input:`, 'cyan'));
      userInput = await promptUserInput(userPrompts);
      context.input = userInput;
    }

    // Execute step
    try {
      const startTime = Date.now();
      const response = await executeStep(node, context);
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;

      // Validate response
      validateResponse(response, validations, enableDebug);

      // Store response for future reference
      responses.push({
        id,
        status: response.status,
        body: response.body
      });

      // Print success
      const statusText = `${response.status} ${response.statusText}`;
      console.log(
        `Step ${stepNum}: ${method} ${url} ${colorize('✅', 'green')} Status ${statusText} (${formatDuration(duration)})`
      );

      // Log execution
      executionLog.push({
        step: stepNum,
        id,
        name,
        method,
        url,
        request: {
          headers: node.headers,
          body: node.body
        },
        response: {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          body: response.body
        },
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
      console.log(
        `Step ${stepNum}: ${method} ${url} ${colorize('❌ FAILED', 'red')}`
      );
      console.log(colorize(`Error: ${error.message}`, 'red'));

      // Log failure
      executionLog.push({
        step: stepNum,
        id,
        name,
        method,
        url,
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
  runSequence
};
