/**
 * Utility functions for FlowSphere
 * Provides UUID generation, timestamp, file handling, and color output
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Generate a UUID v4
 * @returns {string} UUID in format xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
function generateUUID() {
  return crypto.randomUUID();
}

/**
 * Get current Unix timestamp in seconds
 * @returns {number} Unix timestamp
 */
function getTimestamp() {
  return Math.floor(Date.now() / 1000);
}

/**
 * Read JSON file and parse it
 * @param {string} filePath - Path to JSON file
 * @returns {object} Parsed JSON object
 * @throws {Error} If file doesn't exist or JSON is invalid
 */
function readJSONFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf8');

  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Invalid JSON in file ${filePath}: ${error.message}`);
  }
}

/**
 * Write JSON to file with formatting
 * @param {string} filePath - Path to write file
 * @param {object} data - Data to write as JSON
 */
function writeJSONFile(filePath, data) {
  const dirPath = path.dirname(filePath);

  // Create directory if it doesn't exist
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * ANSI color codes for terminal output
 */
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

/**
 * Format text with color for terminal output
 * @param {string} text - Text to colorize
 * @param {string} color - Color name (green, red, yellow, blue, cyan, gray)
 * @returns {string} Colorized text
 */
function colorize(text, color) {
  const colorCode = colors[color] || colors.reset;
  return `${colorCode}${text}${colors.reset}`;
}

/**
 * Extract value from nested object using JSONPath-like syntax
 * @param {object} obj - Object to extract from
 * @param {string} path - Path like ".field.subfield" or ".array[0].field" or ". | length"
 * @returns {*} Extracted value or null if not found
 */
function extractValue(obj, path) {
  if (!path || !path.startsWith('.')) {
    return null;
  }

  // Handle jq-style expressions like ". | length"
  if (path.includes(' | ')) {
    const [jsonPath, operation] = path.split(' | ').map(s => s.trim());

    // Extract the base value first
    let value;
    if (jsonPath === '.') {
      value = obj;
    } else {
      value = extractValue(obj, jsonPath);
    }

    // Apply operation
    if (operation === 'length') {
      if (Array.isArray(value)) {
        return value.length;
      } else if (typeof value === 'string') {
        return value.length;
      } else if (value && typeof value === 'object') {
        return Object.keys(value).length;
      }
      return null;
    }

    return value;
  }

  // Handle simple "." path (return entire object)
  if (path === '.') {
    return obj;
  }

  // Remove leading dot
  const cleanPath = path.substring(1);

  // Handle empty path after dot
  if (!cleanPath) {
    return obj;
  }

  // Split by dots, but handle array indices
  const parts = cleanPath.split('.');
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return null;
    }

    // Handle array indices like "[0]" or "array[0]"
    const arrayMatch = part.match(/^(.+)?\[(\d+)\]$/);
    if (arrayMatch) {
      const [, arrayName, index] = arrayMatch;

      // If arrayName exists, navigate to it first (e.g., "array[0]")
      if (arrayName) {
        current = current[arrayName];
        if (!Array.isArray(current)) {
          return null;
        }
      }

      // Navigate to array index (e.g., "[0]" at root level)
      if (!Array.isArray(current)) {
        return null;
      }
      current = current[parseInt(index)];
    } else {
      current = current[part];
    }
  }

  return current;
}

/**
 * Merge two objects deeply (for defaults merging)
 * @param {object} target - Target object
 * @param {object} source - Source object (takes precedence)
 * @returns {object} Merged object
 */
function deepMerge(target, source) {
  const result = { ...target };

  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }

  return result;
}

/**
 * Format duration in seconds to human-readable format
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration (e.g., "1.234s")
 */
function formatDuration(seconds) {
  return `${seconds.toFixed(3)}s`;
}

/**
 * Get current date-time string for log filenames
 * @returns {string} Formatted as YYYYMMDD_HHMMSS
 */
function getLogTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

module.exports = {
  generateUUID,
  getTimestamp,
  readJSONFile,
  writeJSONFile,
  colorize,
  colors,
  extractValue,
  deepMerge,
  formatDuration,
  getLogTimestamp
};
