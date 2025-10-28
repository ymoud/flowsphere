/**
 * Execution logging system for FlowSphere
 * Handles saving execution logs to JSON files
 */

const path = require('path');
const readline = require('readline');
const { writeJSONFile, getLogTimestamp } = require('./utils');

/**
 * Prompt user to save execution log
 *
 * @param {Array} executionLog - Array of log entries
 * @param {string} configPath - Path to config file that was executed
 * @param {Object} executionResult - Execution result with metadata
 * @returns {Promise<string|null>} Path to saved log file or null if not saved
 */
async function promptSaveLog(executionLog, configPath, executionResult = {}) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const answer = await new Promise((resolve) => {
    rl.question('Save execution log? (y/n): ', resolve);
  });

  rl.close();

  if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
    return null;
  }

  // Generate log filename
  const timestamp = getLogTimestamp();
  const logDir = path.join(process.cwd(), 'logs');
  const logPath = path.join(logDir, `execution_log_${timestamp}.json`);

  // Save using common logic
  const savedPath = _saveLogWithMetadata(logPath, executionLog, configPath, executionResult);

  console.log(`\nExecution log saved to: ${savedPath}`);

  return savedPath;
}

/**
 * Save execution log without prompting
 *
 * @param {Array} executionLog - Array of log entries
 * @param {string} configPath - Path to config file that was executed
 * @param {string} outputPath - Optional custom output path
 * @param {Object} executionResult - Execution result with metadata
 * @returns {string} Path to saved log file
 */
function saveLog(executionLog, configPath, outputPath = null, executionResult = {}) {
  let logPath;

  if (outputPath) {
    logPath = outputPath;
  } else {
    const timestamp = getLogTimestamp();
    const logDir = path.join(process.cwd(), 'logs');
    logPath = path.join(logDir, `execution_log_${timestamp}.json`);
  }

  return _saveLogWithMetadata(logPath, executionLog, configPath, executionResult);
}

/**
 * Internal function to save log with metadata (matches legacy bash format)
 *
 * @param {string} logPath - Full path to log file
 * @param {Array} executionLog - Array of log entries
 * @param {string} configPath - Path to config file
 * @param {Object} executionResult - Execution result metadata
 * @returns {string} Path to saved log file
 */
function _saveLogWithMetadata(logPath, executionLog, configPath, executionResult) {
  const { success, stepsExecuted = 0, stepsSkipped = 0, stepsFailed = 0, startStep = 0 } = executionResult;

  // Determine execution status
  let executionStatus;
  if (success === true) {
    executionStatus = 'success';
  } else if (success === false) {
    executionStatus = 'failure';
  } else {
    // No status provided, infer from log
    executionStatus = 'unknown';
  }

  // Find failed step info (if any)
  let failedStepInfo = null;
  if (executionStatus === 'failure' && executionLog.length > 0) {
    const failedStep = executionLog.find(step => step.status === 'failed');
    if (failedStep) {
      failedStepInfo = {
        step: failedStep.step,
        id: failedStep.id
      };
    }
  }

  // Create metadata object (matches bash format exactly)
  const metadata = {
    config_file: configPath,
    execution_status: executionStatus,
    timestamp: new Date().toISOString(),
    skip_steps: startStep || stepsSkipped,
    executed_steps: executionLog.length
  };

  // Add failed_step info if present
  if (failedStepInfo) {
    metadata.failed_step = failedStepInfo;
  }

  // Create log structure (matches legacy bash format)
  const logData = {
    metadata,
    steps: executionLog
  };

  // Save log file
  writeJSONFile(logPath, logData);

  return logPath;
}

module.exports = {
  promptSaveLog,
  saveLog
};
