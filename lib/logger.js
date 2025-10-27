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
 * @returns {Promise<string|null>} Path to saved log file or null if not saved
 */
async function promptSaveLog(executionLog, configPath) {
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

  // Create log structure
  const logData = {
    timestamp: new Date().toISOString(),
    config: configPath,
    steps: executionLog
  };

  // Save log file
  writeJSONFile(logPath, logData);

  console.log(`\nExecution log saved to: ${logPath}`);

  return logPath;
}

/**
 * Save execution log without prompting
 *
 * @param {Array} executionLog - Array of log entries
 * @param {string} configPath - Path to config file that was executed
 * @param {string} outputPath - Optional custom output path
 * @returns {string} Path to saved log file
 */
function saveLog(executionLog, configPath, outputPath = null) {
  let logPath;

  if (outputPath) {
    logPath = outputPath;
  } else {
    const timestamp = getLogTimestamp();
    const logDir = path.join(process.cwd(), 'logs');
    logPath = path.join(logDir, `execution_log_${timestamp}.json`);
  }

  // Create log structure
  const logData = {
    timestamp: new Date().toISOString(),
    config: configPath,
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
