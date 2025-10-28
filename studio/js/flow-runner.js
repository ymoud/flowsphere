/**
 * Flow Runner Module
 * Handles execution of flow sequences via the /api/execute-stream endpoint
 */

// Store the last execution log and result for saving
let lastExecutionLog = null;
let lastExecutionResult = null;

/**
 * Update Run Sequence button visibility based on config state
 * Should be called whenever the config changes
 */
function updateRunSequenceButton() {
    const btn = document.getElementById('runSequenceBtn');
    if (!btn) return;

    // Show button only if there are nodes in the config
    const hasNodes = config && config.nodes && config.nodes.length > 0;
    btn.style.display = hasNodes ? 'inline-block' : 'none';
}

/**
 * Run the current sequence configuration with real-time streaming
 */
async function runSequence() {
    try {
        // Get current config from state
        const config = getCurrentConfig();

        if (!config || !config.nodes || config.nodes.length === 0) {
            showAlert('error', 'No nodes to execute. Please add at least one node to your configuration.');
            return;
        }

        // Hide post-execution buttons
        hidePostExecutionButtons();

        // Show loading state
        showRunningState(true);

        // Open modal immediately with loading state
        showLoadingModal(config.nodes.length);

        // Use streaming API endpoint
        const response = await fetch('/api/execute-stream', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                config: config,
                options: {
                    startStep: 0,
                    enableDebug: false
                }
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Read the streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        let totalSteps = 0;
        let currentStep = 0;
        const steps = [];
        const pendingSteps = new Map(); // Track steps waiting for completion

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // Decode chunk and add to buffer
            buffer += decoder.decode(value, { stream: true });

            // Process complete events (separated by \n\n)
            const events = buffer.split('\n\n');
            buffer = events.pop() || ''; // Keep incomplete event in buffer

            for (const eventText of events) {
                if (!eventText.trim()) continue;

                const lines = eventText.split('\n');
                let eventType = '';
                let eventData = '';

                for (const line of lines) {
                    if (line.startsWith('event: ')) {
                        eventType = line.substring(7);
                    } else if (line.startsWith('data: ')) {
                        eventData = line.substring(6);
                    }
                }

                if (!eventType || !eventData) continue;

                const data = JSON.parse(eventData);

                // Handle different event types
                if (eventType === 'start') {
                    totalSteps = data.totalSteps;
                    updateModalWithFlowStarted(totalSteps);
                } else if (eventType === 'step_start') {
                    // Step execution started - set timeout to show placeholder after 0.8s
                    const timeoutId = setTimeout(() => {
                        currentStep++;
                        showStepPlaceholder(data, currentStep, totalSteps);
                        pendingSteps.set(data.step, { placeholderShown: true, stepNumber: currentStep });
                    }, 800);

                    // Store timeout so we can clear it if step completes quickly
                    pendingSteps.set(data.step, { timeoutId, placeholderShown: false });
                } else if (eventType === 'input_required') {
                    // Show a clickable placeholder instead of immediately showing modal
                    // This allows user to complete previous step (e.g., OAuth flow in browser)

                    // Show placeholder with "click to provide input" message
                    // Use data.step as the unique ID (not currentStep, to avoid double-counting)
                    await showInputPendingPlaceholder(data, data.step, totalSteps);

                    // Wait for user to click and provide input
                    const userInput = await collectUserInputForStep(data);
                    if (userInput === null) {
                        // User cancelled - abort execution
                        reader.cancel();
                        showRunningState(false);
                        showAlert('warning', 'Execution cancelled by user');
                        return;
                    }

                    // Remove the placeholder
                    removeInputPendingPlaceholder(data.step);

                    // Send input back to server
                    await fetch('/api/provide-input', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            executionId: data.executionId,
                            stepIndex: data.stepIndex,
                            userInput: userInput
                        })
                    });
                } else if (eventType === 'step') {
                    // Check if we have a pending step
                    const pending = pendingSteps.get(data.step);

                    if (pending) {
                        // Clear timeout if step completed quickly
                        if (pending.timeoutId) {
                            clearTimeout(pending.timeoutId);
                        }

                        if (pending.placeholderShown) {
                            // Replace placeholder with actual result
                            replaceStepPlaceholder(data, pending.stepNumber, totalSteps);
                        } else {
                            // No placeholder was shown - add step normally
                            currentStep++;
                            steps.push(data);
                            updateModalWithStep(data, currentStep, totalSteps);
                        }

                        pendingSteps.delete(data.step);
                    } else {
                        // No pending step (shouldn't happen, but handle gracefully)
                        currentStep++;
                        steps.push(data);
                        updateModalWithStep(data, currentStep, totalSteps);
                    }

                    // Handle browser launch if step succeeded
                    if (data.status === 'completed' && data.launchBrowser && data.response) {
                        handleBrowserLaunch(data);
                    }
                } else if (eventType === 'end') {
                    // Flow completed
                    lastExecutionLog = data.executionLog || [];
                    lastExecutionResult = data; // Store full execution result with metadata
                    updateModalWithSummary(data);
                    showRunningState(false);
                    showPostExecutionButtons();
                } else if (eventType === 'error') {
                    showExecutionError(new Error(data.message));
                    showRunningState(false);
                }
            }
        }

    } catch (error) {
        showRunningState(false);
        showExecutionError(error);
        console.error('Execution error:', error);
    }
}

/**
 * Get current configuration from state
 */
function getCurrentConfig() {
    // Use the existing config object
    return config;
}

/**
 * Show/hide running state - with Flow branding
 */
function showRunningState(isRunning) {
    const btn = document.getElementById('runSequenceBtn');
    if (btn) {
        btn.disabled = isRunning;
        if (isRunning) {
            btn.innerHTML = '<i class="bi bi-water"></i> <em>Flow</em> in Motion';
        } else {
            btn.innerHTML = '<i class="bi bi-water"></i> Go with the <em>Flow</em>';
        }
    }
}

/**
 * Show loading modal immediately - with Flow branding
 */
function showLoadingModal(totalSteps) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('resultsModal');
    if (!modal) {
        createResultsModal();
        modal = document.getElementById('resultsModal');
    }

    // Update modal title with animated icon
    const modalTitle = document.getElementById('resultsModalLabel');
    if (modalTitle) {
        modalTitle.innerHTML = '<i class="bi bi-activity me-2 flow-pulse"></i>Flow in Motion';
    }

    const modalBody = document.getElementById('resultsModalBody');
    modalBody.innerHTML = `
        <div class="text-center py-3 mb-3" id="flowLoadingState">
            <div class="spinner-border text-primary mb-3" role="status" style="width: 3rem; height: 3rem;">
                <span class="visually-hidden">Loading...</span>
            </div>
            <h5>Preparing the <em>Flow</em>...</h5>
            <p class="text-muted">Getting ready to execute ${totalSteps} step${totalSteps !== 1 ? 's' : ''}.</p>
        </div>
        <div id="flowStepsContainer" class="execution-log"></div>
    `;

    // Show modal
    const bootstrapModal = bootstrap.Modal.getOrCreateInstance(modal);
    bootstrapModal.show();
}

/**
 * Update modal when flow starts
 */
function updateModalWithFlowStarted(totalSteps) {
    const loadingState = document.getElementById('flowLoadingState');
    if (loadingState) {
        loadingState.innerHTML = `
            <div class="alert alert-info d-flex align-items-center gap-2 mb-0">
                <div class="spinner-border spinner-border-sm" role="status">
                    <span class="visually-hidden">Running...</span>
                </div>
                <div>
                    <strong><em>Flow</em> is running...</strong>
                    <div class="small">Executing ${totalSteps} step${totalSteps !== 1 ? 's' : ''} in sequence</div>
                </div>
            </div>
        `;
    }
}

/**
 * Update modal with a new step result in real-time - CLI-like format
 */
function updateModalWithStep(stepData, currentStep, totalSteps) {
    const container = document.getElementById('flowStepsContainer');
    if (!container) return;

    const statusClass = stepData.status === 'completed' ? 'success' :
                      stepData.status === 'skipped' ? 'warning' : 'danger';
    const statusIcon = stepData.status === 'completed' ? '✅' :
                     stepData.status === 'skipped' ? '⊘' : '❌';

    // CLI-like compact format: Step 1: GET url ✅ Status 200 OK (0.123s)
    const statusText = stepData.response ?
        `Status ${stepData.response.status} ${stepData.response.statusText || ''}` :
        stepData.status.toUpperCase();

    // Display URL with substitution highlighting
    const displayUrl = highlightSubstitutionsInText(stepData.url, stepData.substitutions);

    // Build validation lines (one per validation, like CLI)
    let validationLines = '';
    if (stepData.validations && stepData.validations.length > 0) {
        const validationParts = stepData.validations.map(v => {
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
                // Truncate very long values
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

        validationLines = validationParts.join('');
    }

    // Determine if step should be expandable
    const hasDetails = stepData.request || stepData.response || stepData.skipReason || stepData.error;

    const stepHtml = `
        <div class="step-card-animated mb-2" id="step-${currentStep}">
            <div class="d-flex align-items-center gap-2 py-2 px-3 bg-${statusClass} bg-opacity-10 border border-${statusClass} rounded cli-step-line ${hasDetails ? 'cli-step-clickable' : ''}"
                 ${hasDetails ? `
                    role="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#details${currentStep}"
                    aria-expanded="false"
                    aria-controls="details${currentStep}"
                 ` : ''}>
                <span>${statusIcon}</span>
                <span class="text-muted small">${stepData.method}</span>
                <span class="flex-grow-1 small text-truncate" title="${escapeHtml(stepData.url)}">${displayUrl}</span>
                <span class="text-${statusClass} small fw-semibold">${statusText}</span>
                <span class="text-muted small">(${stepData.duration ? stepData.duration + 's' : '-'})</span>
                ${hasDetails ? `
                    <i class="bi bi-chevron-down ms-2"></i>
                ` : ''}
            </div>
            ${validationLines}
            ${hasDetails ? `
                <div class="collapse" id="details${currentStep}">
                    <div class="card card-body mt-1 p-2">
                        ${stepData.name ? `<div class="fw-bold text-primary mb-2 pb-2 border-bottom"><i class="bi bi-tag me-1"></i>${escapeHtml(stepData.name)}</div>` : ''}
                        <div class="accordion accordion-flush" id="stepAccordion${currentStep}">
                            ${stepData.request ? `
                                <div class="accordion-item">
                                    <h2 class="accordion-header">
                                        <button class="accordion-button collapsed" type="button"
                                                data-bs-toggle="collapse" data-bs-target="#request${currentStep}">
                                            <i class="bi bi-box-arrow-up-right me-2"></i> Request
                                        </button>
                                    </h2>
                                    <div id="request${currentStep}" class="accordion-collapse collapse"
                                         data-bs-parent="#stepAccordion${currentStep}">
                                        <div class="accordion-body p-0">
                                            <pre class="json-preview-code m-0 p-2 small">${highlightSubstitutionsInJSON(stepData.request, stepData.substitutions)}</pre>
                                        </div>
                                    </div>
                                </div>
                            ` : ''}
                            ${stepData.response ? `
                                <div class="accordion-item">
                                    <h2 class="accordion-header">
                                        <button class="accordion-button collapsed" type="button"
                                                data-bs-toggle="collapse" data-bs-target="#response${currentStep}">
                                            <i class="bi bi-box-arrow-in-down-right me-2"></i> Response
                                        </button>
                                    </h2>
                                    <div id="response${currentStep}" class="accordion-collapse collapse"
                                         data-bs-parent="#stepAccordion${currentStep}">
                                        <div class="accordion-body p-0">
                                            <pre class="json-preview-code m-0 p-2 small" style="max-height: 400px; overflow-y: auto;">${escapeHtml(JSON.stringify(stepData.response.body, null, 2))}</pre>
                                        </div>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                        ${stepData.skipReason ? `
                            <div class="alert alert-warning mt-2 mb-0 small">
                                <i class="bi bi-info-circle me-1"></i>
                                <strong>Skipped:</strong> ${escapeHtml(stepData.skipReason)}
                            </div>
                        ` : ''}
                        ${stepData.error && !stepData.error.includes('validation failed') ? `
                            <div class="alert alert-danger mt-2 mb-0 small">
                                <i class="bi bi-exclamation-triangle me-1"></i>
                                <strong>Error:</strong> ${escapeHtml(stepData.error)}
                            </div>
                        ` : ''}
                    </div>
                </div>
            ` : ''}
        </div>
    `;

    container.insertAdjacentHTML('beforeend', stepHtml);

    // Scroll to the new step
    const newStep = document.getElementById(`step-${currentStep}`);
    if (newStep) {
        newStep.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

/**
 * Show a placeholder for a step that's taking time to execute
 */
function showStepPlaceholder(stepData, currentStep, totalSteps) {
    const container = document.getElementById('flowStepsContainer');
    if (!container) return;

    const placeholderHtml = `
        <div class="step-card-animated mb-2" id="step-${currentStep}">
            <div class="d-flex align-items-center gap-2 py-2 px-3 bg-info bg-opacity-10 border border-info rounded">
                <div class="spinner-border spinner-border-sm text-info" role="status">
                    <span class="visually-hidden">Executing...</span>
                </div>
                <span class="text-muted small">${stepData.method}</span>
                <span class="flex-grow-1 small text-truncate" title="${escapeHtml(stepData.url)}">${escapeHtml(stepData.url)}</span>
                <span class="text-info small fw-semibold">Executing...</span>
            </div>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', placeholderHtml);

    // Scroll to placeholder
    const placeholder = document.getElementById(`step-${currentStep}`);
    if (placeholder) {
        placeholder.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

/**
 * Replace placeholder with actual step result
 */
function replaceStepPlaceholder(stepData, stepNumber, totalSteps) {
    const placeholder = document.getElementById(`step-${stepNumber}`);
    if (!placeholder) {
        // Placeholder not found, just add normally
        const container = document.getElementById('flowStepsContainer');
        if (container) {
            updateModalWithStep(stepData, stepNumber, totalSteps);
        }
        return;
    }

    // Build the actual step HTML (same as updateModalWithStep)
    const statusClass = stepData.status === 'completed' ? 'success' :
                      stepData.status === 'skipped' ? 'warning' : 'danger';
    const statusIcon = stepData.status === 'completed' ? '✅' :
                     stepData.status === 'skipped' ? '⊘' : '❌';

    const statusText = stepData.response ?
        `Status ${stepData.response.status} ${stepData.response.statusText || ''}` :
        stepData.status.toUpperCase();

    // Display URL with substitution highlighting
    const displayUrl = highlightSubstitutionsInText(stepData.url, stepData.substitutions);

    // Build validation lines
    let validationLines = '';
    if (stepData.validations && stepData.validations.length > 0) {
        const validationParts = stepData.validations.map(v => {
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

        validationLines = validationParts.join('');
    }

    const hasDetails = stepData.request || stepData.response || stepData.skipReason || stepData.error;

    const stepHtml = `
        <div class="d-flex align-items-center gap-2 py-2 px-3 bg-${statusClass} bg-opacity-10 border border-${statusClass} rounded cli-step-line ${hasDetails ? 'cli-step-clickable' : ''}"
             ${hasDetails ? `
                role="button"
                data-bs-toggle="collapse"
                data-bs-target="#details${stepNumber}"
                aria-expanded="false"
                aria-controls="details${stepNumber}"
             ` : ''}>
            <span>${statusIcon}</span>
            <span class="text-muted small">${stepData.method}</span>
            <span class="flex-grow-1 small text-truncate" title="${escapeHtml(stepData.url)}">${displayUrl}</span>
            <span class="text-${statusClass} small fw-semibold">${statusText}</span>
            <span class="text-muted small">(${stepData.duration ? stepData.duration + 's' : '-'})</span>
            ${hasDetails ? `
                <i class="bi bi-chevron-down ms-2"></i>
            ` : ''}
        </div>
        ${validationLines}
        ${hasDetails ? `
            <div class="collapse" id="details${stepNumber}">
                <div class="card card-body mt-1 p-2">
                    ${stepData.name ? `<div class="fw-bold text-primary mb-2 pb-2 border-bottom"><i class="bi bi-tag me-1"></i>${escapeHtml(stepData.name)}</div>` : ''}
                    <div class="accordion accordion-flush" id="stepAccordion${stepNumber}">
                        ${stepData.request ? `
                            <div class="accordion-item">
                                <h2 class="accordion-header">
                                    <button class="accordion-button collapsed" type="button"
                                            data-bs-toggle="collapse" data-bs-target="#request${stepNumber}">
                                        <i class="bi bi-box-arrow-up-right me-2"></i> Request
                                    </button>
                                </h2>
                                <div id="request${stepNumber}" class="accordion-collapse collapse"
                                     data-bs-parent="#stepAccordion${stepNumber}">
                                    <div class="accordion-body p-0">
                                        <pre class="json-preview-code m-0 p-2 small">${highlightSubstitutionsInJSON(stepData.request, stepData.substitutions)}</pre>
                                    </div>
                                </div>
                            </div>
                        ` : ''}
                        ${stepData.response ? `
                            <div class="accordion-item">
                                <h2 class="accordion-header">
                                    <button class="accordion-button collapsed" type="button"
                                            data-bs-toggle="collapse" data-bs-target="#response${stepNumber}">
                                        <i class="bi bi-box-arrow-in-down-right me-2"></i> Response
                                    </button>
                                </h2>
                                <div id="response${stepNumber}" class="accordion-collapse collapse"
                                     data-bs-parent="#stepAccordion${stepNumber}">
                                    <div class="accordion-body p-0">
                                        <pre class="json-preview-code m-0 p-2 small" style="max-height: 400px; overflow-y: auto;">${escapeHtml(JSON.stringify(stepData.response.body, null, 2))}</pre>
                                    </div>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    ${stepData.skipReason ? `
                        <div class="alert alert-warning mt-2 mb-0 small">
                            <i class="bi bi-info-circle me-1"></i>
                            <strong>Skipped:</strong> ${escapeHtml(stepData.skipReason)}
                        </div>
                    ` : ''}
                    ${stepData.error && !stepData.error.includes('validation failed') ? `
                        <div class="alert alert-danger mt-2 mb-0 small">
                            <i class="bi bi-exclamation-triangle me-1"></i>
                            <strong>Error:</strong> ${escapeHtml(stepData.error)}
                        </div>
                    ` : ''}
                </div>
            </div>
        ` : ''}
    `;

    // Replace placeholder content
    placeholder.innerHTML = stepHtml;
}

/**
 * Show a placeholder for a step waiting for user input
 * User must click to proceed - useful when previous step opened browser for OAuth
 */
function showInputPendingPlaceholder(stepData, stepNumber, totalSteps) {
    return new Promise((resolve) => {
        const container = document.getElementById('flowStepsContainer');
        if (!container) {
            resolve();
            return;
        }

        const placeholderHtml = `
            <div class="step-card-animated mb-2" id="step-${stepNumber}">
                <div class="d-flex align-items-center gap-2 py-3 px-3 bg-warning bg-opacity-10 border border-warning rounded cursor-pointer user-select-none"
                     role="button"
                     id="inputPendingBtn-${stepNumber}"
                     style="cursor: pointer; transition: all 0.2s;">
                    <i class="bi bi-hand-index-thumb text-warning fs-5"></i>
                    <div class="flex-grow-1">
                        <div class="fw-bold">
                            <i class="bi bi-pencil-square me-1"></i>
                            ${escapeHtml(stepData.name)}
                        </div>
                        <div class="small text-muted mt-1">
                            <i class="bi bi-info-circle me-1"></i>
                            User input required. Click here when ready to provide input.
                        </div>
                    </div>
                    <span class="badge bg-warning text-dark">Click to Continue</span>
                    <i class="bi bi-chevron-right ms-2"></i>
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', placeholderHtml);

        // Scroll to placeholder
        const placeholder = document.getElementById(`step-${stepNumber}`);
        if (placeholder) {
            placeholder.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        // Add click handler and hover effect
        const btn = document.getElementById(`inputPendingBtn-${stepNumber}`);
        if (btn) {
            // Hover effect
            btn.addEventListener('mouseenter', () => {
                btn.style.transform = 'scale(1.02)';
                btn.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.transform = 'scale(1)';
                btn.style.boxShadow = 'none';
            });

            // Click handler
            btn.addEventListener('click', () => {
                // Add visual feedback
                btn.style.opacity = '0.6';
                btn.style.pointerEvents = 'none';
                btn.style.transform = 'scale(1)';
                resolve();
            });
        } else {
            resolve();
        }
    });
}

/**
 * Remove the input pending placeholder
 */
function removeInputPendingPlaceholder(stepNumber) {
    const placeholder = document.getElementById(`step-${stepNumber}`);
    if (placeholder) {
        placeholder.remove();
    }
}

/**
 * Update modal with final summary - keeps steps visible
 */
function updateModalWithSummary(result) {
    // Update modal title to "Flow Complete"
    const modalTitle = document.getElementById('resultsModalLabel');
    if (modalTitle) {
        modalTitle.innerHTML = '<i class="bi bi-check-circle me-2"></i>Flow Complete';
    }

    const loadingState = document.getElementById('flowLoadingState');
    if (loadingState) {
        const summaryClass = result.success ? 'alert-success' : 'alert-danger';
        const summaryIcon = result.success ? '✅' : '❌';

        loadingState.innerHTML = `
            <div class="alert ${summaryClass} d-flex align-items-center gap-2 mb-0">
                <span style="font-size: 1.5rem;">${summaryIcon}</span>
                <div>
                    <strong>${result.success ? '<em>Flow</em> Completed Successfully!' : '<em>Flow</em> Failed'}</strong>
                    <div class="small text-muted">Every node executed with precision.</div>
                    <div class="small mt-1">
                        ${result.stepsExecuted} executed, ${result.stepsSkipped} skipped${result.stepsFailed > 0 ? `, ${result.stepsFailed} failed` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    // Note: flowStepsContainer already has all the steps, so we don't replace it
    // This keeps all step cards visible when the flow completes
}

/**
 * Show execution error in modal - keeps steps visible
 */
function showExecutionError(error) {
    // Update the loading state to show error, but keep steps visible
    const loadingState = document.getElementById('flowLoadingState');
    if (loadingState) {
        loadingState.innerHTML = `
            <div class="alert alert-danger d-flex align-items-center gap-2 mb-0">
                <i class="bi bi-exclamation-triangle-fill fs-3"></i>
                <div>
                    <strong><em>Flow</em> Execution Failed</strong>
                    <div class="small mt-1">${escapeHtml(error.message)}</div>
                </div>
            </div>
        `;
    }

    // If there's no loading state container, fall back to updating modal body
    // But preserve any existing steps container
    if (!loadingState) {
        const modalBody = document.getElementById('resultsModalBody');
        if (modalBody) {
            // Check if steps container exists
            const stepsContainer = document.getElementById('flowStepsContainer');
            const stepsHtml = stepsContainer ? stepsContainer.outerHTML : '';

            modalBody.innerHTML = `
                <div class="alert alert-danger d-flex align-items-center gap-2 mb-3">
                    <i class="bi bi-exclamation-triangle-fill fs-3"></i>
                    <div>
                        <strong><em>Flow</em> Execution Failed</strong>
                        <div class="small mt-1">${escapeHtml(error.message)}</div>
                    </div>
                </div>
                ${stepsHtml}
            `;
        }
    }
}

/**
 * Display execution results in the modal
 */
function displayExecutionResults(result) {
    const modalBody = document.getElementById('resultsModalBody');

    // Summary
    const summaryClass = result.success ? 'alert-success' : 'alert-danger';
    const summaryIcon = result.success ? '✅' : '❌';
    let html = `
        <div class="alert ${summaryClass} d-flex align-items-center gap-2 mb-3">
            <span style="font-size: 1.5rem;">${summaryIcon}</span>
            <div>
                <strong>${result.success ? 'Sequence Completed Successfully' : 'Sequence Failed'}</strong>
                <div class="small">
                    ${result.stepsExecuted} executed, ${result.stepsSkipped} skipped${result.stepsFailed > 0 ? `, ${result.stepsFailed} failed` : ''}
                </div>
            </div>
        </div>
    `;

    // Execution log
    if (result.executionLog && result.executionLog.length > 0) {
        html += '<div class="execution-log">';

        result.executionLog.forEach((log, index) => {
            const statusClass = log.status === 'completed' ? 'success' :
                              log.status === 'skipped' ? 'warning' : 'danger';
            const statusIcon = log.status === 'completed' ? '✅' :
                             log.status === 'skipped' ? '⊘' : '❌';

            html += `
                <div class="card mb-2">
                    <div class="card-header bg-${statusClass} bg-opacity-10 border-${statusClass}">
                        <div class="d-flex justify-content-between align-items-center">
                            <strong>${statusIcon} ${log.name ? escapeHtml(log.name) : `${log.method} ${escapeHtml(log.url)}`}</strong>
                            <small class="text-muted">${log.duration}s</small>
                        </div>
                        ${log.name ? `<div class="small text-muted mt-1">
                            ${log.method} ${escapeHtml(log.url)}
                        </div>` : ''}
                    </div>
                    <div class="card-body">
                        <div class="accordion" id="stepAccordion${index}">
            `;

            // Request details
            if (log.request) {
                html += `
                    <div class="accordion-item">
                        <h2 class="accordion-header">
                            <button class="accordion-button collapsed" type="button"
                                    data-bs-toggle="collapse" data-bs-target="#request${index}">
                                <i class="bi bi-box-arrow-up-right me-2"></i> Request
                            </button>
                        </h2>
                        <div id="request${index}" class="accordion-collapse collapse"
                             data-bs-parent="#stepAccordion${index}">
                            <div class="accordion-body p-0">
                                <pre class="json-preview-code m-0 p-3 small">${JSON.stringify(log.request, null, 2)}</pre>
                            </div>
                        </div>
                    </div>
                `;
            }

            // Response details
            if (log.response) {
                html += `
                    <div class="accordion-item">
                        <h2 class="accordion-header">
                            <button class="accordion-button" type="button"
                                    data-bs-toggle="collapse" data-bs-target="#response${index}">
                                <i class="bi bi-box-arrow-in-down-right me-2"></i> Response (Status: ${log.response.status})
                            </button>
                        </h2>
                        <div id="response${index}" class="accordion-collapse collapse show"
                             data-bs-parent="#stepAccordion${index}">
                            <div class="accordion-body p-0">
                                <pre class="json-preview-code m-0 p-3 small" style="max-height: 400px; overflow-y: auto;">${JSON.stringify(log.response.body, null, 2)}</pre>
                            </div>
                        </div>
                    </div>
                `;
            }

            // Skip reason
            if (log.skipReason) {
                html += `
                    <div class="alert alert-warning mt-2 mb-0 small">
                        <i class="bi bi-info-circle me-1"></i>
                        <strong>Skipped:</strong> ${escapeHtml(log.skipReason)}
                    </div>
                `;
            }

            // Error
            if (log.error) {
                html += `
                    <div class="alert alert-danger mt-2 mb-0 small">
                        <i class="bi bi-exclamation-triangle me-1"></i>
                        <strong>Error:</strong> ${escapeHtml(log.error)}
                    </div>
                `;
            }

            html += `
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
    }

    modalBody.innerHTML = html;
}

/**
 * Create results modal
 */
function createResultsModal() {
    const modalHtml = `
        <div class="modal fade" id="resultsModal" tabindex="-1" aria-labelledby="resultsModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-xl modal-dialog-scrollable">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="resultsModalLabel">Execution Results</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body" id="resultsModalBody">
                        <!-- Results will be inserted here -->
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-primary" id="saveLogsBtn" style="display: none;" onclick="saveLogs()">
                            <i class="bi bi-download"></i> Save Logs
                        </button>
                        <button type="button" class="btn btn-success" id="rerunBtn" style="display: none;" onclick="rerunSequence()">
                            <i class="bi bi-arrow-clockwise"></i> Go Again
                        </button>
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

/**
 * Show alert message
 */
function showAlert(type, message) {
    // Create a simple alert (can be enhanced with Bootstrap toast)
    const alertClass = type === 'error' ? 'alert-danger' :
                      type === 'success' ? 'alert-success' :
                      type === 'warning' ? 'alert-warning' : 'alert-info';

    const alertHtml = `
        <div class="alert ${alertClass} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3"
             style="z-index: 9999; max-width: 500px;" role="alert">
            ${escapeHtml(message)}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', alertHtml);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        const alerts = document.querySelectorAll('.alert');
        alerts.forEach(alert => {
            if (alert.classList.contains('show')) {
                const bsAlert = bootstrap.Alert.getInstance(alert);
                if (bsAlert) {
                    bsAlert.close();
                }
            }
        });
    }, 5000);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (typeof text !== 'string') return text;
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Get CSS class and label for substitution type
 * @param {string} type - Substitution type
 * @returns {Object} Object with typeClass and typeLabel
 */
function getSubstitutionStyle(type) {
    let typeClass = 'substitution-var';
    let typeLabel = 'Variable';

    if (type === 'dynamic-guid') {
        typeClass = 'substitution-dynamic';
        typeLabel = 'Dynamic GUID';
    } else if (type === 'dynamic-timestamp') {
        typeClass = 'substitution-dynamic';
        typeLabel = 'Dynamic Timestamp';
    } else if (type === 'response') {
        typeClass = 'substitution-response';
        typeLabel = 'Response Reference';
    } else if (type === 'input') {
        typeClass = 'substitution-input';
        typeLabel = 'User Input';
    }

    return { typeClass, typeLabel };
}

/**
 * Highlight substituted variables in plain text (like URLs)
 * @param {string} text - The text to highlight
 * @param {Array} substitutions - Array of substitution records
 * @returns {string} HTML string with highlighted values
 */
function highlightSubstitutionsInText(text, substitutions = []) {
    if (!text || substitutions.length === 0) {
        return escapeHtml(text);
    }

    // Create a map of values to their substitution info
    const valueMap = new Map();
    substitutions.forEach(sub => {
        const key = String(sub.value);
        if (!valueMap.has(key)) {
            valueMap.set(key, []);
        }
        valueMap.get(key).push(sub);
    });

    let result = text;

    // Replace each substituted value with highlighted version
    // Sort by value length (longest first) to avoid partial replacements
    const sortedValues = Array.from(valueMap.keys()).sort((a, b) => b.length - a.length);

    for (const value of sortedValues) {
        const subs = valueMap.get(value);
        const sub = subs[0]; // Use first substitution info
        const { typeClass, typeLabel } = getSubstitutionStyle(sub.type);

        // Escape value for regex
        const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedValue, 'g');

        // Create highlighted replacement
        const replacement = `<span class="json-substitution ${typeClass}" data-original="${escapeHtml(sub.original)}" data-type="${typeLabel}" title="${typeLabel}: ${escapeHtml(sub.original)}">${value}</span>`;

        result = result.replace(regex, replacement);
    }

    // Escape the remaining text (non-highlighted parts)
    const parts = result.split(/(<span[^>]*>.*?<\/span>)/);
    const escapedParts = parts.map((part, index) => {
        // Odd indices are our span tags - don't escape them
        if (index % 2 === 1) {
            return part;
        }
        // Even indices are regular text - escape them
        return escapeHtml(part);
    });

    return escapedParts.join('');
}

/**
 * Highlight substituted variables in JSON
 * @param {Object} jsonObj - The JSON object to display
 * @param {Array} substitutions - Array of substitution records
 * @returns {string} HTML string with highlighted values
 */
function highlightSubstitutionsInJSON(jsonObj, substitutions = []) {
    if (!jsonObj || substitutions.length === 0) {
        return escapeHtml(JSON.stringify(jsonObj, null, 2));
    }

    // Create a map of values to their substitution info
    const valueMap = new Map();
    substitutions.forEach(sub => {
        const key = String(sub.value);
        if (!valueMap.has(key)) {
            valueMap.set(key, []);
        }
        valueMap.get(key).push(sub);
    });

    // Convert JSON to string
    let jsonString = JSON.stringify(jsonObj, null, 2);

    // Replace each substituted value with highlighted version
    // Sort by value length (longest first) to avoid partial replacements
    const sortedValues = Array.from(valueMap.keys()).sort((a, b) => b.length - a.length);

    for (const value of sortedValues) {
        const subs = valueMap.get(value);
        const sub = subs[0]; // Use first substitution info
        const { typeClass, typeLabel } = getSubstitutionStyle(sub.type);

        // Escape value for regex
        const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Match the value when it appears as a JSON string value (between quotes)
        const regex = new RegExp(`"(${escapedValue})"`, 'g');

        // Create highlighted replacement
        const replacement = `"<span class="json-substitution ${typeClass}" data-original="${escapeHtml(sub.original)}" data-type="${typeLabel}" title="${typeLabel}: ${escapeHtml(sub.original)}">$1</span>"`;

        jsonString = jsonString.replace(regex, replacement);
    }

    // Escape the remaining text (non-highlighted parts)
    // Split by our span tags, escape each part, then rejoin
    const parts = jsonString.split(/(<span[^>]*>.*?<\/span>)/);
    const escapedParts = parts.map((part, index) => {
        // Odd indices are our span tags - don't escape them
        if (index % 2 === 1) {
            return part;
        }
        // Even indices are regular text - escape them
        return escapeHtml(part);
    });

    return escapedParts.join('');
}

/**
 * Collect user input for a single step
 * Shows a modal with prompts for the specified step only
 * @param {Object} stepData - Step data including executionId, stepIndex, step, name, and prompts
 * @returns {Object|null} - Object with user input values, or null if cancelled
 */
async function collectUserInputForStep(stepData) {
    return new Promise((resolve) => {
        // Create modal HTML
        const modalId = 'userInputModal';
        let existingModal = document.getElementById(modalId);
        if (existingModal) {
            existingModal.remove();
        }

        let formHtml = '';
        Object.entries(stepData.prompts).forEach(([key, prompt]) => {
            const inputId = `input_${key}`;
            formHtml += `
                <div class="mb-3">
                    <label for="${inputId}" class="form-label">
                        ${escapeHtml(prompt)}
                    </label>
                    <input type="text" class="form-control" id="${inputId}"
                           data-prompt-key="${key}"
                           placeholder="Enter ${escapeHtml(key)}"
                           required>
                </div>
            `;
        });

        const modalHtml = `
            <div class="modal fade" id="${modalId}" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header bg-primary bg-opacity-10">
                            <h5 class="modal-title">
                                <i class="bi bi-pencil-square me-2"></i>
                                User Input Required
                            </h5>
                        </div>
                        <div class="modal-body">
                            <div class="alert alert-info mb-3">
                                <i class="bi bi-info-circle me-2"></i>
                                <strong>${escapeHtml(stepData.name)}</strong>
                            </div>
                            <form id="userInputForm">
                                ${formHtml}
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" id="cancelUserInputBtn">
                                <i class="bi bi-x-circle me-1"></i>
                                Cancel Execution
                            </button>
                            <button type="button" class="btn btn-primary" id="submitUserInputBtn">
                                <i class="bi bi-check-circle me-1"></i>
                                Continue
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modal = document.getElementById(modalId);
        const bootstrapModal = new bootstrap.Modal(modal);

        // Handle cancel
        document.getElementById('cancelUserInputBtn').addEventListener('click', () => {
            bootstrapModal.hide();
            modal.addEventListener('hidden.bs.modal', () => {
                modal.remove();
                resolve(null);
            }, { once: true });
        });

        // Handle submit
        document.getElementById('submitUserInputBtn').addEventListener('click', () => {
            // Collect input values
            const userInput = {};
            const inputs = document.querySelectorAll('#userInputForm input');

            inputs.forEach(input => {
                const promptKey = input.dataset.promptKey;
                const value = input.value.trim();
                userInput[promptKey] = value;
            });

            bootstrapModal.hide();
            modal.addEventListener('hidden.bs.modal', () => {
                modal.remove();
                resolve(userInput);
            }, { once: true });
        });

        // Show modal
        bootstrapModal.show();

        // Focus first input
        modal.addEventListener('shown.bs.modal', () => {
            const firstInput = modal.querySelector('input');
            if (firstInput) {
                firstInput.focus();
            }
        }, { once: true });

        // Handle Enter key to submit
        modal.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('submitUserInputBtn').click();
            }
        });
    });
}

/**
 * Handle browser launch for a step
 * Opens URL in a modal with iframe
 * @param {Object} stepData - The step data containing response and launchBrowser config
 */
function handleBrowserLaunch(stepData) {
    try {
        console.log('Browser launch requested:', stepData.launchBrowser);
        console.log('Response body:', stepData.response.body);

        // Extract URL from response using launchBrowser path
        const url = extractValueFromPath(stepData.response.body, stepData.launchBrowser);

        console.log('Extracted URL:', url);

        if (!url) {
            showAlert('warning', `Browser launch failed: Could not extract URL from path "${stepData.launchBrowser}"`);
            return;
        }

        if (typeof url !== 'string') {
            showAlert('warning', `Browser launch failed: Extracted value is not a string (got ${typeof url})`);
            return;
        }

        // Validate URL format
        let fullUrl = url;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            // Try adding https:// if missing
            fullUrl = 'https://' + url;
            console.log('Added https:// protocol, full URL:', fullUrl);
        }

        console.log('Opening URL in modal iframe:', fullUrl);

        // Create or get browser modal
        let modal = document.getElementById('browserLaunchModal');
        if (!modal) {
            const modalHtml = `
                <div class="modal fade" id="browserLaunchModal" tabindex="-1" aria-labelledby="browserLaunchModalLabel" aria-hidden="true">
                    <div class="modal-dialog modal-xl modal-fullscreen-lg-down">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="browserLaunchModalLabel">
                                    <i class="bi bi-window me-2"></i>
                                    <span id="browserLaunchModalTitle">Browser View</span>
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body p-0" style="height: 80vh;">
                                <div id="browserIframeContainer" style="width: 100%; height: 100%; position: relative;">
                                    <div class="d-flex justify-content-center align-items-center" style="height: 100%;">
                                        <div class="spinner-border text-primary" role="status">
                                            <span class="visually-hidden">Loading...</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <a id="browserLaunchExternalLink" href="" target="_blank" class="btn btn-sm btn-outline-primary me-auto">
                                    <i class="bi bi-box-arrow-up-right me-1"></i>
                                    Open in New Tab
                                </a>
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            modal = document.getElementById('browserLaunchModal');
        }

        // Update modal content
        const modalTitle = document.getElementById('browserLaunchModalTitle');
        const iframeContainer = document.getElementById('browserIframeContainer');
        const externalLink = document.getElementById('browserLaunchExternalLink');

        // Truncate URL for display
        const displayUrl = url.length > 60 ? url.substring(0, 57) + '...' : url;
        modalTitle.textContent = displayUrl;
        externalLink.href = fullUrl;

        // Create iframe with loading spinner
        iframeContainer.innerHTML = `
            <div class="position-absolute top-50 start-50 translate-middle text-center" id="iframeSpinner" style="max-width: 400px;">
                <div class="spinner-border text-primary mb-3" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <div class="small text-muted">Loading page...</div>
                <div class="small text-muted mt-2">If page doesn't load, click "Open in New Tab" below</div>
            </div>
            <iframe
                id="browserIframe"
                src="${escapeHtml(fullUrl)}"
                style="width: 100%; height: 100%; border: none; display: none;"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
                referrerpolicy="no-referrer"
            ></iframe>
        `;

        // Handle iframe load
        const iframe = document.getElementById('browserIframe');
        const spinner = document.getElementById('iframeSpinner');
        let loadTimeout;

        // Set timeout to detect if iframe doesn't load (X-Frame-Options, CSP, etc.)
        loadTimeout = setTimeout(() => {
            // If spinner still exists after 3 seconds, assume iframe is blocked
            if (spinner && spinner.parentNode) {
                spinner.innerHTML = `
                    <div class="alert alert-warning text-start">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        <strong>Cannot display page in iframe</strong><br>
                        <small class="d-block mt-2">
                            This website prevents embedding for security reasons (X-Frame-Options or CSP policy).
                        </small>
                        <button class="btn btn-primary btn-sm mt-3" onclick="document.getElementById('browserLaunchExternalLink').click()">
                            <i class="bi bi-box-arrow-up-right me-1"></i>
                            Open in New Tab
                        </button>
                    </div>
                `;
            }
        }, 3000);

        iframe.onload = () => {
            clearTimeout(loadTimeout);
            // Check if iframe loaded successfully by trying to access it
            try {
                // If we can access contentWindow, iframe loaded
                if (iframe.contentWindow) {
                    if (spinner) spinner.remove();
                    iframe.style.display = 'block';
                }
            } catch (e) {
                // Cross-origin iframe, but it loaded
                if (spinner) spinner.remove();
                iframe.style.display = 'block';
            }
        };

        // Handle iframe error
        iframe.onerror = () => {
            clearTimeout(loadTimeout);
            if (spinner) {
                spinner.innerHTML = `
                    <div class="alert alert-danger text-start">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        <strong>Failed to load page</strong><br>
                        <small class="d-block mt-2">
                            The page could not be loaded. This may be due to network issues or security restrictions.
                        </small>
                        <button class="btn btn-primary btn-sm mt-3" onclick="document.getElementById('browserLaunchExternalLink').click()">
                            <i class="bi bi-box-arrow-up-right me-1"></i>
                            Open in New Tab
                        </button>
                    </div>
                `;
            }
        };

        // Show modal
        const bootstrapModal = bootstrap.Modal.getOrCreateInstance(modal);
        bootstrapModal.show();

    } catch (error) {
        console.error('Browser launch error:', error);
        showAlert('error', `Failed to launch browser: ${error.message}`);
    }
}

/**
 * Extract value from object using JSON path notation
 * Supports: .field, .field.subfield, .array[0], .array[0].field
 * @param {Object} obj - The object to extract from
 * @param {string} path - The JSON path (e.g., ".token", ".user.id", ".items[0].name")
 * @returns {*} - The extracted value or null if not found
 */
function extractValueFromPath(obj, path) {
    if (!obj || !path) return null;

    // Remove leading dot if present
    let cleanPath = path.startsWith('.') ? path.substring(1) : path;

    // Split by dots, but handle array notation
    const parts = cleanPath.split(/\.(?![^\[]*\])/);

    let current = obj;
    for (const part of parts) {
        if (!current) return null;

        // Handle array notation: items[0]
        const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
        if (arrayMatch) {
            const [, arrayName, index] = arrayMatch;
            current = current[arrayName];
            if (Array.isArray(current)) {
                current = current[parseInt(index)];
            } else {
                return null;
            }
        } else {
            current = current[part];
        }
    }

    return current;
}

/**
 * Show Save Logs and Re-run buttons after execution completes
 */
function showPostExecutionButtons() {
    const saveLogsBtn = document.getElementById('saveLogsBtn');
    const rerunBtn = document.getElementById('rerunBtn');

    if (saveLogsBtn) saveLogsBtn.style.display = 'inline-block';
    if (rerunBtn) rerunBtn.style.display = 'inline-block';
}

/**
 * Hide post-execution buttons (when starting new run)
 */
function hidePostExecutionButtons() {
    const saveLogsBtn = document.getElementById('saveLogsBtn');
    const rerunBtn = document.getElementById('rerunBtn');

    if (saveLogsBtn) saveLogsBtn.style.display = 'none';
    if (rerunBtn) rerunBtn.style.display = 'none';
}

/**
 * Save execution logs using the API (uses existing logger module)
 * Also triggers browser download of the log file
 */
async function saveLogs() {
    if (!lastExecutionLog || lastExecutionLog.length === 0) {
        showAlert('warning', 'No execution logs available to save.');
        return;
    }

    try {
        // Save to server using API (with full execution result for metadata)
        const response = await fetch('/api/save-log', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                executionLog: lastExecutionLog,
                executionResult: lastExecutionResult || {}
            })
        });

        const result = await response.json();

        if (result.success) {
            // Download the formatted log (server returns the formatted content)
            if (result.logContent) {
                const blob = new Blob([result.logContent], { type: 'application/json' });
                const url = URL.createObjectURL(blob);

                // Create temporary anchor and click it
                const a = document.createElement('a');
                a.href = url;
                a.download = result.filename;
                document.body.appendChild(a);
                a.click();

                // Clean up
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                showAlert('success', `Logs downloaded as: ${result.filename}`);
            } else {
                showAlert('success', `Logs saved to server: ${result.filename}`);
            }
        } else {
            showAlert('error', `Failed to save logs: ${result.error}`);
        }
    } catch (error) {
        showAlert('error', `Failed to save logs: ${error.message}`);
    }
}

/**
 * Re-run the current sequence
 */
function rerunSequence() {
    // Close the modal
    const modal = document.getElementById('resultsModal');
    if (modal) {
        const bootstrapModal = bootstrap.Modal.getInstance(modal);
        if (bootstrapModal) {
            bootstrapModal.hide();
        }
    }

    // Small delay to let modal close, then run again
    setTimeout(() => {
        runSequence();
    }, 300);
}
