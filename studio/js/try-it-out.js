/**
 * Try it Out Feature
 *
 * Plug-and-play feature for testing individual nodes in isolation.
 * Detects dependencies, allows mocking, executes node via API, and shows results.
 */

(function() {
    'use strict';

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    function escapeHtml(text) {
        if (typeof text !== 'string') return text;
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Format substitution path for display
     * Converts "headers.sandboxId" to "request header sandboxId"
     * Converts "body.payload.sandboxId" to "request body: payload.sandboxId"
     * @param {string} path - Path from substitution
     * @returns {string} Formatted location string
     */
    function formatSubstitutionPath(path) {
        if (!path) return '';

        // Split path into parts
        const parts = path.split('.');

        if (parts.length === 0) return '';

        const section = parts[0]; // e.g., 'headers', 'body', 'url'

        // Handle different sections
        if (section === 'headers') {
            const headerName = parts.slice(1).join('.');
            return `request header ${headerName}`;
        } else if (section === 'body') {
            const bodyPath = parts.slice(1).join('.');
            return bodyPath ? `request body: ${bodyPath}` : 'request body';
        } else if (section === 'url') {
            return 'request URL';
        } else if (section === 'method') {
            return 'request method';
        } else {
            // Generic fallback
            return path;
        }
    }

    /**
     * Extract schema from response body
     * Recursively analyzes the structure and captures field names and types
     * @param {any} value - The value to analyze
     * @param {number} maxDepth - Maximum depth to traverse (default: 10)
     * @param {number} currentDepth - Current depth (internal use)
     * @returns {object} Schema representation
     */
    function extractSchema(value, maxDepth = 10, currentDepth = 0) {
        // Prevent infinite recursion
        if (currentDepth >= maxDepth) {
            return { type: 'unknown', reason: 'max depth reached' };
        }

        // Handle null explicitly
        if (value === null) {
            return { type: 'null' };
        }

        // Handle undefined
        if (value === undefined) {
            return { type: 'undefined' };
        }

        // Get JavaScript type
        const jsType = typeof value;

        // Handle primitives
        if (jsType === 'string') {
            return { type: 'string' };
        }
        if (jsType === 'number') {
            return { type: 'number' };
        }
        if (jsType === 'boolean') {
            return { type: 'boolean' };
        }

        // Handle arrays
        if (Array.isArray(value)) {
            if (value.length === 0) {
                return { type: 'array', items: { type: 'unknown' } };
            }

            // Analyze first few items to determine array item type
            const samples = value.slice(0, 3); // Sample first 3 items
            const itemSchemas = samples.map(item => extractSchema(item, maxDepth, currentDepth + 1));

            // If all items have same type, use that
            const firstType = itemSchemas[0]?.type;
            const allSameType = itemSchemas.every(schema => schema.type === firstType);

            if (allSameType && firstType !== 'object') {
                return { type: 'array', items: itemSchemas[0] };
            } else if (allSameType && firstType === 'object') {
                // For object arrays, merge properties from samples
                const mergedProperties = {};
                itemSchemas.forEach(schema => {
                    if (schema.properties) {
                        Object.keys(schema.properties).forEach(key => {
                            if (!mergedProperties[key]) {
                                mergedProperties[key] = schema.properties[key];
                            }
                        });
                    }
                });
                return {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: mergedProperties
                    }
                };
            } else {
                return {
                    type: 'array',
                    items: { type: 'mixed' }
                };
            }
        }

        // Handle objects
        if (jsType === 'object') {
            const properties = {};
            for (const [key, val] of Object.entries(value)) {
                properties[key] = extractSchema(val, maxDepth, currentDepth + 1);
            }
            return {
                type: 'object',
                properties: properties
            };
        }

        // Fallback
        return { type: 'unknown' };
    }

    /**
     * Initialize the Try it Out feature
     */
    function initTryItOut() {
        console.log('[TryItOut] Feature initialized');

        // Make tryItOutNode function globally available
        window.tryItOutNode = tryItOutNode;
    }

    /**
     * Main entry point - called when "Try it Out" button is clicked
     * @param {number} nodeIndex - Index of the node to test
     */
    function tryItOutNode(nodeIndex) {
        const node = config.nodes[nodeIndex];
        if (!node) {
            alert('Node not found');
            return;
        }

        // Detect dependencies ({{ .responses.* }} references)
        const dependencies = detectDependencies(node);

        if (dependencies.length > 0) {
            // Show mocking modal to collect mock values
            showMockingModal(dependencies, (mockResponses) => {
                executeNode(node, mockResponses);
            });
        } else {
            // No dependencies - execute directly
            executeNode(node, {});
        }
    }

    /**
     * Detect response dependencies in a node
     * Scans for {{ .responses.nodeId.field }} patterns
     * @param {object} node - The node to scan
     * @returns {Array} Array of dependency objects
     */
    function detectDependencies(node) {
        const dependencies = [];
        const seen = new Set();

        // Serialize node to scan all string values
        const nodeStr = JSON.stringify(node);

        // Regex to match {{ .responses.nodeId.field }}
        const regex = /\{\{\s*\.responses\.(\w+)(\.([^\}]+))?\s*\}\}/g;

        let match;
        while ((match = regex.exec(nodeStr)) !== null) {
            const nodeId = match[1];
            const rawField = match[3] || '';
            const field = rawField.trim(); // Field path after nodeId, trimmed
            const placeholder = match[0]; // Full placeholder

            // Debug: show if trimming happened
            if (rawField !== field) {
                console.log('[TryItOut] Trimmed field:', JSON.stringify(rawField), '→', JSON.stringify(field));
            }

            // Use placeholder as key to avoid duplicates
            if (!seen.has(placeholder)) {
                seen.add(placeholder);

                // Find the referenced node
                const referencedNode = config.nodes.find(s => s.id === nodeId);
                const nodeName = referencedNode ? referencedNode.name : 'Unknown';

                dependencies.push({
                    nodeId,
                    nodeName,
                    field,
                    placeholder
                });
            }
        }

        return dependencies;
    }

    /**
     * Show modal to collect mock values for dependencies
     * @param {Array} dependencies - Array of dependency objects
     * @param {Function} onSubmit - Callback with mockResponses object
     */
    function showMockingModal(dependencies, onSubmit) {
        const modalId = 'tryItOutMockingModal';

        // Remove existing modal if present
        const existingModal = document.getElementById(modalId);
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal HTML
        const modalHtml = `
            <div class="modal fade" id="${modalId}" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi bi-sliders me-2"></i>Node Calibration Required
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <p>Some parameters need calibration before this node can execute.</p>
                            <p class="text-muted">Please supply the required values below.</p>
                            <div id="mockFieldsContainer">
                                ${dependencies.map((dep, index) => `
                                    <div class="form-group mb-3">
                                        <label class="form-label">
                                            <strong>{{ .responses.${dep.nodeId}${dep.field ? '.' + dep.field : ''} }}</strong>
                                            <small class="text-muted">(from: ${dep.nodeName})</small>
                                        </label>
                                        <input
                                            type="text"
                                            class="form-control mock-input"
                                            data-node-id="${dep.nodeId}"
                                            data-field="${dep.field}"
                                            placeholder="Enter mock value"
                                        />
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                <i class="bi bi-x-circle me-2"></i>Cancel Calibration
                            </button>
                            <button type="button" class="btn btn-primary" id="executeMockedNode">
                                <i class="bi bi-play-circle me-2"></i>Apply & Engage
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add modal to DOM
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Initialize Bootstrap modal
        const modalEl = document.getElementById(modalId);
        const modal = new bootstrap.Modal(modalEl);

        // Handle Run button
        document.getElementById('executeMockedNode').addEventListener('click', () => {
            const mockResponses = {};

            // Collect all mock values
            const inputs = modalEl.querySelectorAll('.mock-input');
            inputs.forEach(input => {
                const nodeId = input.dataset.nodeId;
                const field = input.dataset.field;
                const value = input.value.trim();

                if (value) {
                    // Initialize node object if not exists
                    if (!mockResponses[nodeId]) {
                        mockResponses[nodeId] = {};
                    }

                    // Set nested value using field path
                    if (field) {
                        setNestedValue(mockResponses[nodeId], field, value);
                    } else {
                        // No field path - just store the value directly
                        mockResponses[nodeId] = value;
                    }
                }
            });

            // Close modal
            modal.hide();

            // Execute callback
            onSubmit(mockResponses);
        });

        // Clean up modal on close
        modalEl.addEventListener('hidden.bs.modal', () => {
            modalEl.remove();
        });

        // Show modal
        modal.show();
    }

    /**
     * Set a nested value in an object using dot notation
     * @param {object} obj - Target object
     * @param {string} path - Dot-separated path
     * @param {any} value - Value to set
     */
    function setNestedValue(obj, path, value) {
        const keys = path.split('.').map(k => k.trim()); // Trim each key
        let current = obj;

        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!key) continue; // Skip empty keys
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }

        // Set final value (try to parse as JSON if possible)
        const finalKey = keys[keys.length - 1];
        if (!finalKey) return; // Skip if no final key
        try {
            // Try to parse as JSON (handles numbers, booleans, objects, arrays)
            current[finalKey] = JSON.parse(value);
        } catch {
            // If parsing fails, use as string
            current[finalKey] = value;
        }
    }

    /**
     * Execute a node via the API
     * @param {object} node - The node to execute
     * @param {object} mockResponses - Mock response values by node ID
     */
    async function executeNode(node, mockResponses) {
        // Show loading state
        const loadingToast = showToast('Node in Motion...', 'info', 0); // 0 = no auto-hide

        try {
            console.log('[TryItOut] Executing node with mockResponses:', mockResponses);

            const response = await fetch('/api/execute-node', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    node: node,
                    config: config,
                    mockResponses: mockResponses
                })
            });

            const result = await response.json();
            console.log('[TryItOut] API response:', result);

            // Hide loading toast
            if (loadingToast && loadingToast.hide) {
                loadingToast.hide();
            }

            // Show results modal
            showResultsModal(node, result);

        } catch (error) {
            // Hide loading toast
            if (loadingToast && loadingToast.hide) {
                loadingToast.hide();
            }

            showToast('Error: ' + error.message, 'error');
            console.error('[TryItOut] Execution error:', error);
        }
    }

    /**
     * Show results modal with execution details
     * @param {object} node - The executed node
     * @param {object} result - Execution result from API
     */
    function showResultsModal(node, result) {
        const modalId = 'tryItOutResultsModal';

        // Remove existing modal if present
        const existingModal = document.getElementById(modalId);
        if (existingModal) {
            existingModal.remove();
        }

        const statusIcon = result.success ? '✅' : '❌';
        const statusText = result.success ? 'Success' : 'Failed';
        const statusClass = result.success ? 'text-success' : 'text-danger';

        // Handle missing request object (error before execution)
        if (!result.request) {
            result.request = {
                method: node.method || 'GET',
                url: node.url || '',
                headers: node.headers || {},
                body: node.body || {}
            };
        }

        // Format validations (match Flow Runner styling)
        let validationsHtml = '';
        if (result.validations && Array.isArray(result.validations)) {
            const validationParts = result.validations.map(v => {
                const icon = v.passed ? '<span class="text-success">✓</span>' : '<span class="text-danger">✗</span>';

                if (v.type === 'httpStatusCode') {
                    const label = v.passed ? 'Validated' : 'Failed';
                    return `
                        <div class="ps-4 small">
                            ${icon} ${label} status = <span class="text-warning">${v.actual}</span>${v.passed ? '' : ` (expected ${v.expected})`}
                        </div>
                    `;
                } else if (v.type === 'jsonpath') {
                    const displayValue = typeof v.value === 'object'
                        ? JSON.stringify(v.value)
                        : String(v.value);
                    const shortValue = displayValue.length > 80
                        ? displayValue.substring(0, 77) + '...'
                        : displayValue;
                    const label = v.passed ? 'Extracted' : 'Failed';
                    return `
                        <div class="ps-4 small">
                            ${icon} ${label} ${escapeHtml(v.path)} = <span class="text-warning">${escapeHtml(shortValue)}</span>
                        </div>
                    `;
                }
                return '';
            });

            validationsHtml = `
                <div class="mb-3">
                    <h6>Validations:</h6>
                    ${validationParts.join('')}
                </div>
            `;
        }

        // Format substitutions (show what was replaced and where)
        let substitutionsHtml = '';
        if (result.substitutions && result.substitutions.length > 0) {
            substitutionsHtml = `
                <div class="mb-3">
                    <h6>Variable Substitutions:</h6>
                    <ul class="list-unstyled small">
                        ${result.substitutions.map(sub => {
                            // Format path to be more readable
                            const location = formatSubstitutionPath(sub.path);
                            return `
                                <li class="mb-1">
                                    ${location ? `<span class="text-muted">${location}:</span> ` : ''}
                                    <code>${sub.original}</code> → <code>${sub.value}</code>
                                    ${sub.type ? `<small class="text-muted">(${sub.type})</small>` : ''}
                                </li>
                            `;
                        }).join('')}
                    </ul>
                </div>
            `;
        }

        const modalHtml = `
            <div class="modal fade" id="${modalId}" tabindex="-1">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi bi-check-circle-fill me-2 ${statusClass}"></i>Node Execution Complete
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="alert alert-${result.success ? 'success' : 'danger'} mb-3">
                                <strong>${node.name || node.method + ' ' + node.url}</strong>
                                <span class="ms-2">${statusIcon} ${statusText}</span>
                            </div>
                            <div class="row">
                                <div class="col-md-6">
                                    <h6>Request</h6>
                                    <div class="mb-2">
                                        <strong>${result.request.method}</strong>
                                        <code>${result.request.url}</code>
                                    </div>

                                    ${Object.keys(result.request.headers || {}).length > 0 ? `
                                        <details class="mb-2" open>
                                            <summary><strong>Headers</strong></summary>
                                            <pre style="background: var(--bg-surface); color: var(--text-primary); border: 1px solid var(--border-color);" class="p-2 small">${JSON.stringify(result.request.headers, null, 2)}</pre>
                                        </details>
                                    ` : ''}

                                    ${result.request.body && Object.keys(result.request.body).length > 0 ? `
                                        <details class="mb-2" open>
                                            <summary><strong>Body</strong></summary>
                                            <pre style="background: var(--bg-surface); color: var(--text-primary); border: 1px solid var(--border-color);" class="p-2 small">${JSON.stringify(result.request.body, null, 2)}</pre>
                                        </details>
                                    ` : ''}

                                    ${substitutionsHtml}
                                </div>

                                <div class="col-md-6">
                                    <h6>Response</h6>
                                    <div class="mb-2">
                                        <strong class="${statusClass}">${statusText}</strong>
                                        ${result.response ? `
                                            <span class="badge bg-${result.response.status >= 200 && result.response.status < 300 ? 'success' : 'danger'}">
                                                ${result.response.status} ${result.response.statusText || ''}
                                            </span>
                                        ` : ''}
                                        ${result.duration !== undefined ? `<small class="text-muted">(${result.duration}s)</small>` : ''}
                                    </div>

                                    ${result.error && !validationsHtml ? `
                                        <div class="alert alert-danger">
                                            <strong>Error:</strong> ${result.error}
                                        </div>
                                    ` : ''}

                                    ${validationsHtml}

                                    ${result.response && result.response.body ? `
                                        <details open>
                                            <summary><strong>Response Body</strong></summary>
                                            <pre style="background: var(--bg-surface); color: var(--text-primary); border: 1px solid var(--border-color); max-height: 400px; overflow-y: auto;" class="p-2 small">${JSON.stringify(result.response.body, null, 2)}</pre>
                                        </details>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            ${result.success && result.response?.body ? `
                            <button type="button" class="btn btn-success" id="storeSchemaBtn">
                                <i class="bi bi-save me-2"></i>Store Response Schema
                            </button>
                            ` : ''}
                            <button type="button" class="btn btn-primary" id="reengageNode">
                                <i class="bi bi-arrow-clockwise me-2"></i>Re-engage Node
                            </button>
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add modal to DOM
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Initialize and show Bootstrap modal
        const modalEl = document.getElementById(modalId);
        const modal = new bootstrap.Modal(modalEl);

        // Add Re-engage Node button handler
        const reengageBtn = modalEl.querySelector('#reengageNode');
        if (reengageBtn) {
            reengageBtn.addEventListener('click', () => {
                modal.hide();
                // Re-run with same dependencies - need to show mocking modal again
                tryItOutNode(config.nodes.indexOf(node));
            });
        }

        // Add Store Schema button handler
        const storeSchemaBtn = modalEl.querySelector('#storeSchemaBtn');
        if (storeSchemaBtn) {
            storeSchemaBtn.addEventListener('click', () => {
                // Extract schema from response body
                const schema = extractSchema(result.response.body);

                // Store schema in config
                storeResponseSchema(node, schema);

                // Update button to show success
                storeSchemaBtn.innerHTML = '<i class="bi bi-check-circle me-2"></i>Schema Stored!';
                storeSchemaBtn.disabled = true;
                storeSchemaBtn.classList.remove('btn-success');
                storeSchemaBtn.classList.add('btn-outline-success');

                showToast('Response schema stored successfully', 'success', 3000);
            });
        }

        // Clean up modal on close
        modalEl.addEventListener('hidden.bs.modal', () => {
            modalEl.remove();
        });

        modal.show();
    }

    /**
     * Store response schema in config
     * @param {object} node - The node that was executed
     * @param {object} schema - Extracted schema
     */
    function storeResponseSchema(node, schema) {
        if (!node.id) {
            console.error('[EngageNode] Cannot store schema: node has no ID');
            showToast('Cannot store schema: node must have an ID', 'error', 5000);
            return;
        }

        // Initialize responseSchemas section if not exists
        if (!config.responseSchemas) {
            config.responseSchemas = {};
        }

        // Store schema by node ID
        config.responseSchemas[node.id] = {
            nodeId: node.id,
            nodeName: node.name || node.method + ' ' + node.url,
            method: node.method || 'GET',
            url: node.url || '',
            schema: schema,
            timestamp: new Date().toISOString()
        };

        console.log('[EngageNode] Stored schema for node:', node.id);

        // Save to localStorage
        if (typeof saveToLocalStorage === 'function') {
            saveToLocalStorage();
        }

        // Update preview
        if (typeof updatePreview === 'function') {
            updatePreview();
        }

        // Update Response Schemas UI
        if (typeof window.renderResponseSchemas === 'function') {
            window.renderResponseSchemas();
        }

        // Update accordion header count
        updateResponseSchemasCount();
    }

    /**
     * Update the Response Schemas accordion header count
     */
    function updateResponseSchemasCount() {
        const header = document.querySelector('#responseSchemasSection')?.previousElementSibling;
        if (header) {
            const button = header.querySelector('button');
            if (button) {
                const count = Object.keys(config.responseSchemas || {}).length;
                button.textContent = `Response Schemas (${count})`;
            }
        }
    }

    /**
     * Show a toast notification
     * @param {string} message - Message to display
     * @param {string} type - Type: 'success', 'error', 'info'
     * @param {number} duration - Duration in ms (0 = no auto-hide)
     * @returns {object} Toast instance with hide() method
     */
    function showToast(message, type = 'info', duration = 3000) {
        // Use global showToast if available, otherwise create simple alert
        if (typeof window.showToast === 'function') {
            return window.showToast(message, type, duration);
        } else {
            // Fallback: use console
            console.log(`[EngageNode] ${type.toUpperCase()}: ${message}`);
            return { hide: () => {} };
        }
    }

    // Initialize on load
    if (typeof window.initTryItOut === 'undefined') {
        window.initTryItOut = initTryItOut;
    }

})();
