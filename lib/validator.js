/**
 * Response validation engine for FlowSphere
 * Handles HTTP status code and JSON path validations
 */

const { extractValue } = require('./utils');

/**
 * Validate HTTP response against validation rules
 *
 * @param {Object} response - HTTP response object
 * @param {number} response.status - HTTP status code
 * @param {Object} response.body - Response body
 * @param {Array<Object>} validations - Array of validation rules
 * @param {boolean} enableDebug - Debug mode
 * @returns {Array} Array of validation results
 * @throws {Error} If validation fails
 */
function validateResponse(response, validations = [], enableDebug = false) {
  // If no validations specified, default to status 200
  if (!validations || validations.length === 0) {
    validations = [{ httpStatusCode: 200 }];
  }

  const validationResults = [];
  const errors = [];

  for (const validation of validations) {
    // HTTP Status Code validation
    if (validation.httpStatusCode !== undefined) {
      const expectedStatus = validation.httpStatusCode;
      const actualStatus = response.status;

      if (actualStatus !== expectedStatus) {
        errors.push(
          `HTTP status validation failed: expected ${expectedStatus}, got ${actualStatus}`
        );
        validationResults.push({
          type: 'httpStatusCode',
          expected: expectedStatus,
          actual: actualStatus,
          passed: false
        });
      } else {
        if (enableDebug) {
          console.error(`DEBUG: HTTP status validation passed: ${actualStatus}`);
        }

        validationResults.push({
          type: 'httpStatusCode',
          expected: expectedStatus,
          actual: actualStatus,
          passed: true
        });
      }
      continue;
    }

    // JSON Path validations
    if (validation.jsonpath) {
      const path = validation.jsonpath;
      const value = extractValue(response.body, path);

      if (enableDebug) {
        console.error(`DEBUG: Validating jsonpath ${path}, value: ${JSON.stringify(value)}`);
      }

      const result = {
        type: 'jsonpath',
        path: path,
        value: value,
        checks: [],
        passed: true
      };

      // Check if field exists
      if (validation.exists !== undefined) {
        const shouldExist = validation.exists;
        const exists = value !== null && value !== undefined;

        if (shouldExist && !exists) {
          errors.push(`Validation failed: field ${path} should exist but doesn't`);
          result.passed = false;
        } else if (!shouldExist && exists) {
          errors.push(`Validation failed: field ${path} should not exist but does (value: ${JSON.stringify(value)})`);
          result.passed = false;
        } else if (enableDebug) {
          console.error(`DEBUG: Existence validation passed for ${path}`);
        }
      }

      // Check equals
      if (validation.equals !== undefined) {
        const expected = validation.equals;
        const actual = String(value);
        const expectedStr = String(expected);

        if (actual !== expectedStr) {
          errors.push(`Validation failed: field ${path} should equal "${expected}", got "${value}"`);
          result.passed = false;
        } else if (enableDebug) {
          console.error(`DEBUG: Equals validation passed for ${path}`);
        }
      }

      // Check notEquals
      if (validation.notEquals !== undefined) {
        const unwanted = validation.notEquals;
        const actual = String(value);
        const unwantedStr = String(unwanted);

        if (actual === unwantedStr) {
          errors.push(`Validation failed: field ${path} should not equal "${unwanted}"`);
          result.passed = false;
        } else if (enableDebug) {
          console.error(`DEBUG: NotEquals validation passed for ${path}`);
        }
      }

      // Numeric validations
      const numericValue = parseFloat(value);

      if (validation.greaterThan !== undefined) {
        const threshold = parseFloat(validation.greaterThan);

        if (isNaN(numericValue)) {
          errors.push(`Validation failed: field ${path} is not numeric (value: ${value})`);
          result.passed = false;
        } else if (numericValue <= threshold) {
          errors.push(`Validation failed: field ${path} should be > ${threshold}, got ${numericValue}`);
          result.passed = false;
        } else if (enableDebug) {
          console.error(`DEBUG: GreaterThan validation passed for ${path}`);
        }
      }

      if (validation.lessThan !== undefined) {
        const threshold = parseFloat(validation.lessThan);

        if (isNaN(numericValue)) {
          errors.push(`Validation failed: field ${path} is not numeric (value: ${value})`);
          result.passed = false;
        } else if (numericValue >= threshold) {
          errors.push(`Validation failed: field ${path} should be < ${threshold}, got ${numericValue}`);
          result.passed = false;
        } else if (enableDebug) {
          console.error(`DEBUG: LessThan validation passed for ${path}`);
        }
      }

      if (validation.greaterThanOrEqual !== undefined) {
        const threshold = parseFloat(validation.greaterThanOrEqual);

        if (isNaN(numericValue)) {
          errors.push(`Validation failed: field ${path} is not numeric (value: ${value})`);
          result.passed = false;
        } else if (numericValue < threshold) {
          errors.push(`Validation failed: field ${path} should be >= ${threshold}, got ${numericValue}`);
          result.passed = false;
        } else if (enableDebug) {
          console.error(`DEBUG: GreaterThanOrEqual validation passed for ${path}`);
        }
      }

      if (validation.lessThanOrEqual !== undefined) {
        const threshold = parseFloat(validation.lessThanOrEqual);

        if (isNaN(numericValue)) {
          errors.push(`Validation failed: field ${path} is not numeric (value: ${value})`);
          result.passed = false;
        } else if (numericValue > threshold) {
          errors.push(`Validation failed: field ${path} should be <= ${threshold}, got ${numericValue}`);
          result.passed = false;
        } else if (enableDebug) {
          console.error(`DEBUG: LessThanOrEqual validation passed for ${path}`);
        }
      }

      // If no specific validation criteria, default to exists check
      if (
        validation.exists === undefined &&
        validation.equals === undefined &&
        validation.notEquals === undefined &&
        validation.greaterThan === undefined &&
        validation.lessThan === undefined &&
        validation.greaterThanOrEqual === undefined &&
        validation.lessThanOrEqual === undefined
      ) {
        if (value === null || value === undefined) {
          errors.push(`Validation failed: field ${path} does not exist`);
          result.passed = false;
        } else {
          if (enableDebug) {
            console.error(`DEBUG: Default existence validation passed for ${path}`);
          }
          result.checks.push('exists');
        }
      }

      validationResults.push(result);
    }
  }

  // If there were any errors, throw with all collected errors
  if (errors.length > 0) {
    const error = new Error(errors.join('; '));
    // Attach validation results to error so they can be accessed in catch blocks
    error.validationResults = validationResults;
    throw error;
  }

  return validationResults;
}

module.exports = {
  validateResponse
};
