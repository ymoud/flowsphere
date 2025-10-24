function renderDefaultValidations() {
    const validations = config.defaults?.validations || [];
    const container = document.getElementById('defaultValidations');

    if (!container) return;

    if (validations.length === 0) {
        container.innerHTML = '<div class="help-text" style="font-style: italic; color: #6b7280;">No default validations defined</div>';
        return;
    }

    container.innerHTML = validations.map((validation, index) => {
        let summary = '';
        if (validation.status !== undefined) {
            summary = `<strong>Status:</strong> ${validation.status}`;
        } else if (validation.jsonpath) {
            summary = `<strong>${validation.jsonpath}</strong>`;
            const criteria = [];
            if (validation.exists !== undefined) criteria.push(`exists: ${validation.exists}`);
            if (validation.equals !== undefined) criteria.push(`equals: "${validation.equals}"`);
            if (validation.notEquals !== undefined) criteria.push(`notEquals: "${validation.notEquals}"`);
            if (validation.greaterThan !== undefined) criteria.push(`> ${validation.greaterThan}`);
            if (validation.lessThan !== undefined) criteria.push(`< ${validation.lessThan}`);
            if (validation.greaterThanOrEqual !== undefined) criteria.push(`>= ${validation.greaterThanOrEqual}`);
            if (validation.lessThanOrEqual !== undefined) criteria.push(`<= ${validation.lessThanOrEqual}`);
            if (criteria.length > 0) summary += ` (${criteria.join(', ')})`;
        }

        return `
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px; padding: 8px; background: #f9fafb; border-radius: 4px;">
                <div style="flex: 1;">${summary}</div>
                <button class="btn btn-secondary btn-small" onclick="editDefaultValidation(${index})">Edit</button>
                <button class="btn btn-danger btn-small" onclick="removeDefaultValidation(${index})">×</button>
            </div>
        `;
    }).join('');
}

function addDefaultValidation() {
    showDefaultValidationModal(-1, {status: 200});
}

function editDefaultValidation(index) {
    const validation = config.defaults.validations[index];
    showDefaultValidationModal(index, validation);
}

function removeDefaultValidation(index) {
    if (confirm('Remove this default validation?')) {
        config.defaults.validations.splice(index, 1);
        saveToLocalStorage();
        renderDefaultValidations();
        updatePreview();
    }
}

function showDefaultValidationModal(valIndex, validation) {
    showValidationModal(-1, valIndex, validation, true);
}

function addDefaultHeader() {
    config.defaults.headers = config.defaults.headers || {};
    config.defaults.headers['New-Header'] = 'value';
    saveToLocalStorage();
    renderDefaultHeaders();
    updatePreview();
}

function updateDefaultHeader(index, field, value) {
    const headers = config.defaults.headers || {};
    const keys = Object.keys(headers);
    const oldKey = keys[index];

    if (field === 'key') {
        const oldValue = headers[oldKey];
        delete headers[oldKey];
        headers[value] = oldValue;
    } else {
        headers[oldKey] = value;
    }

    config.defaults.headers = headers;
    saveToLocalStorage();
    updatePreview();
}

function removeDefaultHeader(index) {
    const headers = config.defaults.headers || {};
    const keys = Object.keys(headers);
    delete headers[keys[index]];
    saveToLocalStorage();
    renderDefaultHeaders();
    updatePreview();
}

function addStep() {
    config.steps = config.steps || [];
    config.steps.push({
        name: "New Step",
        method: "GET",
        url: "",
        headers: {},
        body: {}
    });

    // Open the newly added step
    openStepIndices.add(config.steps.length - 1);

    saveToLocalStorage();
    renderSteps();
    updatePreview();
}

function removeStep(index) {
    if (confirm('Are you sure you want to remove this step?')) {
        config.steps.splice(index, 1);

        // Update open step indices
        const newOpenIndices = new Set();
        openStepIndices.forEach(i => {
            if (i < index) {
                newOpenIndices.add(i);
            } else if (i > index) {
                newOpenIndices.add(i - 1);
            }
            // Skip i === index (the removed step)
        });
        openStepIndices = newOpenIndices;

        saveToLocalStorage();
        renderSteps();
        updatePreview();
    }
}

function moveStep(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= config.steps.length) return;

    const temp = config.steps[index];
    config.steps[index] = config.steps[newIndex];
    config.steps[newIndex] = temp;

    // Swap open states
    const indexWasOpen = openStepIndices.has(index);
    const newIndexWasOpen = openStepIndices.has(newIndex);

    if (indexWasOpen && !newIndexWasOpen) {
        openStepIndices.delete(index);
        openStepIndices.add(newIndex);
    } else if (!indexWasOpen && newIndexWasOpen) {
        openStepIndices.delete(newIndex);
        openStepIndices.add(index);
    }

    saveToLocalStorage();
    renderSteps();
    updatePreview();
}

function updateStep(index, field, value) {
    if (value === undefined || value === '') {
        delete config.steps[index][field];
    } else {
        config.steps[index][field] = value;
    }

    // Re-render steps if name or id changed (to update header)
    if (field === 'name' || field === 'id' || field === 'method') {
        renderSteps();
    }

    saveToLocalStorage();
    updatePreview();
}

function updateStepJSON(index, field, value) {
    try {
        const parsed = JSON.parse(value || '{}');
        config.steps[index][field] = parsed;
        saveToLocalStorage();
        updatePreview();
    } catch (err) {
        console.error('Invalid JSON:', err);
    }
}

function updatePreview() {
    const jsonPreview = document.getElementById('jsonPreview');

    if (!config) {
        // Clear preview when no config
        jsonPreview.textContent = '';
        return;
    }

    // Clean up undefined fields before preview (preserve null and empty strings)
    const cleanConfig = JSON.parse(JSON.stringify(config, (key, value) => {
        if (value === undefined) return undefined;
        return value;
    }));

    jsonPreview.textContent = JSON.stringify(cleanConfig, null, 2);

    // Show download and close buttons if config exists
    document.getElementById('downloadBtn').style.display = 'inline-block';
    document.getElementById('closeBtn').style.display = 'inline-block';
}

function positionTooltip() {
    const button = document.getElementById('copyJsonBtn');
    const tooltip = document.getElementById('copyTooltip');
    const rect = button.getBoundingClientRect();

    tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
    tooltip.style.top = rect.top - tooltip.offsetHeight - 10 + 'px';
}

function copyJSON() {
    if (!config) {
        alert('No configuration to copy');
        return;
    }

    const jsonText = document.getElementById('jsonPreview').textContent;
    const copyBtn = document.getElementById('copyJsonBtn');

    navigator.clipboard.writeText(jsonText).then(() => {
        // Visual feedback
        copyBtn.style.background = '#10b981';
        copyBtn.style.color = '#ffffff';

        // Reset after 1 second
        setTimeout(() => {
            copyBtn.style.background = '#374151';
            copyBtn.style.color = '#d4d4d4';
        }, 1000);
    }).catch(err => {
        console.error('Failed to copy JSON:', err);
        alert('Failed to copy JSON to clipboard');
    });
}

// Export functions to global scope for onclick handlers
window.editDefaultValidation = editDefaultValidation;
window.removeDefaultValidation = removeDefaultValidation;
window.addGlobalVariable = addGlobalVariable;
window.removeGlobalVariable = removeGlobalVariable;
window.addDefaultValidation = addDefaultValidation;
window.addDefaultHeader = addDefaultHeader;
window.removeDefaultHeader = removeDefaultHeader;
window.updateDefaultHeader = updateDefaultHeader;
window.addStep = addStep;
window.removeStep = removeStep;
window.moveStep = moveStep;
window.updateStep = updateStep;
window.updateStepJSON = updateStepJSON;
