/**
 * FlowSphere - HTTP Sequence Runner
 * Main library exports for programmatic use
 */

const { runSequence } = require('./executor');
const { promptSaveLog, saveLog } = require('./logger');

/**
 * Run a config file
 * @param {string} configPath - Path to config JSON file
 * @param {Object} options - Execution options
 * @param {number} options.startStep - Step index to start from (default: 0)
 * @param {boolean} options.enableDebug - Enable debug logging (default: false)
 * @param {boolean} options.saveLog - Auto-save execution log (default: false)
 * @param {string} options.logPath - Custom log file path (default: auto-generate)
 * @returns {Promise<Object>} Execution result
 */
async function run(configPath, options = {}) {
  const result = await runSequence(configPath, options);

  // Auto-save log if requested
  if (options.saveLog) {
    const logPath = saveLog(result.executionLog, configPath, options.logPath);
    result.logPath = logPath;
  }

  return result;
}

/**
 * Run a config object (not from file)
 * @param {Object} config - Config object
 * @param {Object} options - Execution options
 * @returns {Promise<Object>} Execution result
 */
async function runConfig(config, options = {}) {
  // TODO: Implement config object execution
  throw new Error('runConfig not yet implemented');
}

module.exports = {
  run,
  runConfig,
  runSequence,
  promptSaveLog,
  saveLog
};
