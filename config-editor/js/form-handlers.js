function renderDefaultValidations() {
    const validations = config.defaults?.validations || [];
    const container = document.getElementById('defaultValidations');

    if (!container) return;

    if (validations.length === 0) {
        container.innerHTML = '<div class="help-text" style="font-style: italic;">No default validations defined</div>';
        return;
    }

    container.innerHTML = validations.map((validation, index) => {
        let summary = '';
        if (validation.httpStatusCode !== undefined) {
            summary = `<strong>HTTP Status Code:</strong> ${validation.httpStatusCode}`;
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
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px; padding: 8px; background: var(--bg-main); border: 1px solid var(--border-color); border-radius: 4px;">
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

function addStep(hint = null, skipModal = false) {
    config.steps = config.steps || [];

    // Threshold for showing the modal (only show when nodes are hard to manage visually)
    const MODAL_THRESHOLD = 5;

    // If there are many steps and hint is 'top' or 'bottom', ask user with pre-selected option
    // For small number of nodes (<=5), just add directly without modal
    // skipModal flag bypasses this check (used when confirming from modal)
    if (!skipModal && config.steps.length > MODAL_THRESHOLD && (hint === 'top' || hint === 'bottom')) {
        showAddNodePositionModal(hint);
        return;
    }

    // Determine insert position
    let insertIndex;
    let position = hint; // hint can be 'top', 'bottom', or a number

    if (position === 'top') {
        insertIndex = 0;
    } else if (position === 'bottom' || position === null) {
        insertIndex = config.steps.length;
    } else if (typeof position === 'number') {
        insertIndex = Math.max(0, Math.min(position, config.steps.length));
    } else {
        insertIndex = config.steps.length;
    }

    // Create new step
    const newStep = {
        name: "New Node",
        method: "GET",
        url: "",
        headers: {},
        body: {}
    };

    // Insert step at position
    config.steps.splice(insertIndex, 0, newStep);

    // Update open step indices
    const newOpenIndices = new Set();
    openStepIndices.forEach(i => {
        if (i >= insertIndex) {
            newOpenIndices.add(i + 1);
        } else {
            newOpenIndices.add(i);
        }
    });
    openStepIndices = newOpenIndices;

    // Open the newly added step
    openStepIndices.add(insertIndex);

    saveToLocalStorage();
    renderSteps();
    updatePreview();

    // Scroll to the newly added step after rendering
    setTimeout(() => scrollToStep(insertIndex), 100);
}

function showAddNodePositionModal(hint = 'top') {
    const modal = document.getElementById('addNodePositionModal');
    if (!modal) {
        console.error('Add node position modal not found');
        return;
    }

    // Update max position and reset form
    const maxPos = (config.steps?.length || 0) + 1;
    const maxPosSpan = document.getElementById('maxNodePosition');
    const customPosInput = document.getElementById('customNodePosition');

    if (maxPosSpan) maxPosSpan.textContent = maxPos;
    if (customPosInput) {
        customPosInput.setAttribute('max', maxPos);
        customPosInput.value = maxPos; // Default to end position
    }

    // Pre-select radio based on hint
    const topRadio = document.getElementById('positionTop');
    const bottomRadio = document.getElementById('positionBottom');

    if (hint === 'bottom') {
        if (bottomRadio) bottomRadio.checked = true;
    } else {
        // Default to top
        if (topRadio) topRadio.checked = true;
    }

    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
}

function confirmAddNodePosition() {
    const position = document.querySelector('input[name="nodePosition"]:checked')?.value;

    if (position === 'custom') {
        const customPos = parseInt(document.getElementById('customNodePosition').value);
        if (!isNaN(customPos) && customPos >= 1 && customPos <= (config.steps?.length || 0) + 1) {
            addStep(customPos - 1, true); // Convert to 0-based index, skip modal
        } else {
            alert('Please enter a valid position between 1 and ' + ((config.steps?.length || 0) + 1));
            return;
        }
    } else {
        addStep(position, true); // Skip modal since we're already in the modal
    }

    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('addNodePositionModal'));
    if (modal) modal.hide();
}

function scrollToStep(stepIndex) {
    const stepsAccordion = document.getElementById('stepsAccordion');
    if (!stepsAccordion) return;

    const stepItems = stepsAccordion.querySelectorAll('.accordion-item');
    const stepElement = stepItems[stepIndex];

    if (!stepElement) return;

    // Get the main scrollable container
    const editorContent = document.getElementById('editorContent');
    const scrollContainer = editorContent?.parentElement;

    if (!scrollContainer) return;

    // Calculate position to scroll to
    const containerRect = scrollContainer.getBoundingClientRect();
    const stepRect = stepElement.getBoundingClientRect();

    // Calculate the offset needed to center the step in view
    const targetScrollTop = scrollContainer.scrollTop + stepRect.top - containerRect.top - 20;

    // Smooth scroll animation
    scrollContainer.scrollTo({
        top: targetScrollTop,
        behavior: 'smooth'
    });

    // Add a highlight animation
    stepElement.style.animation = 'none';
    setTimeout(() => {
        stepElement.style.animation = 'stepHighlight 1s ease-out';
    }, 10);
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

    // Get the step element for animation
    const stepsAccordion = document.getElementById('stepsAccordion');
    const stepElement = stepsAccordion?.querySelectorAll('.accordion-item')[index];

    if (stepElement) {
        // Add fade-out animation
        stepElement.classList.add('step-fade-out');

        // Wait for fade-out animation to complete, then swap and re-render
        setTimeout(() => {
            performStepSwap(index, newIndex);
        }, 250); // Match fade-out animation duration
    } else {
        // Fallback: swap immediately if element not found
        performStepSwap(index, newIndex);
    }
}

function performStepSwap(index, newIndex) {
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

    // Apply fade-in animation to the moved step at its new position
    setTimeout(() => {
        const stepsAccordion = document.getElementById('stepsAccordion');
        if (stepsAccordion) {
            const stepItems = stepsAccordion.querySelectorAll('.accordion-item');
            const movedStep = stepItems[newIndex];

            if (movedStep) {
                movedStep.classList.add('step-fade-in');

                // Remove class after animation completes
                setTimeout(() => {
                    movedStep.classList.remove('step-fade-in');
                }, 300); // Match fade-in animation duration
            }
        }
    }, 0);
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
window.confirmAddNodePosition = confirmAddNodePosition;
window.scrollToStep = scrollToStep;
