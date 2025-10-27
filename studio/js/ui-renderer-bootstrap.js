// Bootstrap-specific UI Renderer
// Uses Bootstrap 5 classes instead of custom CSS

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
        <div class="accordion pb-4" id="mainAccordion">
        <!-- General Settings -->
        <div class="accordion-item mb-3 border rounded">
            <h2 class="accordion-header">
                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#generalSettings">
                    General Settings
                </button>
            </h2>
            <div id="generalSettings" class="accordion-collapse collapse">
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
                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#globalVariables">
                    Global Variables
                </button>
            </h2>
            <div id="globalVariables" class="accordion-collapse collapse">
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
                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#defaultSettings">
                    Default Settings
                </button>
            </h2>
            <div id="defaultSettings" class="accordion-collapse collapse">
                <div class="accordion-body">
                    <div class="mb-3">
                        <label class="form-label">Base URL</label>
                        <input type="text" class="form-control" id="baseUrl" value="${config.defaults?.baseUrl || ''}" onchange="updateConfig()" placeholder="https://api.example.com">
                        <div class="form-text">Base URL prepended to relative node URLs</div>
                    </div>

                    <div class="mb-3">
                        <label class="form-label">Default Timeout (seconds)</label>
                        <input type="number" class="form-control" id="timeout" value="${config.defaults?.timeout || 30}" onchange="updateConfig()">
                        <div class="form-text">Request timeout for all nodes (can be overridden per node)</div>
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
                        <div class="form-text">Headers applied to all requests (merged with node headers)</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Nodes -->
        <div class="accordion-item mb-3 border rounded">
            <h2 class="accordion-header">
                <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#stepsSection">
                    Nodes (${config.nodes?.length || 0})
                </button>
            </h2>
            <div id="stepsSection" class="accordion-collapse collapse show">
                <div class="accordion-body" id="stepsAccordionBody">
                    <div id="stepsList"></div>
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
            safeAttachAutocomplete(baseUrlInput, null);
        }

        // Update UI based on loaded features (debounced - will batch with other updates)
        if (typeof UIAdapter !== 'undefined' && UIAdapter.updateUIForLoadedFeatures) {
            UIAdapter.updateUIForLoadedFeatures();
        }
    }, 0);

    // Note: Scroll-to-view in JSON preview is only enabled for step/node accordions
    // General settings, variables, and defaults accordions don't trigger JSON scroll
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

    // Attach autocomplete to header inputs after rendering
    setTimeout(() => {
        const headerInputs = container.querySelectorAll('input[type="text"]');
        headerInputs.forEach(input => {
            safeAttachAutocomplete(input, null);
        });
    }, 0);
}

function renderSteps() {
    const steps = config.nodes || [];
    const container = document.getElementById('stepsList');

    if (steps.length === 0) {
        container.innerHTML = `
            <div class="add-node-placeholder" onclick="addStep('bottom')">
                <i class="bi bi-plus-circle"></i>
                <span>Add your first node</span>
            </div>
        `;
        return;
    }

    const showTopPlaceholder = steps.length > 5; // Only show top placeholder when many nodes

    const html = `
        <!-- Floating Add Node (Top) -->
        <div class="add-node-floating add-node-top" id="addNodeTop" onclick="addStep('top')">
            <i class="bi bi-plus-circle"></i>
            <span>Add Node</span>
        </div>

        ${showTopPlaceholder ? `
        <!-- Add Node Placeholder (Top) -->
        <div class="add-node-placeholder" id="addNodePlaceholderTop" onclick="addStep('top')">
            <i class="bi bi-plus-circle"></i>
            <span>Add Node</span>
        </div>
        ` : ''}

        <div class="accordion position-relative" id="stepsAccordion">
        ${steps.map((step, index) => {
            const isOpen = openStepIndices.has(index);
            const collapseId = `step_${index}`;
            // Only show drag handle if drag-drop feature is loaded and there are multiple steps
            const isDragDropEnabled = typeof FeatureRegistry !== 'undefined' && FeatureRegistry.isFeatureLoaded('drag-drop');
            const showDragHandle = steps.length > 1 && isDragDropEnabled;
            const isDraggable = showDragHandle && !isOpen; // Only collapsed steps can be dragged
            return `
            <div class="accordion-item mb-3 step-method-${(step.method || 'GET').toLowerCase()}"
                 draggable="${isDraggable}"
                 data-step-index="${index}"
                 ${!isDraggable && showDragHandle ? 'data-drag-disabled="true"' : ''}>
                <h2 class="accordion-header d-flex align-items-center">
                    <button class="accordion-button ${isOpen ? '' : 'collapsed'} py-2 flex-grow-1" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}">
                        ${showDragHandle ? `<i class="bi bi-grip-vertical text-muted me-2 drag-handle ${isOpen ? 'drag-handle-disabled' : ''}" title="${isOpen ? 'Close node to enable dragging' : 'Drag to reorder'}"></i>` : ''}
                        <span class="fw-medium">
                            ${index + 1}. ${step.name || 'Unnamed Node'}
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
                        <div class="dropdown">
                            <button class="btn btn-sm btn-outline-secondary" type="button" data-bs-toggle="dropdown" aria-expanded="false" title="More actions">
                                <i class="bi bi-three-dots-vertical"></i>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end">
                                <li>
                                    <a class="dropdown-item" href="#" onclick="cloneStep(${index}); return false;">
                                        <i class="bi bi-copy me-2"></i>Duplicate
                                    </a>
                                </li>
                                <li><hr class="dropdown-divider"></li>
                                <li>
                                    <a class="dropdown-item text-danger" href="#" onclick="removeStep(${index}); return false;">
                                        <i class="bi bi-trash me-2"></i>Delete
                                    </a>
                                </li>
                            </ul>
                        </div>
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

        <!-- Add Node Placeholder (Bottom) -->
        <div class="add-node-placeholder" id="addNodePlaceholder" onclick="addStep('bottom')">
            <i class="bi bi-plus-circle"></i>
            <span>Add Node</span>
        </div>
        </div>

        <!-- Floating Add Node (Bottom) -->
        <div class="add-node-floating add-node-bottom" id="addNodeBottom" onclick="addStep('bottom')">
            <i class="bi bi-plus-circle"></i>
            <span>Add Node</span>
        </div>
    `;

    container.innerHTML = html;

    // Track collapse state and update draggable attribute
    const collapseEls = container.querySelectorAll('.accordion-collapse');
    collapseEls.forEach((collapseEl, index) => {
        collapseEl.addEventListener('shown.bs.collapse', () => {
            openStepIndices.add(index);
            // Update draggable state when step is opened
            updateStepDraggableState(index, false);
            // Hide floating buttons when a node is opened
            setTimeout(() => {
                const editorContent = document.getElementById('editorContent');
                const scrollContainer = editorContent?.parentElement;
                const updateFunc = scrollContainer?._scrollListener;
                if (updateFunc) updateFunc();
            }, 50);
            // Scroll to corresponding JSON section
            if (typeof scrollToJsonSection === 'function') {
                scrollToJsonSection(`step-${index}`);
            }
            // Initialize body visibility based on current method
            const methodSelect = document.getElementById(`methodSelect_${index}`);
            if (methodSelect) {
                toggleBodyVisibility(index, methodSelect.value);
            }
        });
        collapseEl.addEventListener('hidden.bs.collapse', () => {
            openStepIndices.delete(index);
            // Update draggable state when step is closed
            updateStepDraggableState(index, true);
            // Show floating buttons again when node is closed (if applicable)
            setTimeout(() => {
                const editorContent = document.getElementById('editorContent');
                const scrollContainer = editorContent?.parentElement;
                const updateFunc = scrollContainer?._scrollListener;
                if (updateFunc) updateFunc();
            }, 50);
        });
    });

    // Attach autocomplete and drag-drop handlers
    setTimeout(() => {
        // Initialize drag and drop for step reordering
        if (typeof initStepDragAndDrop === 'function') {
            initStepDragAndDrop();
        }

        // Attach autocomplete to all step inputs
        steps.forEach((step, stepIndex) => {
            const stepItem = container.querySelectorAll('.accordion-item')[stepIndex];
            if (stepItem) {
                // Find all text inputs and textareas in this step
                const inputs = stepItem.querySelectorAll('input[type="text"], textarea');
                inputs.forEach(input => {
                    // Skip inputs that shouldn't have autocomplete
                    const skipPlaceholders = ['Describe this node', 'uniqueNodeId'];
                    if (!skipPlaceholders.includes(input.placeholder)) {
                        safeAttachAutocomplete(input, stepIndex);
                    }
                });

                // Initialize body visibility for already-open steps
                const collapseEl = stepItem.querySelector('.accordion-collapse');
                if (collapseEl && collapseEl.classList.contains('show')) {
                    const methodSelect = document.getElementById(`methodSelect_${stepIndex}`);
                    if (methodSelect) {
                        toggleBodyVisibility(stepIndex, methodSelect.value);
                    }
                }
            }
        });

        // Initialize floating add node buttons scroll behavior
        initFloatingAddNodeButtons();

        // Force update after everything is initialized to handle initial visibility
        setTimeout(() => {
            const editorContent = document.getElementById('editorContent');
            const scrollContainer = editorContent?.parentElement;
            const updateFunc = scrollContainer?._scrollListener;
            if (updateFunc) updateFunc();
        }, 600);
    }, 0);
}

/**
 * Initialize scroll behavior for floating add node buttons
 * Shows/hides floating buttons based on scroll position and content overflow
 */
function initFloatingAddNodeButtons() {
    const addNodeTop = document.getElementById('addNodeTop');
    const addNodeBottom = document.getElementById('addNodeBottom');

    if (!addNodeTop || !addNodeBottom) return;

    // Get the main scrollable container (the card body that contains the editor content)
    const editorContent = document.getElementById('editorContent');
    if (!editorContent) return;

    const scrollContainer = editorContent.parentElement; // This is the .card-body.overflow-auto
    if (!scrollContainer) return;

    function updateFloatingButtons() {
        const hasOverflow = scrollContainer.scrollHeight > scrollContainer.clientHeight;

        if (!hasOverflow) {
            // No overflow, hide floating buttons
            addNodeTop.classList.remove('visible');
            addNodeBottom.classList.remove('visible');
            return;
        }

        // Check if any node is currently open/expanded
        const stepsAccordion = document.getElementById('stepsAccordion');
        const hasOpenNode = stepsAccordion?.querySelector('.accordion-collapse.show') !== null;

        // If any node is open, hide all floating buttons (user is focused on editing)
        if (hasOpenNode) {
            addNodeTop.classList.remove('visible');
            addNodeBottom.classList.remove('visible');
            return;
        }

        const scrollTop = scrollContainer.scrollTop;
        const scrollHeight = scrollContainer.scrollHeight;
        const clientHeight = scrollContainer.clientHeight;
        const scrollBottom = scrollHeight - scrollTop - clientHeight;

        // Check if the bottom placeholder is visible
        const placeholderBottom = document.getElementById('addNodePlaceholder');
        let placeholderBottomVisible = false;

        if (placeholderBottom) {
            const placeholderRect = placeholderBottom.getBoundingClientRect();
            const containerRect = scrollContainer.getBoundingClientRect();

            // Check if placeholder is in viewport (at least partially)
            placeholderBottomVisible = (
                placeholderRect.top < containerRect.bottom &&
                placeholderRect.bottom > containerRect.top
            );
        }

        // Check if the top placeholder is visible
        const placeholderTop = document.getElementById('addNodePlaceholderTop');
        let placeholderTopVisible = false;

        if (placeholderTop) {
            const placeholderRect = placeholderTop.getBoundingClientRect();
            const containerRect = scrollContainer.getBoundingClientRect();

            // Check if placeholder is in viewport (at least partially)
            placeholderTopVisible = (
                placeholderRect.top < containerRect.bottom &&
                placeholderRect.bottom > containerRect.top
            );
        }

        // If bottom placeholder is visible, hide BOTH floating buttons
        if (placeholderBottomVisible) {
            addNodeTop.classList.remove('visible');
            addNodeBottom.classList.remove('visible');
            return;
        }

        // If top placeholder is visible, hide BOTH floating buttons
        if (placeholderTopVisible) {
            addNodeTop.classList.remove('visible');
            addNodeBottom.classList.remove('visible');
            return;
        }

        // Determine which half of the content we're in
        const scrollPercentage = scrollTop / (scrollHeight - clientHeight);

        // Show only ONE button at a time based on scroll position
        // If in top half (0-50%), show bottom button
        // If in bottom half (50-100%), show top button
        // Hysteresis zone in the middle to prevent flickering
        if (scrollPercentage < 0.3) {
            // In top portion - show bottom button only
            addNodeTop.classList.remove('visible');
            if (scrollBottom > 100) {
                addNodeBottom.classList.add('visible');
            } else {
                addNodeBottom.classList.remove('visible');
            }
        } else if (scrollPercentage > 0.7) {
            // In bottom portion - show top button only
            addNodeBottom.classList.remove('visible');
            if (scrollTop > 100) {
                addNodeTop.classList.add('visible');
            } else {
                addNodeTop.classList.remove('visible');
            }
        } else {
            // In middle zone - show the button that makes more sense based on direction
            // If closer to top, show bottom button; if closer to bottom, show top button
            if (scrollPercentage < 0.5) {
                addNodeTop.classList.remove('visible');
                if (scrollBottom > 100) {
                    addNodeBottom.classList.add('visible');
                } else {
                    addNodeBottom.classList.remove('visible');
                }
            } else {
                addNodeBottom.classList.remove('visible');
                if (scrollTop > 100) {
                    addNodeTop.classList.add('visible');
                } else {
                    addNodeTop.classList.remove('visible');
                }
            }
        }
    }

    // Remove existing listener if any to prevent duplicates
    if (scrollContainer._scrollListener) {
        scrollContainer.removeEventListener('scroll', scrollContainer._scrollListener);
    }

    // Store reference to listener for cleanup
    scrollContainer._scrollListener = updateFloatingButtons;

    // Attach scroll listener
    scrollContainer.addEventListener('scroll', updateFloatingButtons);

    // Initial check (will be followed by another check after full initialization)
    setTimeout(updateFloatingButtons, 100);

    // Re-check on window resize
    window.addEventListener('resize', updateFloatingButtons);
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
        <!-- Node Details -->
        <div class="border-bottom pb-3 mb-3">
            <h6 class="text-uppercase fw-semibold small text-secondary mb-3">Node Details</h6>

            <div class="row g-3 mb-3">
                <div class="col-md-6">
                    <label class="form-label">Node ID</label>
                    <input type="text" class="form-control form-control-sm" value="${step.id || ''}"
                           onchange="updateStep(${index}, 'id', this.value || undefined)" placeholder="uniqueNodeId">
                    <div class="form-text">Unique identifier for named response references: {{ .responses.nodeId.field }}</div>
                </div>
                <div class="col-md-6">
                    <label class="form-label">Node Name</label>
                    <input type="text" class="form-control form-control-sm" value="${step.name || ''}"
                           onchange="updateStep(${index}, 'name', this.value)" placeholder="Describe this node">
                </div>
            </div>

            ${index > 0 ? `
            <div class="mb-3">
                <label class="form-label">Conditions</label>
                <div id="conditionsList_${index}" class="mb-2">
                    ${renderConditionsList(step.conditions || [], index)}
                </div>
                <button class="btn btn-outline-secondary btn-sm" onclick="addCondition(${index})">
                    <i class="bi bi-plus"></i> Add Condition
                </button>
                <div class="form-text">Execute this node only if ALL conditions are met (AND logic). Conditions can check step responses, variables, or user input.</div>
            </div>
            ` : ''}

            <div class="mb-3">
                <label class="form-label">User Input Prompts</label>
                <div id="promptsList_${index}">
                    ${renderPromptsList(step.userPrompts || {}, index)}
                </div>
                <button class="btn btn-outline-secondary btn-sm mt-2" onclick="addPrompt(${index})">
                    <i class="bi bi-plus"></i> Add Prompt
                </button>
                <div class="form-text">Collect user input before executing this node</div>
            </div>
        </div>

        <!-- Request Details -->
        <div class="border-bottom pb-3 mb-3">
            <h6 class="text-uppercase fw-semibold small text-secondary mb-3">Request Details</h6>

            <div class="row g-3 mb-3">
                <div class="col-md-4">
                    <label class="form-label">HTTP Method</label>
                    <select class="form-select form-select-sm" id="methodSelect_${index}" onchange="toggleBodyVisibility(${index}, this.value); updateStepAsync(${index}, 'method', this.value);">
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
                        Skip default headers (use only node headers)
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
                    ${step.skipDefaultHeaders === true ? 'Skip mode: Only node headers will be sent' : 'Merge mode: Node headers are merged with defaults'}
                </div>
            </div>

            <div class="mb-3" id="bodySection_${index}">
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
                <div class="form-text">Opens URL in browser after node executes (useful for OAuth flows)</div>
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
                        Skip default validations (use only node validations)
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
                    ${step.skipDefaultValidations === true ? 'Skip mode: Only node validations will be performed' : 'Merge mode: Node validations are concatenated with defaults'}
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

/**
 * Update a step's draggable state and visual appearance
 * @param {number} index - Step index
 * @param {boolean} isDraggable - Whether the step should be draggable
 */
function updateStepDraggableState(index, isDraggable) {
    const stepsAccordion = document.getElementById('stepsAccordion');
    if (!stepsAccordion) return;

    const stepItems = stepsAccordion.querySelectorAll('.accordion-item');
    const stepItem = stepItems[index];
    if (!stepItem) return;

    // Update draggable attribute
    stepItem.setAttribute('draggable', isDraggable);

    // Update drag handle appearance
    const dragHandle = stepItem.querySelector('.drag-handle');
    if (dragHandle) {
        if (isDraggable) {
            dragHandle.classList.remove('drag-handle-disabled');
            dragHandle.setAttribute('title', 'Drag to reorder');
        } else {
            dragHandle.classList.add('drag-handle-disabled');
            dragHandle.setAttribute('title', 'Close node to enable dragging');
        }
    }

    // Update data attribute
    if (isDraggable) {
        stepItem.removeAttribute('data-drag-disabled');
    } else {
        stepItem.setAttribute('data-drag-disabled', 'true');
    }
}

/**
 * Toggle body section visibility based on HTTP method
 * Methods that don't support body: GET, HEAD, DELETE
 * @param {number} index - Step index
 * @param {string} method - HTTP method
 */
function toggleBodyVisibility(index, method) {
    const bodySection = document.getElementById(`bodySection_${index}`);
    if (!bodySection) return;

    // Methods that don't support request body
    const methodsWithoutBody = ['GET', 'HEAD', 'DELETE'];
    const shouldHide = methodsWithoutBody.includes(method?.toUpperCase());

    bodySection.style.display = shouldHide ? 'none' : 'block';
}

/**
 * Update step asynchronously to avoid blocking UI
 * @param {number} index - Step index
 * @param {string} field - Field name
 * @param {*} value - New value
 */
function updateStepAsync(index, field, value) {
    // Update immediately without triggering preview
    if (!config.nodes || !config.nodes[index]) return;
    config.nodes[index][field] = value;
    saveToLocalStorage();

    // Update badge immediately if method changed
    if (field === 'method') {
        const stepsAccordion = document.getElementById('stepsAccordion');
        const stepItem = stepsAccordion?.querySelectorAll('.accordion-item')[index];
        const badge = stepItem?.querySelector('.badge');
        if (badge) {
            // Update badge text
            badge.textContent = value || 'GET';
            // Update badge class
            badge.className = `badge ${getMethodBadgeClass(value)} ms-2`;
        }
        // Update step border color class (preserve existing classes)
        if (stepItem) {
            // Remove old method class and add new one
            Array.from(stepItem.classList).forEach(cls => {
                if (cls.startsWith('step-method-')) {
                    stepItem.classList.remove(cls);
                }
            });
            stepItem.classList.add(`step-method-${(value || 'GET').toLowerCase()}`);
        }
    }

    // Defer preview update to next tick to avoid blocking
    setTimeout(() => {
        updatePreview();
    }, 0);
}

// Export functions to global scope for onclick handlers
window.toggleSection = toggleSection;
window.updateConfig = updateConfig;
window.updateGlobalVariable = updateGlobalVariable;
window.addGlobalVariable = addGlobalVariable;
window.removeGlobalVariable = removeGlobalVariable;
window.updateStepDraggableState = updateStepDraggableState;
window.toggleBodyVisibility = toggleBodyVisibility;
window.updateStepAsync = updateStepAsync;
