#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length === 0) {
    console.error('Usage: node parse-postman.js <collection.json> [environment.json] [output.json]');
    console.error('Example: node parse-postman.js collection.json env.json output.json');
    process.exit(1);
}

const collectionPath = path.resolve(args[0]);
const environmentPath = args[1] ? path.resolve(args[1]) : null;
const outputPath = args[2] ? path.resolve(args[2]) : path.join(process.cwd(), 'flowsphere-config.json');

// Validate collection file exists
if (!fs.existsSync(collectionPath)) {
    console.error(`Error: Collection file not found: ${collectionPath}`);
    process.exit(1);
}

console.log('Reading Postman collection...');
const collection = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));

// Load environment variables if provided
const envVars = {};
if (environmentPath) {
    if (!fs.existsSync(environmentPath)) {
        console.warn(`Warning: Environment file not found: ${environmentPath}`);
    } else {
        console.log('Reading environment file...');
        const environment = JSON.parse(fs.readFileSync(environmentPath, 'utf8'));
        environment.values.forEach(v => {
            if (v.enabled) {
                envVars[v.key] = v.value;
            }
        });
        console.log(`Loaded ${Object.keys(envVars).length} environment variables`);
    }
}

// Helper function to detect if collection uses numeric prefixes
function hasNumericPrefixes(items) {
    if (!items || items.length === 0) return false;

    const numericPattern = /^\d+\.\s/;
    const numberedItems = items.filter(item => numericPattern.test(item.name));

    // If >50% of items are numbered, treat as numbered collection
    return numberedItems.length > items.length * 0.5;
}

// Helper function to extract numeric prefix
function getNumericPrefix(name) {
    const match = name.match(/^(\d+)\.\s*/);
    return match ? parseInt(match[1]) : 999999;
}

// Helper function to remove numeric prefix
function removeNumericPrefix(name) {
    return name.replace(/^\d+\.\s*/, '');
}

// Helper function to generate kebab-case ID from name
function generateNodeId(name, existingIds = []) {
    // Remove numeric prefix first
    let cleaned = removeNumericPrefix(name);

    // Convert to lowercase, replace spaces/special chars with hyphens
    let id = cleaned
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, ''); // trim hyphens

    // Handle empty result
    if (id.length === 0) id = 'node';

    // Handle duplicates by appending number
    if (existingIds.includes(id)) {
        let counter = 2;
        while (existingIds.includes(`${id}-${counter}`)) {
            counter++;
        }
        id = `${id}-${counter}`;
    }

    return id;
}

// Helper function to replace environment variables
function replaceEnvVars(str) {
    if (typeof str !== 'string') return str;

    // Replace environment variables (but preserve Postman dynamic variables like {{$guid}})
    let result = str.replace(/\{\{([^}$]+)\}\}/g, (match, varName) => {
        const trimmed = varName.trim();
        return envVars[trimmed] !== undefined ? envVars[trimmed] : match;
    });

    // Handle Postman dynamic variables
    // Keep {{$guid}} and {{$timestamp}} as-is (compatible with FlowSphere syntax)
    // Replace other dynamic variables that don't have direct equivalents
    result = result.replace(/\{\{\$randomInt\}\}/g, '12345');

    return result;
}

// Helper function to build URL from Postman URL object
function buildUrlFromObject(urlObj) {
    // Prefer raw field if available
    if (urlObj.raw) {
        return replaceEnvVars(urlObj.raw);
    }

    // Build from components
    const host = Array.isArray(urlObj.host) ? urlObj.host.join('.') : (urlObj.host || '');
    const pathStr = Array.isArray(urlObj.path) ? '/' + urlObj.path.join('/') : (urlObj.path || '');

    // Handle query parameters (skip disabled)
    let queryString = '';
    if (urlObj.query && urlObj.query.length > 0) {
        const enabledParams = urlObj.query.filter(q => !q.disabled);
        if (enabledParams.length > 0) {
            queryString = '?' + enabledParams
                .map(q => {
                    const key = encodeURIComponent(q.key);
                    const value = encodeURIComponent(replaceEnvVars(q.value || ''));
                    return `${key}=${value}`;
                })
                .join('&');
        }
    }

    return replaceEnvVars(host + pathStr + queryString);
}

// Helper function to convert Postman auth to FlowSphere headers
function convertAuthToHeaders(authConfig) {
    if (!authConfig || authConfig.type === 'noauth') {
        return null;
    }

    const type = authConfig.type;

    if (type === 'basic') {
        const usernameItem = authConfig.basic?.find(i => i.key === 'username');
        const passwordItem = authConfig.basic?.find(i => i.key === 'password');

        const username = usernameItem ? replaceEnvVars(usernameItem.value) : '';
        const password = passwordItem ? replaceEnvVars(passwordItem.value) : '';

        // Encode credentials to base64
        const encoded = Buffer.from(`${username}:${password}`).toString('base64');
        return { 'Authorization': `Basic ${encoded}` };
    }

    if (type === 'bearer') {
        const tokenItem = authConfig.bearer?.find(i => i.key === 'token');
        const token = tokenItem ? replaceEnvVars(tokenItem.value) : '';
        return { 'Authorization': `Bearer ${token}` };
    }

    if (type === 'apikey') {
        const keyItem = authConfig.apikey?.find(i => i.key === 'key');
        const valueItem = authConfig.apikey?.find(i => i.key === 'value');
        const inItem = authConfig.apikey?.find(i => i.key === 'in');

        const headerKey = keyItem ? keyItem.value : 'X-API-Key';
        const headerValue = valueItem ? replaceEnvVars(valueItem.value) : '';
        const headerIn = inItem ? inItem.value : 'header';

        // Only support header-based API keys
        if (headerIn === 'header') {
            return { [headerKey]: headerValue };
        }
    }

    // Unsupported auth types
    console.warn(`Warning: Auth type "${type}" is not supported, skipping auth conversion`);
    return null;
}

// Helper function to extract validations from test scripts
function extractValidationsFromTests(events) {
    const validations = [];

    if (!events || events.length === 0) return validations;

    // Find test scripts
    const testScripts = events.filter(e => e.listen === 'test');
    if (testScripts.length === 0) return validations;

    // Concatenate all test script lines
    const scriptCode = testScripts
        .flatMap(e => e.script?.exec || [])
        .join('\n');

    // Extract status code assertions
    // Matches: pm.response.to.have.status(200)
    const statusMatches = scriptCode.match(/pm\.response\.to\.have\.status\((\d+)\)/g);
    if (statusMatches) {
        statusMatches.forEach(match => {
            const code = parseInt(match.match(/\d+/)[0]);
            validations.push({ httpStatusCode: code });
        });
    }

    // Extract field existence checks
    // Matches: pm.response.json().fieldName
    const fieldMatches = scriptCode.match(/pm\.response\.json\(\)\.(\w+)/g);
    if (fieldMatches) {
        const uniqueFields = [...new Set(fieldMatches)];
        uniqueFields.forEach(match => {
            const field = match.replace('pm.response.json().', '');
            validations.push({ jsonpath: `.${field}`, exists: true });
        });
    }

    return validations;
}

// Recursively collect all requests from folders
function collectRequests(items, folderPath = '', orderIndex = 0, isNumbered = false) {
    const requests = [];
    let currentIndex = orderIndex;

    items.forEach((item, idx) => {
        if (item.item) {
            // It's a folder
            const folderName = item.name;
            const cleanFolderName = removeNumericPrefix(folderName);
            const folderOrder = isNumbered ? getNumericPrefix(folderName) : currentIndex;

            const subRequests = collectRequests(
                item.item,
                folderPath ? `${folderPath} > ${cleanFolderName}` : cleanFolderName,
                currentIndex,
                isNumbered
            );

            requests.push(...subRequests);
            currentIndex += subRequests.length;
        } else if (item.request) {
            // It's a request
            const requestName = item.name;
            const cleanRequestName = removeNumericPrefix(requestName);
            const requestOrder = isNumbered ? getNumericPrefix(requestName) : currentIndex;

            requests.push({
                originalIndex: currentIndex,
                requestOrder: requestOrder,
                folderPath,
                name: cleanRequestName,
                request: item.request,
                response: item.response || [],
                event: item.event || []
            });
            currentIndex++;
        }
    });

    return requests;
}

// Collect all requests
console.log('Analyzing collection structure...');
const isNumbered = hasNumericPrefixes(collection.item);
console.log(`Collection type: ${isNumbered ? 'numbered' : 'order of appearance'}`);

const allRequests = collectRequests(collection.item, '', 0, isNumbered);

// Sort requests if numbered, otherwise keep order of appearance
if (isNumbered) {
    console.log('Sorting by numeric prefixes...');
    allRequests.sort((a, b) => a.requestOrder - b.requestOrder);
} else {
    console.log('Preserving order of appearance...');
    // Already in order, no sorting needed
}

console.log(`Found ${allRequests.length} requests`);

// Generate unique IDs for all steps
const stepIds = [];
const usedIds = [];

allRequests.forEach((req, index) => {
    const id = generateNodeId(req.name, usedIds);
    usedIds.push(id);
    stepIds[index] = id;
});

// Convert collection-level auth to headers
const collectionAuth = convertAuthToHeaders(collection.auth);

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
    const urlStr = typeof firstUrl === 'string' ? firstUrl : (firstUrl.raw || '');
    const resolvedUrl = replaceEnvVars(urlStr);
    const urlParts = resolvedUrl.split('/');

    // Extract protocol + domain + first 2 path segments
    if (urlParts.length >= 3) {
        baseUrl = urlParts.slice(0, Math.min(5, urlParts.length)).join('/');
    }
}

// Build defaults object
const defaults = {
    baseUrl,
    timeout: 10,
    headers: {},
    validations: [
        { httpStatusCode: 200 }
    ]
};

// Add collection-level auth headers to defaults
if (collectionAuth) {
    Object.assign(defaults.headers, collectionAuth);
    console.log(`Added collection-level auth: ${Object.keys(collectionAuth).join(', ')}`);
}

// Add headers that appear in >30% of requests with consistent values
Object.entries(headerUsage).forEach(([headerKey, usages]) => {
    const totalRequests = allRequests.length;
    const mostCommonValue = Object.entries(headerValues[headerKey])
        .sort((a, b) => b[1] - a[1])[0];

    if (mostCommonValue && mostCommonValue[1] > totalRequests * 0.3) {
        // Don't override auth headers from collection auth
        if (!defaults.headers[headerKey]) {
            defaults.headers[headerKey] = mostCommonValue[0];
        }
    }
});

console.log(`Extracted defaults: baseUrl, ${Object.keys(defaults.headers).length} headers, default validations`);

// Convert requests to config nodes
const nodes = [];
const dependencies = [];

allRequests.forEach((req, index) => {
    const request = req.request;

    const node = {
        id: stepIds[index],
        name: req.name
    };

    // Method
    node.method = request.method;

    // URL - handle both string and object formats
    let url = '';
    if (typeof request.url === 'string') {
        url = replaceEnvVars(request.url);
    } else if (request.url) {
        url = buildUrlFromObject(request.url);
    }

    // Make URL relative if it starts with baseUrl
    if (baseUrl && url.startsWith(baseUrl)) {
        url = url.substring(baseUrl.length);
    }

    node.url = url;

    // Headers - handle request-level auth override
    const requestAuth = convertAuthToHeaders(request.auth);
    const nodeHeaders = {};
    let hasCustomHeaders = false;

    // Add request-level auth headers (overrides collection auth)
    if (requestAuth) {
        Object.assign(nodeHeaders, requestAuth);
        hasCustomHeaders = true;
    }

    // Process regular headers
    if (request.header && request.header.length > 0) {
        request.header.forEach(h => {
            if (!h.disabled) {
                const key = h.key;
                let value = replaceEnvVars(h.value);

                // Check if this header value might come from a previous response
                if (key.toLowerCase() === 'authorization' && index > 0 && !requestAuth) {
                    for (let i = index - 1; i >= 0; i--) {
                        const prevFields = responseFields[i];
                        const tokenField = prevFields.find(f =>
                            f.toLowerCase().includes('accesstoken') ||
                            f.toLowerCase().includes('token') ||
                            f === 'access_token' ||
                            f === 'auth_token'
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
                    nodeHeaders[key] = value;
                    hasCustomHeaders = true;
                }
            }
        });
    }

    if (hasCustomHeaders) {
        node.headers = nodeHeaders;
    }

    // Body - handle all body modes
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
                                        obj[key] = `{{ .responses.${stepIds[i]}.${matchingField} }}`;
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
                node.body = bodyObj;
            } catch (e) {
                // Not JSON, keep as string
                node.body = replaceEnvVars(request.body.raw);
            }
        } else if (request.body.mode === 'formdata') {
            node.body = {};
            request.body.formdata.forEach(f => {
                if (!f.disabled) {
                    node.body[f.key] = replaceEnvVars(f.value || '');
                }
            });
        } else if (request.body.mode === 'urlencoded') {
            node.body = {};
            request.body.urlencoded.forEach(u => {
                if (!u.disabled) {
                    node.body[u.key] = replaceEnvVars(u.value || '');
                }
            });
        } else if (request.body.mode === 'file') {
            console.warn(`Warning: File body mode not supported for request "${req.name}"`);
        }
    }

    // Validations - extract from test scripts and example responses
    const nodeValidations = [];
    let hasCustomValidations = false;

    // Extract from test scripts
    const scriptValidations = extractValidationsFromTests(req.event);
    nodeValidations.push(...scriptValidations);

    // Extract from example responses if no test scripts
    if (scriptValidations.length === 0 && req.response && req.response.length > 0) {
        const exampleResponse = req.response[0];

        // Check status code - only add if different from default (200)
        if (exampleResponse.code && exampleResponse.code !== 200) {
            nodeValidations.push({ httpStatusCode: exampleResponse.code });
        }

        // Try to find a meaningful field to validate
        if (exampleResponse.body) {
            try {
                const responseBody = JSON.parse(exampleResponse.body);

                const priorityFields = [
                    'sessionId', 'verificationId', 'accessToken', 'token', 'access_token', 'auth_token',
                    'deviceRegistrationId', 'declarationId', 'notificationId',
                    'id', 'userId', 'success', 'data', 'username', 'password'
                ];

                for (const field of priorityFields) {
                    if (responseBody[field] !== undefined) {
                        nodeValidations.push({
                            jsonpath: `.${field}`,
                            exists: true
                        });
                        break;
                    }
                    if (responseBody.payload && responseBody.payload[field] !== undefined) {
                        nodeValidations.push({
                            jsonpath: `.payload.${field}`,
                            exists: true
                        });
                        break;
                    }
                }
            } catch (e) {
                // Not JSON or couldn't parse
            }
        }
    }

    if (nodeValidations.length > 0) {
        hasCustomValidations = true;
        node.validations = nodeValidations;
    }

    nodes.push(node);
});

// Build final config
const config = {
    enableDebug: false,
    defaults,
    nodes
};

// Output summary
console.log('\n=== IMPORT SUMMARY ===');
console.log(`Total nodes: ${nodes.length}`);
console.log(`Environment variables substituted: ${Object.keys(envVars).length}`);
console.log(`Dependencies detected: ${dependencies.length}`);
console.log(`Collection auth: ${collectionAuth ? 'Yes (' + Object.keys(collectionAuth).join(', ') + ')' : 'None'}`);

// Count nodes with custom features
const nodesWithAuth = nodes.filter(n => n.headers && Object.keys(n.headers).some(k => k.toLowerCase() === 'authorization')).length;
const nodesWithValidations = nodes.filter(n => n.validations).length;
const nodesWithBody = nodes.filter(n => n.body).length;

console.log(`Nodes with auth override: ${nodesWithAuth}`);
console.log(`Nodes with custom validations: ${nodesWithValidations}`);
console.log(`Nodes with body: ${nodesWithBody}`);

if (dependencies.length > 0) {
    console.log(`\nDetected dependencies (showing first 5):`);
    dependencies.slice(0, 5).forEach((dep, i) => {
        const location = dep.inBody ? 'body' : 'headers';
        console.log(`  ${i + 1}. ${dep.stepId} (${location}) uses "${dep.usesField}" from ${dep.fromStepId}`);
    });
    if (dependencies.length > 5) {
        console.log(`  ... and ${dependencies.length - 5} more`);
    }
}

// Write config file
fs.writeFileSync(outputPath, JSON.stringify(config, null, 2));

console.log(`\n✅ Config file written to: ${outputPath}`);
console.log(`\nDefaults extracted:`);
console.log(`  - baseUrl: ${defaults.baseUrl}`);
console.log(`  - timeout: ${defaults.timeout}s`);
console.log(`  - headers: ${Object.keys(defaults.headers).length} header(s)`);
if (Object.keys(defaults.headers).length > 0) {
    Object.entries(defaults.headers).forEach(([k, v]) => {
        const displayValue = v.length > 50 ? v.substring(0, 47) + '...' : v;
        console.log(`      ${k}: ${displayValue}`);
    });
}

console.log(`\nFirst 5 nodes:`);
nodes.slice(0, 5).forEach((node, i) => {
    const hasHeaders = node.headers && Object.keys(node.headers).length > 0;
    const hasValidations = node.validations && node.validations.length > 0;
    const hasBody = node.body !== undefined;

    const features = [];
    if (hasHeaders) features.push(`${Object.keys(node.headers).length} header(s)`);
    if (hasBody) features.push('body');
    if (hasValidations) features.push(`${node.validations.length} validation(s)`);

    const featuresStr = features.length > 0 ? ` [${features.join(', ')}]` : '';
    console.log(`  ${i + 1}. [${node.id}] ${node.method} ${node.name}${featuresStr}`);
});

if (nodes.length > 5) {
    console.log(`  ... and ${nodes.length - 5} more nodes`);
}

console.log('\n✨ Import complete!');
