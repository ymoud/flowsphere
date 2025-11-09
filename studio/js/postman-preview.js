/**
 * Postman Import Preview
 * Handles preview modal for Postman collection imports
 */

// Store the parsed config temporarily
let pendingPostmanConfig = null;
let previewModalInstance = null;

/**
 * Show Postman import preview modal with parsed config
 * @param {Object} parsedConfig - The generated FlowSphere config
 */
function showPostmanPreview(parsedConfig) {
    pendingPostmanConfig = parsedConfig;

    // Populate preview content
    populatePreviewSummary(parsedConfig);
    populatePreviewNodes(parsedConfig.nodes || []);
    populatePreviewVariables(parsedConfig.variables || {});
    populatePreviewAuth(parsedConfig.defaults?.headers || {});
    populatePreviewValidations(parsedConfig.nodes || []);

    // Show modal
    const modalElement = document.getElementById('postmanPreviewModal');
    if (modalElement) {
        previewModalInstance = new bootstrap.Modal(modalElement, {
            backdrop: 'static',
            keyboard: false
        });
        previewModalInstance.show();
    }
}

/**
 * Populate summary section
 */
function populatePreviewSummary(parsedConfig) {
    const summaryDiv = document.getElementById('postmanPreviewSummary');
    if (!summaryDiv) return;

    const nodesCount = parsedConfig.nodes?.length || 0;
    const variablesCount = parsedConfig.variables ? Object.keys(parsedConfig.variables).length : 0;
    const hasAuth = parsedConfig.defaults?.headers?.Authorization ? true : false;

    let html = `
        <div class="row g-2">
            <div class="col-auto">
                <strong>${nodesCount}</strong> node${nodesCount !== 1 ? 's' : ''}
            </div>
    `;

    if (variablesCount > 0) {
        html += `
            <div class="col-auto text-muted">•</div>
            <div class="col-auto">
                <strong>${variablesCount}</strong> variable${variablesCount !== 1 ? 's' : ''}
            </div>
        `;
    }

    if (hasAuth) {
        html += `
            <div class="col-auto text-muted">•</div>
            <div class="col-auto">
                <i class="bi bi-shield-check text-warning"></i> Auth configured
            </div>
        `;
    }

    if (parsedConfig.defaults?.baseUrl) {
        html += `
            <div class="col-auto text-muted">•</div>
            <div class="col-auto">
                Base URL: <code class="small">${escapeHtml(parsedConfig.defaults.baseUrl)}</code>
            </div>
        `;
    }

    html += `</div>`;
    summaryDiv.innerHTML = html;
}

/**
 * Populate nodes section
 */
function populatePreviewNodes(nodes) {
    const nodesDiv = document.getElementById('postmanPreviewNodes');
    const badge = document.getElementById('nodesCountBadge');

    if (!nodesDiv) return;

    if (badge) {
        badge.textContent = nodes.length;
    }

    if (nodes.length === 0) {
        nodesDiv.innerHTML = '<div class="text-muted small">No nodes found</div>';
        return;
    }

    const html = nodes.map((node, index) => {
        const methodColor = {
            'GET': 'success',
            'POST': 'primary',
            'PUT': 'warning',
            'DELETE': 'danger',
            'PATCH': 'info'
        }[node.method] || 'secondary';

        const validationsCount = node.validations?.length || 0;
        const hasAuth = node.headers?.Authorization ? true : false;

        return `
            <div class="list-group-item">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <div class="fw-semibold mb-1">
                            <span class="text-muted small">${index + 1}.</span>
                            ${escapeHtml(node.name)}
                        </div>
                        <div class="small">
                            <span class="badge bg-${methodColor}">${node.method}</span>
                            <code class="ms-2">${escapeHtml(node.url)}</code>
                        </div>
                        <div class="small text-muted mt-1">
                            Node ID: <code>${escapeHtml(node.id)}</code>
                            ${validationsCount > 0 ? ` • ${validationsCount} validation${validationsCount !== 1 ? 's' : ''}` : ''}
                            ${hasAuth ? ' • <i class="bi bi-shield-check text-warning" title="Auth override"></i>' : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    nodesDiv.innerHTML = html;
}

/**
 * Populate variables section
 */
function populatePreviewVariables(variables) {
    const section = document.getElementById('postmanPreviewVariablesSection');
    const varsDiv = document.getElementById('postmanPreviewVariables');
    const badge = document.getElementById('variablesCountBadge');

    if (!section || !varsDiv) return;

    const varCount = Object.keys(variables).length;

    if (varCount === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    if (badge) {
        badge.textContent = varCount;
    }

    const html = Object.entries(variables).map(([key, value]) => {
        const displayValue = typeof value === 'string' && value.length > 100
            ? value.substring(0, 100) + '...'
            : value;

        return `
            <div class="mb-2">
                <code>${escapeHtml(key)}</code>
                <span class="text-muted mx-2">→</span>
                <code class="text-warning">${escapeHtml(String(displayValue))}</code>
            </div>
        `;
    }).join('');

    varsDiv.innerHTML = html;
}

/**
 * Populate auth conversion section
 */
function populatePreviewAuth(headers) {
    const section = document.getElementById('postmanPreviewAuthSection');
    const authDiv = document.getElementById('postmanPreviewAuth');

    if (!section || !authDiv) return;

    const authHeader = headers.Authorization;

    if (!authHeader) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';

    let authType = 'Unknown';
    let authDetails = '';

    if (authHeader.startsWith('Basic ')) {
        authType = 'Basic Authentication';
        authDetails = 'Credentials encoded in Authorization header';
    } else if (authHeader.startsWith('Bearer ')) {
        authType = 'Bearer Token';
        const token = authHeader.substring(7);
        const displayToken = token.length > 40 ? token.substring(0, 40) + '...' : token;
        authDetails = `Token: <code>${escapeHtml(displayToken)}</code>`;
    } else if (headers['X-API-Key'] || headers['x-api-key']) {
        authType = 'API Key';
        const key = headers['X-API-Key'] || headers['x-api-key'];
        authDetails = `API Key header configured`;
    } else {
        authDetails = `<code>${escapeHtml(authHeader)}</code>`;
    }

    authDiv.innerHTML = `
        <div class="small">
            <strong><i class="bi bi-shield-check"></i> ${authType}</strong>
            <div class="mt-1 text-muted">${authDetails}</div>
            <div class="mt-2 text-muted">
                <i class="bi bi-info-circle"></i>
                Applied to all nodes via <code>defaults.headers</code> (can be overridden per-node)
            </div>
        </div>
    `;
}

/**
 * Populate validations summary section
 */
function populatePreviewValidations(nodes) {
    const section = document.getElementById('postmanPreviewValidationsSection');
    const validationsDiv = document.getElementById('postmanPreviewValidations');
    const badge = document.getElementById('validationsCountBadge');

    if (!section || !validationsDiv) return;

    // Count total validations
    let totalValidations = 0;
    let statusValidations = 0;
    let jsonpathValidations = 0;

    nodes.forEach(node => {
        if (node.validations) {
            node.validations.forEach(v => {
                totalValidations++;
                if (v.httpStatusCode !== undefined) {
                    statusValidations++;
                } else if (v.jsonpath) {
                    jsonpathValidations++;
                }
            });
        }
    });

    if (totalValidations === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    if (badge) {
        badge.textContent = totalValidations;
    }

    let html = `<p class="mb-2">Extracted ${totalValidations} validation${totalValidations !== 1 ? 's' : ''} from Postman test scripts:</p>`;
    html += `<ul class="mb-0">`;

    if (statusValidations > 0) {
        html += `<li>${statusValidations} HTTP status code validation${statusValidations !== 1 ? 's' : ''}</li>`;
    }

    if (jsonpathValidations > 0) {
        html += `<li>${jsonpathValidations} JSON path validation${jsonpathValidations !== 1 ? 's' : ''} (field checks, equality assertions)</li>`;
    }

    html += `</ul>`;

    validationsDiv.innerHTML = html;
}

/**
 * Confirm import - load the pending config into editor
 */
function confirmPostmanImport() {
    if (!pendingPostmanConfig) {
        alert('No configuration to import');
        return;
    }

    // Close preview modal
    if (previewModalInstance) {
        previewModalInstance.hide();
    }

    // Load config into editor
    config = pendingPostmanConfig;
    const newFileName = document.getElementById('newFileName')?.value?.trim() || 'config.json';
    fileName = newFileName;

    // Close the import modal (newConfigModal)
    const newConfigModalElement = document.getElementById('newConfigModal');
    if (newConfigModalElement) {
        const newConfigModal = bootstrap.Modal.getInstance(newConfigModalElement);
        if (newConfigModal) {
            newConfigModal.hide();
        }
    }

    // Update UI
    updateFileNameDisplay();
    saveToLocalStorage();
    renderEditor();
    updatePreview();

    // Update button visibility
    if (typeof updateStartButton === 'function') {
        updateStartButton();
    }
    if (typeof updateImportNodesButton === 'function') {
        updateImportNodesButton();
    }
    if (typeof updateValidateButton === 'function') {
        updateValidateButton();
    }

    // Scroll JSON preview to top
    if (typeof scrollJsonPreviewToTop === 'function') {
        scrollJsonPreviewToTop();
    }

    // Show file actions dropdown
    const fileActionsDropdown = document.getElementById('fileActionsDropdown');
    if (fileActionsDropdown) fileActionsDropdown.style.display = 'inline-block';

    // Auto-validate loaded config (silent mode - shows badge only)
    if (typeof validateConfig === 'function' &&
        typeof FeatureRegistry !== 'undefined' &&
        FeatureRegistry.isFeatureEnabled('config-validator')) {
        validateConfig(true);
    }

    // Clear pending config
    pendingPostmanConfig = null;
}

/**
 * Cancel preview - return to import modal
 */
function cancelPostmanPreview() {
    // Close preview modal
    if (previewModalInstance) {
        previewModalInstance.hide();
    }

    // Clear pending config
    pendingPostmanConfig = null;

    // Optionally reset the import modal or just leave it hidden
}

/**
 * HTML escape helper (reuse from other modules or define here)
 */
function escapeHtml(text) {
    if (typeof text !== 'string') return text;
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export functions to global scope
window.showPostmanPreview = showPostmanPreview;
window.confirmPostmanImport = confirmPostmanImport;
window.cancelPostmanPreview = cancelPostmanPreview;
