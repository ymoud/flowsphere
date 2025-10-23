#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read files
const collectionPath = path.join(__dirname, '..', 'Postman', 'Onboarding Chatbot 2025.postman_collection.json');
const environmentPath = path.join(__dirname, '..', 'Postman', 'OnboardingApi.postman_environment.json');

console.log('Reading Postman collection...');
const collection = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));
const environment = JSON.parse(fs.readFileSync(environmentPath, 'utf8'));

// Create environment variable map
const envVars = {};
environment.values.forEach(v => {
    if (v.enabled) {
        envVars[v.key] = v.value;
    }
});

console.log(`Loaded ${Object.keys(envVars).length} environment variables`);

// Helper function to extract numeric prefix
function getNumericPrefix(name) {
    const match = name.match(/^(\d+)\.\s*/);
    return match ? parseInt(match[1]) : 999999;
}

// Helper function to remove numeric prefix
function removeNumericPrefix(name) {
    return name.replace(/^\d+\.\s*/, '');
}

// Helper function to generate camelCase ID from name
function generateId(name) {
    // Remove numeric prefix first
    let cleaned = removeNumericPrefix(name);

    // Remove special characters and split into words
    const words = cleaned
        .replace(/[^a-zA-Z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 0);

    // Convert to camelCase
    if (words.length === 0) return 'step';

    return words[0].toLowerCase() +
           words.slice(1).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
}

// Helper function to replace environment variables
function replaceEnvVars(str) {
    if (typeof str !== 'string') return str;

    // Replace environment variables
    let result = str.replace(/\{\{([^}$]+)\}\}/g, (match, varName) => {
        const trimmed = varName.trim();
        return envVars[trimmed] !== undefined ? envVars[trimmed] : match;
    });

    // Handle Postman dynamic variables
    result = result.replace(/\{\{\$guid\}\}/g, 'GENERATED_GUID');
    result = result.replace(/\{\{\$timestamp\}\}/g, 'TIMESTAMP');
    result = result.replace(/\{\{\$randomInt\}\}/g, '12345');

    return result;
}

// Recursively collect all requests from folders
function collectRequests(items, folderPath = '', orderPath = []) {
    const requests = [];

    items.forEach(item => {
        if (item.item) {
            const folderName = item.name;
            const folderPrefix = getNumericPrefix(folderName);
            const cleanFolderName = removeNumericPrefix(folderName);

            // Build the order path by appending this folder's prefix
            const newOrderPath = [...orderPath, folderPrefix];

            const subRequests = collectRequests(
                item.item,
                folderPath ? `${folderPath} > ${cleanFolderName}` : cleanFolderName,
                newOrderPath
            );
            requests.push(...subRequests);
        } else if (item.request) {
            const requestName = item.name;
            const requestPrefix = getNumericPrefix(requestName);
            const cleanRequestName = removeNumericPrefix(requestName);

            requests.push({
                orderPath,           // Full hierarchy path
                requestOrder: requestPrefix,
                folderPath,
                name: cleanRequestName,
                request: item.request,
                response: item.response || []
            });
        }
    });

    return requests;
}

// Collect all requests
console.log('Collecting and ordering requests...');
const allRequests = collectRequests(collection.item);

// Sort by comparing the full order path hierarchy, then request order
allRequests.sort((a, b) => {
    // Compare orderPath arrays element by element
    const maxLen = Math.max(a.orderPath.length, b.orderPath.length);
    for (let i = 0; i < maxLen; i++) {
        const aVal = a.orderPath[i] || 0;
        const bVal = b.orderPath[i] || 0;
        if (aVal !== bVal) {
            return aVal - bVal;
        }
    }
    // If orderPaths are equal, compare request order
    return a.requestOrder - b.requestOrder;
});

console.log(`Found ${allRequests.length} requests`);

// Generate unique IDs for all steps
const stepIds = [];
const usedIds = new Set();

allRequests.forEach((req, index) => {
    let id = generateId(req.name);
    let counter = 1;

    // Ensure uniqueness
    while (usedIds.has(id)) {
        id = generateId(req.name) + counter;
        counter++;
    }

    usedIds.add(id);
    stepIds[index] = id;
});

// First pass: extract expected response fields
const responseFields = [];

allRequests.forEach((req, index) => {
    const fields = [];

    if (req.response && req.response.length > 0) {
        const exampleResponse = req.response[0];

        if (exampleResponse.body) {
            try {
                const responseBody = JSON.parse(exampleResponse.body);

                const extractFields = (obj, prefix = '') => {
                    for (const [key, value] of Object.entries(obj)) {
                        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                            const fieldPath = prefix ? `${prefix}.${key}` : key;
                            fields.push(fieldPath);
                        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                            const fieldPath = prefix ? `${prefix}.${key}` : key;
                            extractFields(value, fieldPath);
                        }
                    }
                };

                extractFields(responseBody);
            } catch (e) {
                // Not JSON or couldn't parse
            }
        }
    }

    responseFields[index] = fields;
});

// Analyze patterns for defaults
console.log('Analyzing patterns for defaults...');

const headerUsage = {};
const headerValues = {};

allRequests.forEach(req => {
    const headers = req.request.header || [];
    headers.forEach(h => {
        if (!h.disabled) {
            const key = h.key;
            const value = replaceEnvVars(h.value);

            if (!headerUsage[key]) headerUsage[key] = [];
            if (!headerValues[key]) headerValues[key] = {};

            headerUsage[key].push(value);
            headerValues[key][value] = (headerValues[key][value] || 0) + 1;
        }
    });
});

// Extract common baseUrl
let baseUrl = '';
const firstUrl = allRequests[0]?.request?.url;
if (firstUrl) {
    const urlStr = typeof firstUrl === 'string' ? firstUrl : firstUrl.raw;
    const urlParts = replaceEnvVars(urlStr).split('/');
    baseUrl = urlParts.slice(0, 5).join('/'); // https://domain/path1/path2
}

// Build defaults object
const defaults = {
    baseUrl,
    timeout: 10,
    headers: {},
    validations: [
        { status: 200 }
    ]
};

// Add headers that appear in >30% of requests with consistent values
Object.entries(headerUsage).forEach(([headerKey, usages]) => {
    const totalRequests = allRequests.length;
    const mostCommonValue = Object.entries(headerValues[headerKey])
        .sort((a, b) => b[1] - a[1])[0];

    if (mostCommonValue && mostCommonValue[1] > totalRequests * 0.3) {
        defaults.headers[headerKey] = mostCommonValue[0];
    }
});

console.log(`Extracted defaults: baseUrl, ${Object.keys(defaults.headers).length} headers, default validations`);

// Convert requests to config steps with defaults extraction
const steps = [];
const dependencies = [];

allRequests.forEach((req, index) => {
    const request = req.request;

    const step = {
        id: stepIds[index],
        name: req.name
    };

    // Method
    step.method = request.method;

    // URL - make relative to baseUrl
    let url = '';
    if (typeof request.url === 'string') {
        url = request.url;
    } else if (request.url && request.url.raw) {
        url = request.url.raw;
    }
    url = replaceEnvVars(url);

    // Make URL relative if it starts with baseUrl
    if (url.startsWith(baseUrl)) {
        url = url.substring(baseUrl.length);
    }

    step.url = url;

    // Headers - only include if different from defaults
    if (request.header && request.header.length > 0) {
        const stepHeaders = {};
        let hasNonDefaultHeaders = false;

        request.header.forEach(h => {
            if (!h.disabled) {
                const key = h.key;
                let value = replaceEnvVars(h.value);

                // Check if this header value might come from a previous response
                if (key.toLowerCase() === 'authorization' && index > 0) {
                    for (let i = index - 1; i >= 0; i--) {
                        const prevFields = responseFields[i];
                        const tokenField = prevFields.find(f =>
                            f.toLowerCase().includes('accesstoken') ||
                            f.toLowerCase().includes('token') ||
                            f === 'access_token'
                        );

                        if (tokenField) {
                            value = `Bearer {{ .responses.${stepIds[i]}.${tokenField} }}`;
                            dependencies.push({
                                stepIndex: index,
                                stepId: stepIds[index],
                                stepName: req.name,
                                usesField: tokenField,
                                fromStep: i,
                                fromStepId: stepIds[i],
                                fromStepName: allRequests[i].name
                            });
                            break;
                        }
                    }
                }

                // Only add header if it's different from default or not in defaults
                if (defaults.headers[key] !== value) {
                    stepHeaders[key] = value;
                    hasNonDefaultHeaders = true;
                }
            }
        });

        if (hasNonDefaultHeaders) {
            step.headers = stepHeaders;
        }
    }

    // Body - with dependency detection
    if (request.body) {
        if (request.body.mode === 'raw') {
            try {
                const bodyStr = replaceEnvVars(request.body.raw);
                let bodyObj = JSON.parse(bodyStr);

                const replaceFieldsWithDependencies = (obj) => {
                    for (const [key, value] of Object.entries(obj)) {
                        if (typeof value === 'string') {
                            for (let i = index - 1; i >= 0; i--) {
                                const prevFields = responseFields[i];

                                const matchingField = prevFields.find(f => {
                                    const fieldName = f.split('.').pop();
                                    return fieldName === key || fieldName.toLowerCase() === key.toLowerCase();
                                });

                                if (matchingField) {
                                    if (value === '' || value === 'null' || value.length < 5) {
                                        obj[key] = `{{ .responses.${stepIds[i]}.${matchingField}}}`;
                                        dependencies.push({
                                            stepIndex: index,
                                            stepId: stepIds[index],
                                            stepName: req.name,
                                            usesField: matchingField,
                                            fromStep: i,
                                            fromStepId: stepIds[i],
                                            fromStepName: allRequests[i].name,
                                            inBody: true
                                        });
                                        break;
                                    }
                                }
                            }
                        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                            replaceFieldsWithDependencies(value);
                        }
                    }
                };

                replaceFieldsWithDependencies(bodyObj);
                step.body = bodyObj;
            } catch (e) {
                step.body = replaceEnvVars(request.body.raw);
            }
        } else if (request.body.mode === 'formdata') {
            step.body = {};
            request.body.formdata.forEach(f => {
                if (!f.disabled) {
                    step.body[f.key] = replaceEnvVars(f.value);
                }
            });
        } else if (request.body.mode === 'urlencoded') {
            step.body = {};
            request.body.urlencoded.forEach(u => {
                if (!u.disabled) {
                    step.body[u.key] = replaceEnvVars(u.value);
                }
            });
        }
    }

    // Validations - only include if different from defaults
    const stepValidations = [];
    let hasNonDefaultValidations = false;

    if (req.response && req.response.length > 0) {
        const exampleResponse = req.response[0];

        // Check status code - only add if different from default (200)
        if (exampleResponse.code && exampleResponse.code !== 200) {
            stepValidations.push({ status: exampleResponse.code });
            hasNonDefaultValidations = true;
        }

        // Try to find a meaningful field to validate
        if (exampleResponse.body) {
            try {
                const responseBody = JSON.parse(exampleResponse.body);

                const priorityFields = [
                    'sessionId', 'verificationId', 'accessToken', 'token', 'access_token',
                    'deviceRegistrationId', 'declarationId', 'notificationId',
                    'id', 'userId', 'success', 'data'
                ];

                for (const field of priorityFields) {
                    if (responseBody[field] !== undefined) {
                        stepValidations.push({
                            jsonpath: `.${field}`,
                            exists: true
                        });
                        hasNonDefaultValidations = true;
                        break;
                    }
                    if (responseBody.payload && responseBody.payload[field] !== undefined) {
                        stepValidations.push({
                            jsonpath: `.payload.${field}`,
                            exists: true
                        });
                        hasNonDefaultValidations = true;
                        break;
                    }
                }
            } catch (e) {
                // Not JSON or couldn't parse
            }
        }
    }

    if (hasNonDefaultValidations) {
        step.validations = stepValidations;
    }

    steps.push(step);
});

// Calculate size reduction
const fullConfig = { steps: allRequests.map((req, i) => {
    // Deep copy to avoid modifying original steps
    const step = JSON.parse(JSON.stringify(steps[i]));
    if (!step.headers) step.headers = {};
    Object.assign(step.headers, defaults.headers);
    if (!step.validations) step.validations = [];
    step.validations = [...defaults.validations, ...step.validations];
    return step;
})};

const minifiedConfig = {
    enableDebug: false,
    defaults,
    steps
};

const fullSize = JSON.stringify(fullConfig).length;
const minifiedSize = JSON.stringify(minifiedConfig).length;
const reduction = ((1 - minifiedSize / fullSize) * 100).toFixed(1);

// Output summary
console.log('\n=== SUMMARY ===');
console.log(`Total steps: ${steps.length}`);
console.log(`Environment variables substituted: ${Object.keys(envVars).length}`);
console.log(`Dependencies detected: ${dependencies.length}`);
console.log(`\nSize reduction: ${reduction}% (${fullSize} → ${minifiedSize} bytes)`);

if (dependencies.length > 0) {
    console.log(`\nSample dependencies (showing first 10):`);
    dependencies.slice(0, 10).forEach((dep, i) => {
        console.log(`  ${i + 1}. Step '${dep.stepId}' uses '${dep.usesField}' from step '${dep.fromStepId}'`);
    });
    if (dependencies.length > 10) {
        console.log(`  ... and ${dependencies.length - 10} more`);
    }
}

// Output config
const outputPath = path.join(__dirname, '..', 'config-onboarding.json');
fs.writeFileSync(outputPath, JSON.stringify(minifiedConfig, null, 2));

console.log(`\nConfig file written to: ${outputPath}`);
console.log(`\nDefaults extracted:`);
console.log(`  - baseUrl: ${defaults.baseUrl}`);
console.log(`  - timeout: ${defaults.timeout}`);
console.log(`  - headers: ${JSON.stringify(defaults.headers, null, 4)}`);
console.log(`  - validations: ${JSON.stringify(defaults.validations, null, 4)}`);

console.log(`\nFirst 5 steps (minified):`);
steps.slice(0, 5).forEach((step, i) => {
    const hasHeaders = step.headers && Object.keys(step.headers).length > 0;
    const hasValidations = step.validations && step.validations.length > 0;
    const headerInfo = hasHeaders ? ` +${Object.keys(step.headers).length} custom headers` : '';
    const validationInfo = hasValidations ? ` +${step.validations.length} custom validations` : '';
    console.log(`  ${i + 1}. [${step.id}] ${step.method} ${step.name}${headerInfo}${validationInfo}`);
});
