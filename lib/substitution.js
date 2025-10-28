/**
 * Variable substitution engine for FlowSphere
 * Handles dynamic variables, global variables, response references, and user input
 */

const { generateUUID, getTimestamp, extractValue } = require('./utils');

/**
 * Substitution context containing all variable sources
 * @typedef {Object} SubstitutionContext
 * @property {Object} vars - Global variables from config
 * @property {Array<Object>} responses - Array of previous responses
 * @property {Object} input - User input for current step
 * @property {boolean} enableDebug - Debug mode flag
 */

/**
 * Replace dynamic placeholders ({{ $guid }}, {{ $timestamp }})
 * Each {{ $guid }} gets a unique UUID
 * All {{ $timestamp }} in the same call get the same timestamp
 *
 * @param {string} input - Input string with placeholders
 * @param {boolean} enableDebug - Debug mode
 * @returns {string} String with dynamic placeholders replaced
 */
function replaceDynamicPlaceholders(input, enableDebug = false) {
  if (typeof input !== 'string') {
    return input;
  }

  let output = input;
  const timestamp = getTimestamp();

  // Replace all {{ $guid }} with unique UUIDs
  const guidRegex = /{{\s*\$guid\s*}}/g;
  output = output.replace(guidRegex, () => {
    const uuid = generateUUID();
    if (enableDebug) {
      console.error(`DEBUG: Replacing {{ $guid }} with ${uuid}`);
    }
    return uuid;
  });

  // Replace all {{ $timestamp }} with the same timestamp
  const timestampRegex = /{{\s*\$timestamp\s*}}/g;
  if (timestampRegex.test(output)) {
    if (enableDebug) {
      console.error(`DEBUG: Replacing {{ $timestamp }} with ${timestamp}`);
    }
    output = output.replace(timestampRegex, timestamp);
  }

  return output;
}

/**
 * Substitute all variables in a string
 * Order: Dynamic Variables → Global Variables → User Input → Response References
 *
 * @param {string} input - Input string with variable placeholders
 * @param {SubstitutionContext} context - Substitution context
 * @param {Array} substitutions - Optional array to collect substitution records
 * @returns {string} String with all variables substituted
 */
function substituteVariables(input, context, substitutions = null) {
  if (typeof input !== 'string') {
    return input;
  }

  const { vars = {}, responses = [], input: userInput = {}, enableDebug = false } = context;

  let output = input;

  // Step 1: Replace dynamic placeholders first
  const guidRegex = /{{\s*\$guid\s*}}/g;
  output = output.replace(guidRegex, (match) => {
    const uuid = generateUUID();
    if (substitutions) {
      substitutions.push({ original: match, value: uuid, type: 'dynamic-guid' });
    }
    if (enableDebug) {
      console.error(`DEBUG: Replacing {{ $guid }} with ${uuid}`);
    }
    return uuid;
  });

  const timestamp = getTimestamp();
  const timestampRegex = /{{\s*\$timestamp\s*}}/g;
  output = output.replace(timestampRegex, (match) => {
    if (substitutions) {
      substitutions.push({ original: match, value: timestamp, type: 'dynamic-timestamp' });
    }
    if (enableDebug) {
      console.error(`DEBUG: Replacing {{ $timestamp }} with ${timestamp}`);
    }
    return timestamp;
  });

  // Step 2: Replace global variables {{ .vars.key }}
  const varsRegex = /{{\s*\.vars\.(\w+)\s*}}/g;
  output = output.replace(varsRegex, (match, varName) => {
    const value = vars[varName];
    if (value === undefined) {
      if (enableDebug) {
        console.error(`DEBUG: Variable .vars.${varName} not found`);
      }
      return match; // Keep original if not found
    }
    if (substitutions) {
      substitutions.push({ original: match, value: value, type: 'variable' });
    }
    if (enableDebug) {
      console.error(`DEBUG: Replacing {{ .vars.${varName} }} with ${value}`);
    }
    return value;
  });

  // Step 3: Replace user input {{ .input.key }}
  const inputRegex = /{{\s*\.input\.(\w+)\s*}}/g;
  output = output.replace(inputRegex, (match, inputName) => {
    const value = userInput[inputName];
    if (value === undefined) {
      if (enableDebug) {
        console.error(`DEBUG: Input .input.${inputName} not found`);
      }
      return match; // Keep original if not found
    }
    if (substitutions) {
      substitutions.push({ original: match, value: value, type: 'input' });
    }
    if (enableDebug) {
      console.error(`DEBUG: Replacing {{ .input.${inputName} }} with ${value}`);
    }
    return value;
  });

  // Step 4: Replace response references {{ .responses.nodeId.field }}
  const responseRegex = /{{\s*\.responses\.([a-zA-Z0-9_-]+)((?:\.[a-zA-Z0-9_\[\]-]+)*)\s*}}/g;
  output = output.replace(responseRegex, (match, nodeId, fieldPath) => {
    // Find response by node ID
    const response = responses.find(r => r.id === nodeId);

    if (!response) {
      throw new Error(`Could not find response for node: ${nodeId}`);
    }

    if (!response.body) {
      throw new Error(`Node ${nodeId} has no response body`);
    }

    // Extract value using the field path
    const value = extractValue(response.body, fieldPath);

    if (value === null || value === undefined) {
      throw new Error(`Could not extract value from .responses.${nodeId}${fieldPath}`);
    }

    if (substitutions) {
      substitutions.push({ original: match, value: value, type: 'response' });
    }
    if (enableDebug) {
      console.error(`DEBUG: Replacing {{ .responses.${nodeId}${fieldPath} }} with ${value}`);
    }

    return value;
  });

  return output;
}

/**
 * Substitute variables in an entire object recursively
 * Handles strings, objects, and arrays
 *
 * @param {*} obj - Object to substitute variables in
 * @param {SubstitutionContext} context - Substitution context
 * @param {Array} substitutions - Optional array to collect substitution records
 * @returns {*} Object with all variables substituted
 */
function substituteInObject(obj, context, substitutions = null) {
  if (typeof obj === 'string') {
    return substituteVariables(obj, context, substitutions);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => substituteInObject(item, context, substitutions));
  }

  if (obj && typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = substituteInObject(value, context, substitutions);
    }
    return result;
  }

  return obj;
}

/**
 * Substitute variables and return both result and substitution tracking
 *
 * @param {*} obj - Object to substitute variables in
 * @param {SubstitutionContext} context - Substitution context
 * @returns {{ result: *, substitutions: Array }} Result and substitution records
 */
function substituteWithTracking(obj, context) {
  const substitutions = [];
  const result = substituteInObject(obj, context, substitutions);
  return { result, substitutions };
}

module.exports = {
  replaceDynamicPlaceholders,
  substituteVariables,
  substituteInObject,
  substituteWithTracking
};
