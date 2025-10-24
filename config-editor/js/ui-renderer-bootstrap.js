// Bootstrap-specific UI Renderer
// Uses Bootstrap 5 classes instead of custom CSS

function renderEditor() {
    if (!config) return;

    const html = `
        <div class="accordion pb-4" id="mainAccordion">
        <!-- General Settings -->
        <div class="accordion-item mb-3 border rounded">
            <h2 class="accordion-header">
                <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#generalSettings">
                    General Settings
                </button>
            </h2>
            <div id="generalSettings" class="accordion-collapse collapse show" data-bs-parent="#mainAccordion">
                <div class="accordion-body">
                    <div class="form-check">
                        <input type="checkbox" class="form-check-input" id="enableDebug" ${config.enableDebug ? 'checked' : ''} onchange="updateConfig()">
                        <label class="form-check-label" for="enableDebug">Enable Debug Logging</label>
                    </div>
                    <div class="form-text">Show detailed execution logs for troubleshooting</div>
                </div>
            </div>
        </div>

        <!-- Global Variables -->
        <div class="accordion-item mb-3 border rounded">
            <h2 class="accordion-header">
                <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#globalVariables">
                    Global Variables
                </button>
            </h2>
            <div id="globalVariables" class="accordion-collapse collapse show" data-bs-parent="#mainAccordion">
                <div class="accordion-body">
                    <label class="form-label">Variables</label>
                    <div id="globalVariablesContent"></div>
                    <button class="btn btn-secondary btn-sm mt-2" onclick="addGlobalVariable()">
                        <i class="bi bi-plus"></i> Add Variable
                    </button>
                    <div class="form-text">Global variables accessible in all steps via {{ .vars.key }} syntax</div>
                </div>
            </div>
        </div>

        <!-- Default Settings -->
        <div class="accordion-item mb-3 border rounded">
            <h2 class="accordion-header">
                <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#defaultSettings">
                    Default Settings
                </button>
            </h2>
            <div id="defaultSettings" class="accordion-collapse collapse show" data-bs-parent="#mainAccordion">
                <div class="accordion-body">
                    <div class="mb-3">
                        <label class="form-label">Base URL</label>
                        <input type="text" class="form-control" id="baseUrl" value="${config.defaults?.baseUrl || ''}" onchange="updateConfig()" placeholder="https://api.example.com">
                        <div class="form-text">Base URL prepended to relative step URLs</div>
                    </div>

                    <div class="mb-3">
                        <label class="form-label">Default Timeout (seconds)</label>
                        <input type="number" class="form-control" id="timeout" value="${config.defaults?.timeout || 30}" onchange="updateConfig()">
                        <div class="form-text">Request timeout for all steps (can be overridden per step)</div>
                    </div>

                    <div class="mb-3">
                        <label class="form-label">Default Validations</label>
                        <div id="defaultValidations"></div>
                        <button class="btn btn-secondary btn-sm mt-2" onclick="addDefaultValidation()">
                            <i class="bi bi-plus"></i> Add Default Validation
                        </button>
                        <div class="form-text">Validations applied to all steps (steps with validations override these)</div>
                    </div>

                    <div class="mb-3">
                        <label class="form-label">Default Headers</label>
                        <div id="defaultHeaders"></div>
                        <button class="btn btn-secondary btn-sm mt-2" onclick="addDefaultHeader()">
                            <i class="bi bi-plus"></i> Add Header
                        </button>
                        <div class="form-text">Headers applied to all requests (merged with step headers)</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Steps -->
        <div class="accordion-item mb-3 border rounded">
            <h2 class="accordion-header">
                <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#stepsSection">
                    Steps (${config.steps?.length || 0})
                </button>
            </h2>
            <div id="stepsSection" class="accordion-collapse collapse show" data-bs-parent="#mainAccordion">
                <div class="accordion-body">
                    <div id="stepsList"></div>
                    <button class="btn btn-primary btn-sm mt-2" onclick="addStep()">
                        <i class="bi bi-plus"></i> Add Step
                    </button>
                </div>
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
            attachAutocompleteToInput(baseUrlInput, null);
        }
    }, 0);
}

function renderGlobalVariables() {
    const variables = config.variables || {};
    const container = document.getElementById('globalVariablesContent');

    if (!container) {
        console.error('globalVariablesContent container not found');
        return;
    }

    const html = Object.keys(variables).length === 0 ?
        '<div class="text-muted small">No global variables defined</div>' :
        Object.entries(variables).map(([key, value], index) => `
            <div class="row g-2 mb-2">
                <div class="col">
                    <input type="text" class="form-control form-control-sm" value="${key.replace(/"/g, '&quot;')}"
                           onchange="updateGlobalVariable(${index}, 'key', this.value)" placeholder="Variable name">
                </div>
                <div class="col">
                    <input type="text" class="form-control form-control-sm" value="${String(value).replace(/"/g, '&quot;')}"
                           onchange="updateGlobalVariable(${index}, 'value', this.value)" placeholder="Variable value">
                </div>
                <div class="col-auto">
                    <button class="btn btn-danger btn-sm" onclick="removeGlobalVariable(${index})">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </div>
            </div>
        `).join('');

    container.innerHTML = html;

    // Attach autocomplete to variable inputs
    const varInputs = container.querySelectorAll('input[type="text"]');
    varInputs.forEach(input => {
        attachAutocompleteToInput(input, null);
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
        '<div class="text-muted small">No default headers</div>' :
        Object.entries(headers).map(([key, value], index) => `
            <div class="row g-2 mb-2">
                <div class="col">
                    <input type="text" class="form-control form-control-sm" value="${key.replace(/"/g, '&quot;')}"
                           onchange="updateDefaultHeader(${index}, 'key', this.value)" placeholder="Header name">
                </div>
                <div class="col">
                    <input type="text" class="form-control form-control-sm" value="${String(value).replace(/"/g, '&quot;')}"
                           onchange="updateDefaultHeader(${index}, 'value', this.value)" placeholder="Header value">
                </div>
                <div class="col-auto">
                    <button class="btn btn-danger btn-sm" onclick="removeDefaultHeader(${index})">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </div>
            </div>
        `).join('');

    container.innerHTML = html;

    // Attach autocomplete to header inputs
    const headerInputs = container.querySelectorAll('input[type="text"]');
    headerInputs.forEach(input => {
        attachAutocompleteToInput(input, null);
    });
}

function renderSteps() {
    const steps = config.steps || [];
    const container = document.getElementById('stepsList');

    if (steps.length === 0) {
        container.innerHTML = '<div class="text-muted small">No steps defined</div>';
        return;
    }

    const html = `
        <div class="accordion" id="stepsAccordion">
        ${steps.map((step, index) => {
            const isOpen = openStepIndices.has(index);
            const collapseId = `step_${index}`;
            return `
            <div class="accordion-item mb-3 step-method-${(step.method || 'GET').toLowerCase()}">
                <h2 class="accordion-header d-flex align-items-center">
                    <button class="accordion-button ${isOpen ? '' : 'collapsed'} py-2 flex-grow-1" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}">
                        <span class="fw-medium">
                            ${index + 1}. ${step.name || 'Unnamed Step'}
                            ${step.id ? `<span class="text-muted small">[${step.id}]</span>` : ''}
                            <span class="badge ${getMethodBadgeClass(step.method)} ms-2">${step.method || 'GET'}</span>
                        </span>
                    </button>
                    <div class="d-flex gap-1 px-2">
                        <button class="btn btn-sm btn-outline-secondary" onclick="moveStep(${index}, -1)" ${index === 0 ? 'disabled' : ''} title="Move up">
                            <i class="bi bi-arrow-up"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-secondary" onclick="moveStep(${index}, 1)" ${index === steps.length - 1 ? 'disabled' : ''} title="Move down">
                            <i class="bi bi-arrow-down"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="removeStep(${index})" title="Delete">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </h2>
                <div id="${collapseId}" class="accordion-collapse collapse${isOpen ? ' show' : ''}" data-bs-parent="#stepsAccordion">
                    <div class="accordion-body">
                        ${renderStepForm(step, index)}
                    </div>
                </div>
            </div>
            `;
        }).join('')}
        </div>
    `;

    container.innerHTML = html;

    // Track collapse state
    const collapseEls = container.querySelectorAll('.accordion-collapse');
    collapseEls.forEach((collapseEl, index) => {
        collapseEl.addEventListener('shown.bs.collapse', () => openStepIndices.add(index));
        collapseEl.addEventListener('hidden.bs.collapse', () => openStepIndices.delete(index));
    });

    // Attach autocomplete to all step inputs
    setTimeout(() => {
        steps.forEach((step, stepIndex) => {
            const stepItem = container.querySelectorAll('.accordion-item')[stepIndex];
            if (stepItem) {
                // Find all text inputs and textareas in this step
                const inputs = stepItem.querySelectorAll('input[type="text"], textarea');
                inputs.forEach(input => {
                    // Skip inputs that shouldn't have autocomplete
                    const skipPlaceholders = ['Describe this step', 'uniqueStepId'];
                    if (!skipPlaceholders.includes(input.placeholder)) {
                        attachAutocompleteToInput(input, stepIndex);
                    }
                });
            }
        });
    }, 0);
}

function getMethodBorderColor(method) {
    const colors = {
        'GET': 'border-info',
        'POST': 'border-success',
        'PUT': 'border-warning',
        'DELETE': 'border-danger',
        'PATCH': 'border-primary'
    };
    return colors[method] || 'border-secondary';
}

function getMethodBadgeClass(method) {
    const classes = {
        'GET': 'bg-info text-dark',
        'POST': 'bg-success',
        'PUT': 'bg-warning text-dark',
        'DELETE': 'bg-danger',
        'PATCH': 'bg-primary'
    };
    return classes[method] || 'bg-secondary';
}

function renderStepForm(step, index) {
    return `
        <!-- Step Details -->
        <div class="border-bottom pb-3 mb-3">
            <h6 class="text-uppercase fw-semibold small text-secondary mb-3">Step Details</h6>

            <div class="row g-3 mb-3">
                <div class="col-md-6">
                    <label class="form-label">Step ID</label>
                    <input type="text" class="form-control form-control-sm" value="${step.id || ''}"
                           onchange="updateStep(${index}, 'id', this.value || undefined)" placeholder="uniqueStepId">
                    <div class="form-text">Unique identifier for named response references: {{ .responses.stepId.field }}</div>
                </div>
                <div class="col-md-6">
                    <label class="form-label">Step Name</label>
                    <input type="text" class="form-control form-control-sm" value="${step.name || ''}"
                           onchange="updateStep(${index}, 'name', this.value)" placeholder="Describe this step">
                </div>
            </div>

            ${index > 0 ? `
            <div class="mb-3">
                <label class="form-label">Condition (Skip step based on previous response)</label>
                <div id="conditionSummary_${index}" class="mb-2">
                    ${renderConditionSummary(step.condition || {}, index)}
                </div>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-secondary" onclick="editCondition(${index})">
                        <i class="bi bi-${step.condition && Object.keys(step.condition).length > 0 ? 'pencil' : 'plus'}"></i>
                        ${step.condition && Object.keys(step.condition).length > 0 ? 'Edit' : 'Add'} Condition
                    </button>
                    ${step.condition && Object.keys(step.condition).length > 0 ? `
                    <button class="btn btn-outline-danger" onclick="removeCondition(${index})">
                        <i class="bi bi-trash"></i> Remove
                    </button>
                    ` : ''}
                </div>
                <div class="form-text">Skip this step if a condition on a previous response is met</div>
            </div>
            ` : ''}

            <div class="mb-3">
                <label class="form-label">User Input Prompts</label>
                <div id="promptsList_${index}">
                    ${renderPromptsList(step.prompts || {}, index)}
                </div>
                <button class="btn btn-outline-secondary btn-sm mt-2" onclick="addPrompt(${index})">
                    <i class="bi bi-plus"></i> Add Prompt
                </button>
                <div class="form-text">Collect user input before executing this step</div>
            </div>
        </div>

        <!-- Request Details -->
        <div class="border-bottom pb-3 mb-3">
            <h6 class="text-uppercase fw-semibold small text-secondary mb-3">Request Details</h6>

            <div class="row g-3 mb-3">
                <div class="col-md-4">
                    <label class="form-label">HTTP Method</label>
                    <select class="form-select form-select-sm" onchange="updateStep(${index}, 'method', this.value)">
                        <option value="GET" ${step.method === 'GET' ? 'selected' : ''}>GET</option>
                        <option value="POST" ${step.method === 'POST' ? 'selected' : ''}>POST</option>
                        <option value="PUT" ${step.method === 'PUT' ? 'selected' : ''}>PUT</option>
                        <option value="DELETE" ${step.method === 'DELETE' ? 'selected' : ''}>DELETE</option>
                        <option value="PATCH" ${step.method === 'PATCH' ? 'selected' : ''}>PATCH</option>
                    </select>
                </div>
                <div class="col-md-4">
                    <label class="form-label">URL</label>
                    <input type="text" class="form-control form-control-sm" value="${step.url || ''}"
                           onchange="updateStep(${index}, 'url', this.value)" placeholder="/api/endpoint or full URL">
                    <div class="form-text">Use {{ .responses.stepId.field }} or {{ .input.var }}</div>
                </div>
                <div class="col-md-4">
                    <label class="form-label">Timeout (seconds)</label>
                    <input type="number" class="form-control form-control-sm" value="${step.timeout || ''}"
                           onchange="updateStep(${index}, 'timeout', this.value ? parseInt(this.value) : undefined)"
                           placeholder="Default: ${config.defaults?.timeout || 30}">
                </div>
            </div>

            <div class="mb-3">
                <label class="form-label">Headers</label>

                <!-- Skip Default Headers Checkbox -->
                <div class="form-check mb-2">
                    <input class="form-check-input"
                           type="checkbox"
                           id="skipDefaultHeaders_${index}"
                           ${step.skipDefaultHeaders === true ? 'checked' : ''}
                           onchange="toggleSkipDefaultHeaders(${index}, this.checked)">
                    <label class="form-check-label" for="skipDefaultHeaders_${index}">
                        Skip default headers (use only step headers)
                    </label>
                </div>

                <div id="headersList_${index}">
                    ${renderHeadersList(step.headers, index)}
                </div>
                <button class="btn btn-outline-secondary btn-sm mt-2"
                        id="addHeaderBtn_${index}"
                        onclick="addHeader(${index})"
                >
                    <i class="bi bi-plus"></i> Add Header
                </button>
                <div class="form-text">
                    ${step.skipDefaultHeaders === true ? 'Skip mode: Only step headers will be sent' : 'Merge mode: Step headers are merged with defaults'}
                </div>
            </div>

            <div class="mb-3">
                <label class="form-label">Request Body (JSON)</label>
                <textarea class="form-control form-control-sm font-monospace" rows="10"
                          onchange="updateStepJSON(${index}, 'body', this.value)">${JSON.stringify(step.body || {}, null, 2)}</textarea>
                <div class="form-text">Format auto-detected from Content-Type header. Use flat object for form-urlencoded, nested for JSON.</div>
            </div>
        </div>

        <!-- Response Handling -->
        <div>
            <h6 class="text-uppercase fw-semibold small text-secondary mb-3">Response Handling</h6>

            <div class="mb-3">
                <label class="form-label">Launch Browser (JSONPath)</label>
                <input type="text" class="form-control form-control-sm" value="${step.launchBrowser || ''}"
                       onchange="updateStep(${index}, 'launchBrowser', this.value || undefined)" placeholder=".authorizationUrl">
                <div class="form-text">Opens URL in browser after step executes (useful for OAuth flows)</div>
            </div>

            <div class="mb-3">
                <label class="form-label">Response Validations</label>

                <!-- Skip Default Validations Checkbox -->
                <div class="form-check mb-2">
                    <input class="form-check-input"
                           type="checkbox"
                           id="skipDefaultValidations_${index}"
                           ${step.skipDefaultValidations === true ? 'checked' : ''}
                           onchange="toggleSkipDefaultValidations(${index}, this.checked)">
                    <label class="form-check-label" for="skipDefaultValidations_${index}">
                        Skip default validations (use only step validations)
                    </label>
                </div>

                <div id="validationsList_${index}">
                    ${renderValidationsList(step.validations, index)}
                </div>
                <button class="btn btn-outline-secondary btn-sm mt-2"
                        id="addValidationBtn_${index}"
                        onclick="addValidation(${index})"
                >
                    <i class="bi bi-plus"></i> Add Validation
                </button>
                <div class="form-text">
                    ${step.skipDefaultValidations === true ? 'Skip mode: Only step validations will be performed' : 'Merge mode: Step validations are concatenated with defaults'}
                </div>
            </div>
        </div>
    `;
}

function toggleSection(header) {
    // Deprecated - using Bootstrap collapse now
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
window.addGlobalVariable = addGlobalVariable;
window.removeGlobalVariable = removeGlobalVariable;
