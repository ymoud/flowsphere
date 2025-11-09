/**
 * Safe wrapper for attachAutocompleteToInput
 * Only attaches autocomplete if the feature is loaded
 */
function safeAttachAutocomplete(input, stepIndex = null, mode = 'template') {
    if (typeof attachAutocompleteToInput === 'function') {
        attachAutocompleteToInput(input, stepIndex, mode);
    }
    // Silently skip if autocomplete not loaded (graceful degradation)
}

function renderEditor() {
    if (!config) return;

    const html = `
        <div style="padding-bottom: 30px;">
        <div class="section">
            <div class="section-header" onclick="toggleSection(this)">
                <h2>General Settings</h2>
                <span class="toggle">▼</span>
            </div>
            <div class="section-content">
                <div class="form-group">
                    <div class="checkbox-group">
                        <input type="checkbox" id="enableDebug" ${config.enableDebug ? 'checked' : ''} onchange="updateConfig()">
                        <label for="enableDebug">Enable Debug Logging</label>
                    </div>
                    <div class="help-text">Show detailed execution logs for troubleshooting</div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-header" onclick="toggleSection(this)">
                <h2>Global Variables (${Object.keys(config.variables || {}).length})</h2>
                <span class="toggle">▼</span>
            </div>
            <div class="section-content">
                <div class="form-group">
                    <label>Variables</label>
                    <div id="globalVariables"></div>
                    <button class="btn btn-secondary btn-small" onclick="addGlobalVariable()">+ Add Variable</button>
                    <div class="help-text">Global variables accessible in all steps via {{ .vars.key }} syntax</div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-header" onclick="toggleSection(this)">
                <h2>Default Settings</h2>
                <span class="toggle">▼</span>
            </div>
            <div class="section-content">
                <div class="form-group">
                    <label>Base URL</label>
                    <input type="text" id="baseUrl" value="${config.defaults?.baseUrl || ''}" onchange="updateConfig()" placeholder="https://api.example.com">
                    <div class="help-text">Base URL prepended to relative step URLs</div>
                </div>

                <div class="form-group">
                    <label>Default Timeout (seconds)</label>
                    <input type="number" id="timeout" value="${config.defaults?.timeout || 30}" onchange="updateConfig()">
                    <div class="help-text">Request timeout for all steps (can be overridden per step)</div>
                </div>

                <div class="form-group">
                    <label>Default Validations</label>
                    <div id="defaultValidations"></div>
                    <button class="btn btn-secondary btn-small" onclick="addDefaultValidation()">+ Add Default Validation</button>
                    <div class="help-text">Validations applied to all steps (steps with validations override these)</div>
                </div>

                <div class="form-group">
                    <label>Default Headers</label>
                    <div id="defaultHeaders"></div>
                    <button class="btn btn-secondary btn-small" onclick="addDefaultHeader()">+ Add Header</button>
                    <div class="help-text">Headers applied to all requests (merged with step headers)</div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-header" onclick="toggleSection(this)">
                <h2>Steps (${config.nodes?.length || 0})</h2>
                <span class="toggle">▼</span>
            </div>
            <div class="section-content">
                <div id="stepsList"></div>
                <button class="btn btn-primary btn-small" onclick="addStep()">+ Add Step</button>
            </div>
        </div>
        </div>
    `;

    const editorContent = document.getElementById('editorContent');
    editorContent.innerHTML = html;
    editorContent.className = ''; // Remove empty-state class
    renderGlobalVariables();
    renderDefaultValidations();
    renderDefaultHeaders();
    renderSteps();

    // Attach autocomplete to baseUrl input
    setTimeout(() => {
        const baseUrlInput = document.getElementById('baseUrl');
        if (baseUrlInput) {
            safeAttachAutocomplete(baseUrlInput, null);
        }
    }, 0);
}

function renderGlobalVariables() {
    const variables = config.variables || {};
    const container = document.getElementById('globalVariables');

    if (!container) {
        console.error('globalVariables container not found');
        return;
    }

    const html = Object.keys(variables).length === 0 ?
        '<div class="help-text">No global variables defined</div>' :
        Object.entries(variables).map(([key, value], index) => `
            <div class="key-value-row">
                <input type="text" value="${key.replace(/"/g, '&quot;')}" onchange="updateGlobalVariable(${index}, 'key', this.value)" placeholder="Variable name">
                <input type="text" value="${String(value).replace(/"/g, '&quot;')}" onchange="updateGlobalVariable(${index}, 'value', this.value)" placeholder="Variable value">
                <button class="btn btn-danger btn-small" onclick="removeGlobalVariable(${index})">×</button>
            </div>
        `).join('');

    container.innerHTML = html;

    // Attach autocomplete to variable inputs
    const varInputs = container.querySelectorAll('input[type="text"]');
    varInputs.forEach(input => {
        safeAttachAutocomplete(input, null);
    });
}

function addGlobalVariable() {
    if (!config.variables) {
        config.variables = {};
    }
    config.variables[`newVar${Object.keys(config.variables).length + 1}`] = '';
    renderGlobalVariables();
    saveToLocalStorage();
    updatePreview();
}

function updateGlobalVariable(index, field, value) {
    const keys = Object.keys(config.variables);
    const oldKey = keys[index];

    if (field === 'key') {
        if (value !== oldKey) {
            const oldValue = config.variables[oldKey];
            delete config.variables[oldKey];
            config.variables[value] = oldValue;
        }
    } else {
        config.variables[oldKey] = value;
    }

    renderGlobalVariables();
    saveToLocalStorage();
    updatePreview();
}

function removeGlobalVariable(index) {
    const keys = Object.keys(config.variables);
    const key = keys[index];
    delete config.variables[key];

    if (Object.keys(config.variables).length === 0) {
        delete config.variables;
    }

    renderGlobalVariables();
    saveToLocalStorage();
    updatePreview();
}

function renderDefaultHeaders() {
    const headers = config.defaults?.headers || {};
    const container = document.getElementById('defaultHeaders');

    if (!container) {
        console.error('defaultHeaders container not found');
        return;
    }

    const html = Object.keys(headers).length === 0 ?
        '<div class="help-text">No default headers</div>' :
        Object.entries(headers).map(([key, value], index) => `
            <div class="key-value-row">
                <input type="text" value="${key.replace(/"/g, '&quot;')}" onchange="updateDefaultHeader(${index}, 'key', this.value)" placeholder="Header name">
                <input type="text" value="${String(value).replace(/"/g, '&quot;')}" onchange="updateDefaultHeader(${index}, 'value', this.value)" placeholder="Header value">
                <button class="btn btn-danger btn-small" onclick="removeDefaultHeader(${index})">×</button>
            </div>
        `).join('');

    container.innerHTML = html;

    // Attach autocomplete to header inputs
    const headerInputs = container.querySelectorAll('input[type="text"]');
    headerInputs.forEach(input => {
        safeAttachAutocomplete(input, null);
    });
}

function renderSteps() {
    const steps = config.nodes || [];
    const container = document.getElementById('stepsList');

    if (steps.length === 0) {
        container.innerHTML = '<div class="help-text">No steps defined</div>';
        return;
    }

    const html = steps.map((step, index) => {
        const isOpen = openStepIndices.has(index);
        return `
        <div class="step-item">
            <div class="step-header" onclick="toggleSection(this)">
                <div class="step-title">
                    ${index + 1}. ${step.name || 'Unnamed Step'}${step.id ? ` <span style="color: #6b7280; font-size: 11px;">[${step.id}]</span>` : ''}
                    <span class="method-badge method-${step.method || 'GET'}">${step.method || 'GET'}</span>
                </div>
                <div class="step-controls">
                    <button class="btn btn-secondary btn-small" onclick="event.stopPropagation(); moveStep(${index}, -1)" ${index === 0 ? 'disabled' : ''}>↑</button>
                    <button class="btn btn-secondary btn-small" onclick="event.stopPropagation(); moveStep(${index}, 1)" ${index === steps.length - 1 ? 'disabled' : ''}>↓</button>
                    <button class="btn btn-danger btn-small" onclick="event.stopPropagation(); removeStep(${index})">×</button>
                    <span class="toggle">${isOpen ? '▼' : '▶'}</span>
                </div>
            </div>
            <div class="step-content${isOpen ? '' : ' collapsed'}">
                ${renderStepForm(step, index)}
            </div>
        </div>
        `;
    }).join('');

    container.innerHTML = html;

    // Attach autocomplete to all inputs after rendering
    attachAutocompleteToAllInputs();
}

function renderStepForm(step, index) {
    return `
        <!-- Section 1: Step Details -->
        <div class="step-section">
            <div class="step-section-title">Step Details</div>

            <div class="form-row cols-2">
                <div class="form-field">
                    <label>Step ID</label>
                    <input type="text" value="${step.id || ''}" onchange="updateStep(${index}, 'id', this.value || undefined)" placeholder="uniqueStepId">
                    <div class="help-text">Unique identifier for named response references: {{ .responses.stepId.field }}</div>
                </div>
                <div class="form-field">
                    <label>Step Name</label>
                    <input type="text" value="${step.name || ''}" onchange="updateStep(${index}, 'name', this.value)" placeholder="Describe this step">
                </div>
            </div>

            ${index > 0 ? `
            <div class="form-group">
                <label>Conditions</label>
                <div id="conditionsList_${index}">
                    ${renderConditionsList(step.conditions || [], index)}
                </div>
                <button class="btn btn-secondary btn-small" onclick="addCondition(${index})" style="margin-top: 10px;">+ Add Condition</button>
                <div class="help-text">Execute this step only if ALL conditions are met (AND logic). Conditions can check step responses, variables, or user input.</div>
            </div>
            ` : ''}

            <div class="form-group">
                <label>User Input Prompts</label>
                <div id="promptsList_${index}">
                    ${renderPromptsList(step.userPrompts || {}, index)}
                </div>
                <button class="btn btn-secondary btn-small" onclick="addPrompt(${index})" style="margin-top: 10px;">
                    + Add Prompt
                </button>
                <div class="help-text">Collect user input before executing this step</div>
            </div>
        </div>

        <!-- Section 2: Request Details -->
        <div class="step-section">
            <div class="step-section-title">Request Details</div>

            <div class="form-row cols-3">
                <div class="form-field">
                    <label>HTTP Method</label>
                    <select onchange="updateStep(${index}, 'method', this.value)">
                        <option value="GET" ${step.method === 'GET' ? 'selected' : ''}>GET</option>
                        <option value="POST" ${step.method === 'POST' ? 'selected' : ''}>POST</option>
                        <option value="PUT" ${step.method === 'PUT' ? 'selected' : ''}>PUT</option>
                        <option value="DELETE" ${step.method === 'DELETE' ? 'selected' : ''}>DELETE</option>
                        <option value="PATCH" ${step.method === 'PATCH' ? 'selected' : ''}>PATCH</option>
                    </select>
                </div>
                <div class="form-field">
                    <label>URL</label>
                    <input type="text" value="${step.url || ''}" onchange="updateStep(${index}, 'url', this.value)" placeholder="/api/endpoint or full URL">
                    <div class="help-text">Use {{ .responses.stepId.field }} or {{ .input.var }}</div>
                </div>
                <div class="form-field">
                    <label>Timeout (seconds)</label>
                    <input type="number" value="${step.timeout || ''}" onchange="updateStep(${index}, 'timeout', this.value ? parseInt(this.value) : undefined)" placeholder="Default: ${config.defaults?.timeout || 30}">
                </div>
            </div>

            <div class="form-group">
                <label>Headers</label>
                <div id="headersList_${index}">
                    ${renderHeadersList(step.headers || {}, index)}
                </div>
                <button class="btn btn-secondary btn-small" onclick="addHeader(${index})" style="margin-top: 10px;">
                    + Add Header
                </button>
                <div class="help-text">Merged with default headers. Format inferred from Content-Type.</div>
            </div>

            <div class="form-group">
                <label>Request Body (JSON)</label>
                <textarea onchange="updateStepJSON(${index}, 'body', this.value)">${JSON.stringify(step.body || {}, null, 2)}</textarea>
                <div class="help-text">Format auto-detected from Content-Type header. Use flat object for form-urlencoded, nested for JSON.</div>
            </div>
        </div>

        <!-- Section 3: Response Handling -->
        <div class="step-section">
            <div class="step-section-title">Response Handling</div>

            <div class="form-group">
                <label>Launch Browser (JSONPath)</label>
                <input type="text" value="${step.launchBrowser || ''}" onchange="updateStep(${index}, 'launchBrowser', this.value || undefined)" placeholder=".authorizationUrl">
                <div class="help-text">Opens URL in browser after step executes (useful for OAuth flows)</div>
            </div>

            <div class="form-group">
                <label>Response Validations</label>
                <div id="validationsList_${index}">
                    ${renderValidationsList(step.validations || [], index)}
                </div>
                <button class="btn btn-secondary btn-small" onclick="addValidation(${index})" style="margin-top: 10px;">
                    + Add Validation
                </button>
                <div class="help-text">Validate HTTP status code and/or response fields (inherits default validations if empty)</div>
            </div>
        </div>
    `;
}

function toggleSection(header) {
    const content = header.nextElementSibling;
    const toggle = header.querySelector('.toggle');

    content.classList.toggle('collapsed');
    toggle.textContent = content.classList.contains('collapsed') ? '▶' : '▼';

    // Track open state only for step items (not for main sections)
    const stepItem = header.closest('.step-item');
    if (stepItem) {
        const stepIndex = Array.from(stepItem.parentNode.children).indexOf(stepItem);
        if (content.classList.contains('collapsed')) {
            openStepIndices.delete(stepIndex);
        } else {
            openStepIndices.add(stepIndex);
        }
    }
}

function updateConfig() {
    config.enableDebug = document.getElementById('enableDebug')?.checked || false;
    config.defaults = config.defaults || {};
    config.defaults.baseUrl = document.getElementById('baseUrl')?.value || '';
    config.defaults.timeout = parseInt(document.getElementById('timeout')?.value) || 30;
    saveToLocalStorage();
    updatePreview();
}

// Export functions to global scope for onclick handlers
window.toggleSection = toggleSection;
window.updateConfig = updateConfig;
window.updateGlobalVariable = updateGlobalVariable;
