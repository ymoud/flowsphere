/**
 * HTTP client for FlowSphere
 * Handles HTTP requests with timeout support
 */

const axios = require('axios');

/**
 * Execute HTTP request
 *
 * @param {Object} options - Request options
 * @param {string} options.method - HTTP method (GET, POST, PUT, DELETE, PATCH)
 * @param {string} options.url - Full URL
 * @param {Object} options.headers - Request headers
 * @param {Object|string} options.body - Request body (will be JSON stringified if object)
 * @param {number} options.timeout - Timeout in seconds (default: 30)
 * @returns {Promise<{status: number, statusText: string, headers: Object, body: Object|string, duration: number}>}
 */
async function executeRequest(options) {
  const {
    method,
    url,
    headers = {},
    body = null,
    timeout = 30
  } = options;

  const startTime = Date.now();

  try {
    const axiosConfig = {
      method: method.toLowerCase(),
      url,
      headers,
      timeout: timeout * 1000, // Convert to milliseconds
      validateStatus: () => true // Don't throw on any status code
    };

    // Add body for methods that support it
    if (body && ['post', 'put', 'patch'].includes(method.toLowerCase())) {
      if (typeof body === 'string') {
        axiosConfig.data = body;
      } else {
        axiosConfig.data = body;
        // Ensure Content-Type is set for JSON
        if (!headers['Content-Type'] && !headers['content-type']) {
          axiosConfig.headers['Content-Type'] = 'application/json';
        }
      }
    }

    const response = await axios(axiosConfig);
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000; // Convert to seconds

    // Parse response body
    let responseBody = response.data;

    // If response is a string, try to parse as JSON
    if (typeof responseBody === 'string') {
      try {
        responseBody = JSON.parse(responseBody);
      } catch (e) {
        // Keep as string if not valid JSON
      }
    }

    return {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      body: responseBody,
      duration
    };

  } catch (error) {
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    // Handle timeout errors
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      throw new Error(`Request timeout after ${timeout}s`);
    }

    // Handle network errors
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      throw new Error(`Network error: ${error.message}`);
    }

    // Re-throw with duration info
    error.duration = duration;
    throw error;
  }
}

module.exports = {
  executeRequest
};
