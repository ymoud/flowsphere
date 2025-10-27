/**
 * Conditional execution engine for FlowSphere
 * Evaluates conditions to determine if a step should execute
 */

const { extractValue } = require('./utils');
const { substituteVariables } = require('./substitution');

/**
 * Evaluate a single condition
 *
 * @param {Object} condition - Condition object
 * @param {Object} context - Execution context
 * @param {Object} context.vars - Global variables
 * @param {Array<Object>} context.responses - Previous responses
 * @param {Object} context.input - User input
 * @param {boolean} context.enableDebug - Debug mode
 * @returns {{passed: boolean, reason: string}} Evaluation result
 */
function evaluateCondition(condition, context) {
  const { vars = {}, responses = [], input = {}, enableDebug = false } = context;

  // Determine source type
  const sourceType = condition.source || (condition.node ? 'node' : condition.variable ? 'variable' : 'input');

  // Get the value to check based on source type
  let actualValue;
  let sourceDescription;

  if (sourceType === 'node') {
    const nodeId = condition.node;
    const response = responses.find(r => r.id === nodeId);

    if (!response) {
      return {
        passed: false,
        reason: `node '${nodeId}' not found or not executed yet`
      };
    }

    // Check HTTP status code
    if (condition.httpStatusCode !== undefined) {
      const expectedStatus = condition.httpStatusCode;
      const actualStatus = response.status;

      if (actualStatus === expectedStatus) {
        return { passed: true, reason: '' };
      } else {
        return {
          passed: false,
          reason: `node '${nodeId}' HTTP status: expected ${expectedStatus}, got ${actualStatus}`
        };
      }
    }

    // Extract field value
    const field = condition.field;
    actualValue = extractValue(response.body, field);
    sourceDescription = `node '${nodeId}' field ${field}`;

  } else if (sourceType === 'variable') {
    const varName = condition.variable;
    actualValue = vars[varName];
    sourceDescription = `variable '${varName}'`;

  } else if (sourceType === 'input') {
    const inputName = condition.input;
    actualValue = input[inputName];
    sourceDescription = `user input '${inputName}'`;
  }

  // Substitute variables in condition values
  const substitutionContext = { vars, responses, input, enableDebug };

  // Check equals
  if (condition.equals !== undefined) {
    let expectedValue = condition.equals;

    // Substitute variables in expected value
    if (typeof expectedValue === 'string') {
      expectedValue = substituteVariables(expectedValue, substitutionContext);
    }

    const actualStr = String(actualValue);
    const expectedStr = String(expectedValue);

    if (actualStr === expectedStr) {
      return { passed: true, reason: '' };
    } else {
      return {
        passed: false,
        reason: `${sourceDescription}: expected '${expectedValue}', got '${actualValue}'`
      };
    }
  }

  // Check notEquals
  if (condition.notEquals !== undefined) {
    let unwantedValue = condition.notEquals;

    // Substitute variables in unwanted value
    if (typeof unwantedValue === 'string') {
      unwantedValue = substituteVariables(unwantedValue, substitutionContext);
    }

    const actualStr = String(actualValue);
    const unwantedStr = String(unwantedValue);

    if (actualStr !== unwantedStr) {
      return { passed: true, reason: '' };
    } else {
      return {
        passed: false,
        reason: `${sourceDescription}: should not equal '${unwantedValue}', but it does`
      };
    }
  }

  // Check exists
  if (condition.exists !== undefined) {
    const shouldExist = condition.exists;
    const exists = actualValue !== null && actualValue !== undefined;

    if (shouldExist === exists) {
      return { passed: true, reason: '' };
    } else if (shouldExist) {
      return {
        passed: false,
        reason: `${sourceDescription}: expected to exist, but it doesn't`
      };
    } else {
      return {
        passed: false,
        reason: `${sourceDescription}: expected to not exist, but got '${actualValue}'`
      };
    }
  }

  // Numeric comparisons
  const numericValue = parseFloat(actualValue);

  if (condition.greaterThan !== undefined) {
    let thresholdValue = condition.greaterThan;

    // Substitute variables in threshold
    if (typeof thresholdValue === 'string') {
      thresholdValue = substituteVariables(thresholdValue, substitutionContext);
    }

    const threshold = parseFloat(thresholdValue);

    if (isNaN(numericValue)) {
      return {
        passed: false,
        reason: `${sourceDescription}: expected numeric value for comparison, got '${actualValue}'`
      };
    }

    if (numericValue > threshold) {
      return { passed: true, reason: '' };
    } else {
      return {
        passed: false,
        reason: `${sourceDescription}: expected > ${threshold}, got ${numericValue}`
      };
    }
  }

  if (condition.lessThan !== undefined) {
    let thresholdValue = condition.lessThan;

    // Substitute variables in threshold
    if (typeof thresholdValue === 'string') {
      thresholdValue = substituteVariables(thresholdValue, substitutionContext);
    }

    const threshold = parseFloat(thresholdValue);

    if (isNaN(numericValue)) {
      return {
        passed: false,
        reason: `${sourceDescription}: expected numeric value for comparison, got '${actualValue}'`
      };
    }

    if (numericValue < threshold) {
      return { passed: true, reason: '' };
    } else {
      return {
        passed: false,
        reason: `${sourceDescription}: expected < ${threshold}, got ${numericValue}`
      };
    }
  }

  if (condition.greaterThanOrEqual !== undefined) {
    let thresholdValue = condition.greaterThanOrEqual;

    // Substitute variables in threshold
    if (typeof thresholdValue === 'string') {
      thresholdValue = substituteVariables(thresholdValue, substitutionContext);
    }

    const threshold = parseFloat(thresholdValue);

    if (isNaN(numericValue)) {
      return {
        passed: false,
        reason: `${sourceDescription}: expected numeric value for comparison, got '${actualValue}'`
      };
    }

    if (numericValue >= threshold) {
      return { passed: true, reason: '' };
    } else {
      return {
        passed: false,
        reason: `${sourceDescription}: expected >= ${threshold}, got ${numericValue}`
      };
    }
  }

  if (condition.lessThanOrEqual !== undefined) {
    let thresholdValue = condition.lessThanOrEqual;

    // Substitute variables in threshold
    if (typeof thresholdValue === 'string') {
      thresholdValue = substituteVariables(thresholdValue, substitutionContext);
    }

    const threshold = parseFloat(thresholdValue);

    if (isNaN(numericValue)) {
      return {
        passed: false,
        reason: `${sourceDescription}: expected numeric value for comparison, got '${actualValue}'`
      };
    }

    if (numericValue <= threshold) {
      return { passed: true, reason: '' };
    } else {
      return {
        passed: false,
        reason: `${sourceDescription}: expected <= ${threshold}, got ${numericValue}`
      };
    }
  }

  // If no condition type matched, return false
  return {
    passed: false,
    reason: `${sourceDescription}: no valid condition type specified`
  };
}

/**
 * Evaluate all conditions for a step (AND logic)
 *
 * @param {Array<Object>} conditions - Array of conditions
 * @param {Object} context - Execution context
 * @returns {{shouldExecute: boolean, skipReason: string}} Evaluation result
 */
function evaluateConditions(conditions, context) {
  if (!conditions || conditions.length === 0) {
    return { shouldExecute: true, skipReason: '' };
  }

  for (const condition of conditions) {
    const result = evaluateCondition(condition, context);

    if (!result.passed) {
      return {
        shouldExecute: false,
        skipReason: result.reason
      };
    }
  }

  return { shouldExecute: true, skipReason: '' };
}

module.exports = {
  evaluateCondition,
  evaluateConditions
};
