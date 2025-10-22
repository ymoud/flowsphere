#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read files
const collectionPath = path.join(__dirname, 'Postman', 'Onboarding Chatbot 2025.postman_collection.json');
const environmentPath = path.join(__dirname, 'Postman', 'OnboardingApi.postman_environment.json');

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
function collectRequests(items, folderPath = '', folderOrder = 0) {
    const requests = [];

    items.forEach(item => {
        if (item.item) {
            // It's a folder
            const folderName = item.name;
            const folderPrefix = getNumericPrefix(folderName);
            const cleanFolderName = removeNumericPrefix(folderName);

            const subRequests = collectRequests(
                item.item,
                folderPath ? `${folderPath} > ${cleanFolderName}` : cleanFolderName,
                folderPrefix
            );
            requests.push(...subRequests);
        } else if (item.request) {
            // It's a request
            const requestName = item.name;
            const requestPrefix = getNumericPrefix(requestName);
            const cleanRequestName = removeNumericPrefix(requestName);

            requests.push({
                folderOrder,
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

// Sort by folder order, then request order
allRequests.sort((a, b) => {
    if (a.folderOrder !== b.folderOrder) {
        return a.folderOrder - b.folderOrder;
    }
    return a.requestOrder - b.requestOrder;
});

console.log(`Found ${allRequests.length} requests`);

// First pass: extract expected response fields
const responseFields = [];

allRequests.forEach((req, index) => {
    const fields = [];

    if (req.response && req.response.length > 0) {
        const exampleResponse = req.response[0];

        if (exampleResponse.body) {
            try {
                const responseBody = JSON.parse(exampleResponse.body);

                // Extract top-level fields that look useful
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

// Convert requests to config steps
const steps = [];
const dependencies = [];

allRequests.forEach((req, index) => {
    const request = req.request;

    // Build step object
    const step = {
        name: req.name
    };

    // Method
    step.method = request.method;

    // URL
    let url = '';
    if (typeof request.url === 'string') {
        url = request.url;
    } else if (request.url && request.url.raw) {
        url = request.url.raw;
    }
    url = replaceEnvVars(url);
    step.url = url;

    // Headers
    if (request.header && request.header.length > 0) {
        step.headers = {};
        request.header.forEach(h => {
            if (!h.disabled) {
                const key = h.key;
                let value = replaceEnvVars(h.value);

                // Check if this header value might come from a previous response
                if (key.toLowerCase() === 'authorization' && index > 0) {
                    // Look for accessToken or token in previous responses
                    for (let i = index - 1; i >= 0; i--) {
                        const prevFields = responseFields[i];
                        const tokenField = prevFields.find(f =>
                            f.toLowerCase().includes('accesstoken') ||
                            f.toLowerCase().includes('token') ||
                            f === 'access_token'
                        );

                        if (tokenField) {
                            value = `Bearer {{ .responses[${i}].${tokenField} }}`;
                            dependencies.push({
                                stepIndex: index,
                                stepName: req.name,
                                usesField: tokenField,
                                fromStep: i,
                                fromStepName: allRequests[i].name
                            });
                            break;
                        }
                    }
                }

                step.headers[key] = value;
            }
        });
    }

    // Body - with dependency detection
    if (request.body) {
        if (request.body.mode === 'raw') {
            try {
                const bodyStr = replaceEnvVars(request.body.raw);
                let bodyObj = JSON.parse(bodyStr);

                // Recursively check for fields that might come from previous responses
                const replaceFieldsWithDependencies = (obj) => {
                    for (const [key, value] of Object.entries(obj)) {
                        if (typeof value === 'string') {
                            // Check if this field name matches any previous response field
                            for (let i = index - 1; i >= 0; i--) {
                                const prevFields = responseFields[i];

                                // Look for exact match or similar field names
                                const matchingField = prevFields.find(f => {
                                    const fieldName = f.split('.').pop();
                                    return fieldName === key || fieldName.toLowerCase() === key.toLowerCase();
                                });

                                if (matchingField) {
                                    // Check if value looks like a placeholder or is empty
                                    if (value === '' || value === 'null' || value.length < 5) {
                                        obj[key] = `{{ .responses[${i}].${matchingField} }}`;
                                        dependencies.push({
                                            stepIndex: index,
                                            stepName: req.name,
                                            usesField: matchingField,
                                            fromStep: i,
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
                // If not JSON, store as string
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

    // Expectations - look at example responses
    step.expect = {
        status: 200
    };

    if (req.response && req.response.length > 0) {
        const exampleResponse = req.response[0];
        if (exampleResponse.code) {
            step.expect.status = exampleResponse.code;
        }

        // Try to find a meaningful field to validate
        if (exampleResponse.body) {
            try {
                const responseBody = JSON.parse(exampleResponse.body);

                // Priority fields to check
                const priorityFields = [
                    'sessionId', 'verificationId', 'accessToken', 'token', 'access_token',
                    'deviceRegistrationId', 'declarationId', 'notificationId',
                    'id', 'userId', 'success', 'data'
                ];

                for (const field of priorityFields) {
                    if (responseBody[field] !== undefined) {
                        step.expect.jsonpath = `.${field}`;
                        break;
                    }
                    // Check nested in payload
                    if (responseBody.payload && responseBody.payload[field] !== undefined) {
                        step.expect.jsonpath = `.payload.${field}`;
                        break;
                    }
                }
            } catch (e) {
                // Not JSON or couldn't parse
            }
        }
    }

    steps.push(step);
});

// Output summary
console.log('\n=== SUMMARY ===');
console.log(`Total steps: ${steps.length}`);
console.log(`Environment variables substituted: ${Object.keys(envVars).length}`);
console.log(`Dependencies detected: ${dependencies.length}`);

if (dependencies.length > 0) {
    console.log('\nDependencies:');
    dependencies.forEach((dep, i) => {
        console.log(`  ${i + 1}. Step ${dep.stepIndex + 1} (${dep.stepName}) uses '${dep.usesField}' from Step ${dep.fromStep + 1} (${dep.fromStepName})`);
    });
}

// Output config
const config = { steps };
const outputPath = path.join(__dirname, 'config-onboarding.json');
fs.writeFileSync(outputPath, JSON.stringify(config, null, 2));

console.log(`\nConfig file written to: ${outputPath}`);
console.log(`\nFirst 5 steps:`);
steps.slice(0, 5).forEach((step, i) => {
    const depInfo = dependencies.filter(d => d.stepIndex === i);
    const depStr = depInfo.length > 0 ? ` (uses data from previous steps)` : '';
    console.log(`  ${i + 1}. ${step.method} ${step.name}${depStr}`);
});
