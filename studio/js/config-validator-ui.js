/**
 * Config Validator UI
 * Handles validation of FlowSphere configs and displays results
 */

/**
 * Validate the current config
 * @param {boolean} silent - If true, only show indicator, don't open modal
 */
async function validateConfig(silent = false) {
    // Get current config from global state (config is a global let variable from state.js)
    if (!config) {
        // No config loaded at all - don't show error, just skip validation
        console.log('[Validator] No config loaded, skipping validation');
        return;
    }

    try {
        // Send validation request to server
        // Let the server-side validator do all the checks (including empty nodes check)
        const response = await fetch('/api/validate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ config: config })
        });

        if (!response.ok) {
            throw new Error(`Validation request failed: ${response.statusText}`);
        }

        const result = await response.json();

        if (silent) {
            showValidationIndicator(result);
        } else {
            showConfigValidationResults(result);
        }

    } catch (error) {
        console.error('Validation error:', error);
        const errorResult = {
            valid: false,
            errors: [{
                field: 'system',
                message: `Failed to validate config: ${error.message}`,
                type: 'error'
            }]
        };

        if (silent) {
            showValidationIndicator(errorResult);
        } else {
            showConfigValidationResults(errorResult);
        }
    }
}

/**
 * Show validation indicator badge (non-intrusive)
 */
function showValidationIndicator(result) {
    const validateBtn = document.getElementById('validateConfigBtn');
    if (!validateBtn) return;

    // Remove any existing badge
    const existingBadge = validateBtn.querySelector('.validation-badge');
    if (existingBadge) {
        existingBadge.remove();
    }

    // Add new badge
    const badge = document.createElement('span');
    badge.className = 'validation-badge position-absolute top-0 start-100 translate-middle badge rounded-pill';
    badge.style.fontSize = '0.7rem';
    badge.style.padding = '0.25em 0.5em';

    if (result.valid) {
        badge.className += ' bg-success';
        badge.textContent = '✓';
        badge.title = 'Config is valid';
    } else {
        badge.className += ' bg-danger';
        badge.textContent = result.errors.length;
        badge.title = `${result.errors.length} validation error${result.errors.length !== 1 ? 's' : ''}`;
    }

    // Make the button position relative for badge positioning
    validateBtn.style.position = 'relative';
    validateBtn.appendChild(badge);

    // Auto-remove badge after 5 seconds
    setTimeout(() => {
        if (badge.parentNode) {
            badge.remove();
        }
    }, 5000);
}

/**
 * Show config validation results in modal
 */
function showConfigValidationResults(result) {
    const modal = new bootstrap.Modal(document.getElementById('validationModal'));
    const titleEl = document.getElementById('validationModalTitle');
    const subtitleEl = document.getElementById('validationModalSubtitle');
    const resultsEl = document.getElementById('validationResults');

    if (result.valid) {
        // Success
        titleEl.textContent = 'Config Validation Passed';
        titleEl.className = 'modal-title text-success';
        subtitleEl.textContent = 'Your configuration is valid and ready to execute';

        const nodeCount = config && config.nodes ? config.nodes.length : 0;
        resultsEl.innerHTML = `
            <div class="alert alert-success d-flex align-items-start gap-3" role="alert">
                <i class="bi bi-check-circle-fill fs-4"></i>
                <div class="flex-grow-1">
                    <h6 class="alert-heading mb-2">Validation Successful</h6>
                    <p class="mb-0">
                        All ${nodeCount} node${nodeCount !== 1 ? 's' : ''} have been validated successfully.
                        Your configuration is properly structured and ready for execution.
                    </p>
                </div>
            </div>
        `;
    } else {
        // Errors found
        titleEl.textContent = 'Config Validation Failed';
        titleEl.className = 'modal-title text-danger';
        subtitleEl.textContent = `Found ${result.errors.length} error${result.errors.length !== 1 ? 's' : ''} in your configuration`;

        const errorsHtml = result.errors.map((error, index) => {
            const errorNum = index + 1;
            let nodeInfo = '';

            if (error.nodeId && error.nodeIndex !== undefined) {
                nodeInfo = `
                    <div class="mb-2">
                        <strong>Node:</strong> "${escapeHtml(error.nodeId)}" <span class="text-muted">(nodes[${error.nodeIndex}])</span>
                    </div>
                `;
            }

            let suggestionHtml = '';
            if (error.suggestion) {
                suggestionHtml = `
                    <div class="mt-2 pt-2 border-top">
                        <i class="bi bi-lightbulb text-warning me-1"></i>
                        <strong>Fix:</strong> ${escapeHtml(error.suggestion)}
                    </div>
                `;
            }

            return `
                <div class="card mb-3">
                    <div class="card-body">
                        <h6 class="card-title text-danger mb-3">
                            <i class="bi bi-exclamation-triangle-fill me-2"></i>
                            Error ${errorNum}
                        </h6>
                        ${nodeInfo}
                        <div class="mb-2">
                            <strong>Field:</strong> <code>${escapeHtml(error.field)}</code>
                        </div>
                        <div class="mb-2">
                            <strong>Issue:</strong> ${escapeHtml(error.message)}
                        </div>
                        ${suggestionHtml}
                    </div>
                </div>
            `;
        }).join('');

        resultsEl.innerHTML = `
            <div class="alert alert-danger d-flex align-items-start gap-3 mb-3" role="alert">
                <i class="bi bi-exclamation-triangle-fill fs-4"></i>
                <div class="flex-grow-1">
                    <h6 class="alert-heading mb-2">Validation Failed</h6>
                    <p class="mb-0">
                        Your configuration has ${result.errors.length} error${result.errors.length !== 1 ? 's' : ''} that need to be fixed before execution.
                        Review the details below to resolve the issues.
                    </p>
                </div>
            </div>
            <div class="validation-errors">
                ${errorsHtml}
            </div>
        `;
    }

    modal.show();
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
