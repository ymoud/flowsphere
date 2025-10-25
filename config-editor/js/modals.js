// Condition Builder Functions
function renderConditionSummary(condition, stepIndex) {
    if (!condition || Object.keys(condition).length === 0) {
        return '<div class="help-text" style="font-style: italic; color: #6b7280;">No condition defined</div>';
    }

    const stepName = config.steps[condition.step]?.name || 'Unnamed';
    let summary = `Skip if step ${condition.step} (${stepName}) `;

    if (condition.statusCode) {
        summary += `has status code ${condition.statusCode}`;
    } else if (condition.field) {
        if (condition.equals !== undefined) {
            summary += `field "${condition.field}" equals "${condition.equals}"`;
        } else if (condition.notEquals !== undefined) {
            summary += `field "${condition.field}" not equals "${condition.notEquals}"`;
        } else if (condition.exists !== undefined) {
            summary += `field "${condition.field}" ${condition.exists ? 'exists' : 'does not exist'}`;
        }
    }

    return `<div class="builder-summary">${summary}</div>`;
}

function editCondition(stepIndex) {
    const condition = config.steps[stepIndex].condition || {};
    showConditionModal(stepIndex, condition);
}

function showConditionModal(stepIndex, condition) {
    const conditionType = condition.statusCode !== undefined ? 'statusCode' :
                         condition.equals !== undefined ? 'equals' :
                         condition.notEquals !== undefined ? 'notEquals' :
                         condition.exists !== undefined ? 'exists' : 'statusCode';

    const stepOptions = config.steps.slice(0, stepIndex).map((s, i) =>
        `<option value="${i}" ${condition.step === i ? 'selected' : ''}>${i}. ${s.name || 'Unnamed'}</option>`
    ).join('');

    const modalHtml = `
        <div class="modal active" id="conditionModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${Object.keys(condition).length > 0 ? 'Edit' : 'Add'} Condition</h2>
                    <p>Define when this step should be skipped based on a previous response</p>
                </div>

                <div class="form-group">
                    <label>Reference Step *</label>
                    <select id="conditionStep">
                        ${stepOptions || '<option value="">No previous steps</option>'}
                    </select>
                    <div class="help-text">Check the response from this previous step</div>
                </div>

                <div class="form-group">
                    <label>Condition Type *</label>
                    <select id="conditionType" onchange="updateConditionTypeFields()">
                        <option value="statusCode" ${conditionType === 'statusCode' ? 'selected' : ''}>Status Code</option>
                        <option value="equals" ${conditionType === 'equals' ? 'selected' : ''}>Field Equals Value</option>
                        <option value="notEquals" ${conditionType === 'notEquals' ? 'selected' : ''}>Field Not Equals Value</option>
                        <option value="exists" ${conditionType === 'exists' ? 'selected' : ''}>Field Exists</option>
                    </select>
                </div>

                <div id="conditionTypeFields">
                    ${renderConditionTypeFields(conditionType, condition)}
                </div>

                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeConditionModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="saveCondition(${stepIndex})">Save</button>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('conditionModal');
    if (existingModal) existingModal.remove();

    // Add new modal
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Attach autocomplete to modal inputs
    setTimeout(() => {
        const modal = document.getElementById('conditionModal');
        if (modal) {
            const inputs = modal.querySelectorAll('input[type="text"]');
            inputs.forEach(input => {
                attachAutocompleteToInput(input, stepIndex);
            });
        }
    }, 0);
}

function renderConditionTypeFields(type, condition) {
    if (type === 'statusCode') {
        return `
            <div class="form-group">
                <label>Expected Status Code *</label>
                <input type="number" id="conditionStatusCode" value="${condition.statusCode || 200}" placeholder="200">
                <div class="help-text">Skip this step if the previous response has this status code</div>
            </div>
        `;
    } else if (type === 'equals' || type === 'notEquals') {
        return `
            <div class="form-group">
                <label>JSON Path *</label>
                <input type="text" id="conditionField" value="${condition.field || ''}" placeholder=".success">
                <div class="help-text">Path to the field in the response (e.g., .success, .data.isActive)</div>
            </div>
            <div class="form-group">
                <label>Expected Value *</label>
                <input type="text" id="conditionValue" value="${condition[type] !== undefined ? condition[type] : ''}" placeholder="true">
                <div class="help-text">The value to ${type === 'equals' ? 'match' : 'not match'}</div>
            </div>
        `;
    } else if (type === 'exists') {
        return `
            <div class="form-group">
                <label>JSON Path *</label>
                <input type="text" id="conditionField" value="${condition.field || ''}" placeholder=".token">
                <div class="help-text">Path to the field in the response</div>
            </div>
            <div class="form-group">
                <label>Should Exist *</label>
                <select id="conditionExists">
                    <option value="true" ${condition.exists === true ? 'selected' : ''}>Yes (true)</option>
                    <option value="false" ${condition.exists === false ? 'selected' : ''}>No (false)</option>
                </select>
            </div>
        `;
    }
}

function updateConditionTypeFields() {
    const type = document.getElementById('conditionType').value;
    document.getElementById('conditionTypeFields').innerHTML = renderConditionTypeFields(type, {});
}

function saveCondition(stepIndex) {
    const type = document.getElementById('conditionType').value;
    const step = parseInt(document.getElementById('conditionStep')?.value || 0);

    const condition = { step };

    if (type === 'statusCode') {
        const statusCode = document.getElementById('conditionStatusCode').value;
        if (!statusCode) {
            alert('Status code is required');
            return;
        }
        condition.statusCode = parseInt(statusCode);
    } else if (type === 'equals' || type === 'notEquals') {
        const field = document.getElementById('conditionField').value.trim();
        const value = document.getElementById('conditionValue').value;

        if (!field) {
            alert('JSON path is required');
            return;
        }
        if (value === '') {
            alert('Value is required');
            return;
        }

        condition.field = field;
        // Try to parse as number or boolean
        let parsedValue = value;
        if (value === 'true') parsedValue = true;
        else if (value === 'false') parsedValue = false;
        else if (!isNaN(value) && value !== '') parsedValue = parseFloat(value);
        condition[type] = parsedValue;
    } else if (type === 'exists') {
        const field = document.getElementById('conditionField').value.trim();

        if (!field) {
            alert('JSON path is required');
            return;
        }

        condition.field = field;
        condition.exists = document.getElementById('conditionExists').value === 'true';
    }

    config.steps[stepIndex].condition = condition;
    closeConditionModal();
    saveToLocalStorage();
    renderSteps();
    updatePreview();
}

function removeCondition(stepIndex) {
    if (confirm('Remove this condition?')) {
        delete config.steps[stepIndex].condition;
        saveToLocalStorage();
        renderSteps();
        updatePreview();
    }
}

function closeConditionModal() {
    const modal = document.getElementById('conditionModal');
    if (modal) modal.remove();
}

// Validations Builder Functions
function renderValidationsList(validations, stepIndex) {
    const step = config.steps[stepIndex];
    const skipDefaults = step.skipDefaultValidations === true;

    // If validations undefined
    if (validations === undefined) {
        if (skipDefaults) {
            // Skip defaults but no validations defined = no validations performed
            return '<div class="help-text" style="font-style: italic; color: #dc2626;">No validations will be performed (click + to add)</div>';
        } else {
            // Merge behavior - using defaults
            return '<div class="help-text" style="font-style: italic; color: #6b7280;">Using default validations (click + to add step-level validations)</div>';
        }
    }

    if (Array.isArray(validations) && validations.length === 0) {
        if (skipDefaults) {
            // Skip defaults with empty array = no validations performed
            return '<div class="help-text" style="font-style: italic; color: #dc2626;">No validations will be performed (click + to add)</div>';
        } else {
            // Merge behavior with empty array = just defaults
            return '<div class="help-text" style="font-style: italic; color: #6b7280;">Using only default validations (click + to add step-level validations)</div>';
        }
    }

    return validations.map((validation, valIndex) => {
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
            <div class="builder-summary" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <div>${summary}</div>
                <div>
                    <button class="btn btn-secondary btn-small" onclick="editValidation(${stepIndex}, ${valIndex})" style="margin-left: 5px;">Edit</button>
                    <button class="btn btn-danger btn-small" onclick="removeValidation(${stepIndex}, ${valIndex})" style="margin-left: 5px;">×</button>
                </div>
            </div>
        `;
    }).join('');
}

function addValidation(stepIndex) {
    showValidationModal(stepIndex, -1, {httpStatusCode: 200}, false);
}

function editValidation(stepIndex, valIndex) {
    const validation = config.steps[stepIndex].validations[valIndex];
    showValidationModal(stepIndex, valIndex, validation, false);
}

function showValidationModal(stepIndex, valIndex, validation, isDefault = false) {
    const isNew = valIndex === -1;
    const validationType = validation.httpStatusCode !== undefined ? 'status' : 'jsonpath';

    const modalHtml = `
        <div class="modal active" id="validationModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${isNew ? 'Add' : 'Edit'} Validation</h2>
                    <p>Validate HTTP status code or response field</p>
                </div>

                <div class="form-group">
                    <label>Validation Type</label>
                    <select id="validationType" onchange="toggleValidationType()" ${!isNew ? 'disabled' : ''}>
                        <option value="status" ${validationType === 'status' ? 'selected' : ''}>HTTP Status Code</option>
                        <option value="jsonpath" ${validationType === 'jsonpath' ? 'selected' : ''}>JSON Path (Response Field)</option>
                    </select>
                    ${!isNew ? '<div class="help-text">Type cannot be changed after creation</div>' : ''}
                </div>

                <div id="statusValidation" style="${validationType === 'status' ? '' : 'display: none;'}">
                    <div class="form-group">
                        <label>Expected HTTP Status Code *</label>
                        <input type="number" id="valStatus" value="${validation.httpStatusCode || 200}" placeholder="200">
                        <div class="help-text">HTTP status code to expect (e.g., 200, 201, 404)</div>
                    </div>
                </div>

                <div id="jsonpathValidation" style="${validationType === 'jsonpath' ? '' : 'display: none;'}">
                    <div class="form-group">
                        <label>JSON Path *</label>
                        <input type="text" id="valJsonpath" value="${validation.jsonpath || ''}" placeholder=".token">
                        <div class="help-text">Path to the field in response (e.g., .token, .data.id, .user.email)</div>
                    </div>

                <div class="form-group">
                    <label style="display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox" id="valUseExists" ${validation.exists !== undefined ? 'checked' : ''} onchange="toggleValidationCriteria()">
                        Check if field exists
                    </label>
                    <div id="valExistsValue" style="margin-top: 10px; ${validation.exists !== undefined ? '' : 'display:none;'}">
                        <select id="valExists">
                            <option value="true" ${validation.exists === true ? 'selected' : ''}>Field should exist (true)</option>
                            <option value="false" ${validation.exists === false ? 'selected' : ''}>Field should not exist (false)</option>
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label style="display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox" id="valUseEquals" ${validation.equals !== undefined ? 'checked' : ''} onchange="toggleValidationCriteria()">
                        Check field equals value
                    </label>
                    <div id="valEqualsValue" style="margin-top: 10px; ${validation.equals !== undefined ? '' : 'display:none;'}">
                        <input type="text" id="valEquals" value="${validation.equals !== undefined ? validation.equals : ''}" placeholder="Expected value">
                        <div class="help-text">The value the field should equal</div>
                    </div>
                </div>

                <div class="form-group">
                    <label style="display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox" id="valUseNotEquals" ${validation.notEquals !== undefined ? 'checked' : ''} onchange="toggleValidationCriteria()">
                        Check field not equals value
                    </label>
                    <div id="valNotEqualsValue" style="margin-top: 10px; ${validation.notEquals !== undefined ? '' : 'display:none;'}">
                        <input type="text" id="valNotEquals" value="${validation.notEquals !== undefined ? validation.notEquals : ''}" placeholder="Unwanted value">
                        <div class="help-text">The value the field should NOT equal</div>
                    </div>
                </div>

                <div class="form-group">
                    <label style="display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox" id="valUseGreaterThan" ${validation.greaterThan !== undefined ? 'checked' : ''} onchange="toggleValidationCriteria()">
                        Check field greater than value
                    </label>
                    <div id="valGreaterThanValue" style="margin-top: 10px; ${validation.greaterThan !== undefined ? '' : 'display:none;'}">
                        <input type="number" id="valGreaterThan" value="${validation.greaterThan !== undefined ? validation.greaterThan : ''}" placeholder="Minimum value (exclusive)">
                        <div class="help-text">Field value must be greater than this number</div>
                    </div>
                </div>

                <div class="form-group">
                    <label style="display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox" id="valUseLessThan" ${validation.lessThan !== undefined ? 'checked' : ''} onchange="toggleValidationCriteria()">
                        Check field less than value
                    </label>
                    <div id="valLessThanValue" style="margin-top: 10px; ${validation.lessThan !== undefined ? '' : 'display:none;'}">
                        <input type="number" id="valLessThan" value="${validation.lessThan !== undefined ? validation.lessThan : ''}" placeholder="Maximum value (exclusive)">
                        <div class="help-text">Field value must be less than this number</div>
                    </div>
                </div>

                <div class="form-group">
                    <label style="display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox" id="valUseGreaterThanOrEqual" ${validation.greaterThanOrEqual !== undefined ? 'checked' : ''} onchange="toggleValidationCriteria()">
                        Check field greater than or equal to value
                    </label>
                    <div id="valGreaterThanOrEqualValue" style="margin-top: 10px; ${validation.greaterThanOrEqual !== undefined ? '' : 'display:none;'}">
                        <input type="number" id="valGreaterThanOrEqual" value="${validation.greaterThanOrEqual !== undefined ? validation.greaterThanOrEqual : ''}" placeholder="Minimum value (inclusive)">
                        <div class="help-text">Field value must be greater than or equal to this number</div>
                    </div>
                </div>

                <div class="form-group">
                    <label style="display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox" id="valUseLessThanOrEqual" ${validation.lessThanOrEqual !== undefined ? 'checked' : ''} onchange="toggleValidationCriteria()">
                        Check field less than or equal to value
                    </label>
                    <div id="valLessThanOrEqualValue" style="margin-top: 10px; ${validation.lessThanOrEqual !== undefined ? '' : 'display:none;'}">
                        <input type="number" id="valLessThanOrEqual" value="${validation.lessThanOrEqual !== undefined ? validation.lessThanOrEqual : ''}" placeholder="Maximum value (inclusive)">
                        <div class="help-text">Field value must be less than or equal to this number</div>
                    </div>
                </div>
                </div>

                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeValidationModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="saveValidation(${stepIndex}, ${valIndex}, ${isDefault})">${isNew ? 'Add' : 'Save'}</button>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('validationModal');
    if (existingModal) existingModal.remove();

    // Add new modal
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Attach autocomplete to modal inputs
    setTimeout(() => {
        const modal = document.getElementById('validationModal');
        if (modal) {
            // Attach jq autocomplete to jsonpath input
            const jsonpathInput = modal.querySelector('#valJsonpath');
            if (jsonpathInput) {
                attachAutocompleteToInput(jsonpathInput, stepIndex, 'jq');
            }

            // Attach template autocomplete to other text inputs (like equals, notEquals values)
            const otherInputs = modal.querySelectorAll('input[type="text"]:not(#valJsonpath)');
            otherInputs.forEach(input => {
                attachAutocompleteToInput(input, stepIndex, 'template');
            });
        }
    }, 0);
}

function toggleValidationType() {
    const type = document.getElementById('validationType').value;
    document.getElementById('statusValidation').style.display = type === 'status' ? 'block' : 'none';
    document.getElementById('jsonpathValidation').style.display = type === 'jsonpath' ? 'block' : 'none';
}

function toggleValidationCriteria() {
    const useExists = document.getElementById('valUseExists')?.checked || false;
    const useEquals = document.getElementById('valUseEquals')?.checked || false;
    const useNotEquals = document.getElementById('valUseNotEquals')?.checked || false;
    const useGreaterThan = document.getElementById('valUseGreaterThan')?.checked || false;
    const useLessThan = document.getElementById('valUseLessThan')?.checked || false;
    const useGreaterThanOrEqual = document.getElementById('valUseGreaterThanOrEqual')?.checked || false;
    const useLessThanOrEqual = document.getElementById('valUseLessThanOrEqual')?.checked || false;

    const existsEl = document.getElementById('valExistsValue');
    const equalsEl = document.getElementById('valEqualsValue');
    const notEqualsEl = document.getElementById('valNotEqualsValue');
    const greaterThanEl = document.getElementById('valGreaterThanValue');
    const lessThanEl = document.getElementById('valLessThanValue');
    const greaterThanOrEqualEl = document.getElementById('valGreaterThanOrEqualValue');
    const lessThanOrEqualEl = document.getElementById('valLessThanOrEqualValue');

    if (existsEl) existsEl.style.display = useExists ? 'block' : 'none';
    if (equalsEl) equalsEl.style.display = useEquals ? 'block' : 'none';
    if (notEqualsEl) notEqualsEl.style.display = useNotEquals ? 'block' : 'none';
    if (greaterThanEl) greaterThanEl.style.display = useGreaterThan ? 'block' : 'none';
    if (lessThanEl) lessThanEl.style.display = useLessThan ? 'block' : 'none';
    if (greaterThanOrEqualEl) greaterThanOrEqualEl.style.display = useGreaterThanOrEqual ? 'block' : 'none';
    if (lessThanOrEqualEl) lessThanOrEqualEl.style.display = useLessThanOrEqual ? 'block' : 'none';
}

function saveValidation(stepIndex, valIndex, isDefault = false) {
    const type = document.getElementById('validationType').value;
    let validation = {};

    if (type === 'status') {
        const status = document.getElementById('valStatus').value;
        if (!status) {
            alert('Status code is required');
            return;
        }
        validation.httpStatusCode = parseInt(status);
    } else {
        const jsonpath = document.getElementById('valJsonpath').value.trim();
        if (!jsonpath) {
            alert('JSON Path is required');
            return;
        }

        validation.jsonpath = jsonpath;

        // Add criteria if checkboxes are checked
        if (document.getElementById('valUseExists').checked) {
            validation.exists = document.getElementById('valExists').value === 'true';
        }

        if (document.getElementById('valUseEquals').checked) {
            let value = document.getElementById('valEquals').value;
            // Try to parse as number or boolean
            if (value === 'true') value = true;
            else if (value === 'false') value = false;
            else if (!isNaN(value) && value !== '') value = parseFloat(value);
            validation.equals = value;
        }

        if (document.getElementById('valUseNotEquals').checked) {
            let value = document.getElementById('valNotEquals').value;
            // Try to parse as number or boolean
            if (value === 'true') value = true;
            else if (value === 'false') value = false;
            else if (!isNaN(value) && value !== '') value = parseFloat(value);
            validation.notEquals = value;
        }

        if (document.getElementById('valUseGreaterThan').checked) {
            const value = document.getElementById('valGreaterThan').value;
            if (value !== '') {
                validation.greaterThan = parseFloat(value);
            }
        }

        if (document.getElementById('valUseLessThan').checked) {
            const value = document.getElementById('valLessThan').value;
            if (value !== '') {
                validation.lessThan = parseFloat(value);
            }
        }

        if (document.getElementById('valUseGreaterThanOrEqual').checked) {
            const value = document.getElementById('valGreaterThanOrEqual').value;
            if (value !== '') {
                validation.greaterThanOrEqual = parseFloat(value);
            }
        }

        if (document.getElementById('valUseLessThanOrEqual').checked) {
            const value = document.getElementById('valLessThanOrEqual').value;
            if (value !== '') {
                validation.lessThanOrEqual = parseFloat(value);
            }
        }

        // If no criteria selected, default to exists: true
        if (validation.exists === undefined &&
            validation.equals === undefined &&
            validation.notEquals === undefined &&
            validation.greaterThan === undefined &&
            validation.lessThan === undefined &&
            validation.greaterThanOrEqual === undefined &&
            validation.lessThanOrEqual === undefined) {
            validation.exists = true;
        }
    }

    // Save to defaults or step
    if (isDefault) {
        if (!config.defaults.validations) {
            config.defaults.validations = [];
        }
        if (valIndex === -1) {
            config.defaults.validations.push(validation);
        } else {
            config.defaults.validations[valIndex] = validation;
        }
        renderDefaultValidations();
    } else {
        if (!config.steps[stepIndex].validations) {
            config.steps[stepIndex].validations = [];
        }
        if (valIndex === -1) {
            config.steps[stepIndex].validations.push(validation);
        } else {
            config.steps[stepIndex].validations[valIndex] = validation;
        }
        renderSteps();
    }

    closeValidationModal();
    saveToLocalStorage();
    updatePreview();
}

function removeValidation(stepIndex, valIndex) {
    if (confirm('Remove this validation?')) {
        config.steps[stepIndex].validations.splice(valIndex, 1);
        saveToLocalStorage();
        renderSteps();
        updatePreview();
    }
}

function toggleSkipDefaultValidations(stepIndex, skipDefaults) {
    if (skipDefaults) {
        // Set skipDefaultValidations flag to true
        config.steps[stepIndex].skipDefaultValidations = true;
    } else {
        // Remove skipDefaultValidations flag (defaults to false/merge behavior)
        delete config.steps[stepIndex].skipDefaultValidations;
    }

    // Update UI
    saveToLocalStorage();
    renderSteps();
    updatePreview();
}

function toggleSkipDefaultHeaders(stepIndex, skipDefaults) {
    if (skipDefaults) {
        // Set skipDefaultHeaders flag to true
        config.steps[stepIndex].skipDefaultHeaders = true;
    } else {
        // Remove skipDefaultHeaders flag (defaults to false/merge behavior)
        delete config.steps[stepIndex].skipDefaultHeaders;
    }

    // Update UI
    saveToLocalStorage();
    renderSteps();
    updatePreview();
}

function closeValidationModal() {
    const modal = document.getElementById('validationModal');
    if (modal) modal.remove();
}

// Prompts Builder Functions
function renderPromptsList(prompts, stepIndex) {
    const promptKeys = Object.keys(prompts || {});

    if (promptKeys.length === 0) {
        return '<div class="help-text" style="font-style: italic; color: #6b7280;">No prompts defined</div>';
    }

    return promptKeys.map((key, promptIndex) => {
        return `
            <div class="builder-summary" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <div>
                    <strong>${key}</strong>: "${prompts[key]}"
                </div>
                <div>
                    <button class="btn btn-secondary btn-small" onclick="editPrompt(${stepIndex}, '${key}')" style="margin-left: 5px;">Edit</button>
                    <button class="btn btn-danger btn-small" onclick="removePrompt(${stepIndex}, '${key}')" style="margin-left: 5px;">×</button>
                </div>
            </div>
        `;
    }).join('');
}

function addPrompt(stepIndex) {
    showPromptModal(stepIndex, null);
}

function editPrompt(stepIndex, key) {
    const prompt = config.steps[stepIndex].prompts[key];
    showPromptModal(stepIndex, key, prompt);
}

function showPromptModal(stepIndex, existingKey, existingMessage = '') {
    const isNew = existingKey === null;
    const modalHtml = `
        <div class="modal active" id="promptModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${isNew ? 'Add' : 'Edit'} User Input Prompt</h2>
                    <p>Define a variable that will prompt the user for input</p>
                </div>

                <div class="form-group">
                    <label>Variable Name *</label>
                    <input type="text" id="promptKey" value="${existingKey || ''}" placeholder="username" ${!isNew ? 'readonly' : ''}>
                    <div class="help-text">Used as {{ .input.variableName }} in the request</div>
                </div>

                <div class="form-group">
                    <label>Prompt Message *</label>
                    <input type="text" id="promptMessage" value="${existingMessage}" placeholder="Enter your username:">
                    <div class="help-text">The message shown to the user</div>
                </div>

                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closePromptModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="savePrompt(${stepIndex}, ${isNew ? 'null' : `'${existingKey}'`})">${isNew ? 'Add' : 'Save'}</button>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('promptModal');
    if (existingModal) existingModal.remove();

    // Add new modal
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Attach autocomplete to modal inputs (though prompts typically don't use variable substitution)
    setTimeout(() => {
        const modal = document.getElementById('promptModal');
        if (modal) {
            const inputs = modal.querySelectorAll('input[type="text"]');
            inputs.forEach(input => {
                attachAutocompleteToInput(input, stepIndex);
            });
        }
    }, 0);
}

function savePrompt(stepIndex, existingKey) {
    const key = document.getElementById('promptKey').value.trim();
    const message = document.getElementById('promptMessage').value.trim();

    if (!key) {
        alert('Variable name is required');
        return;
    }

    if (!message) {
        alert('Prompt message is required');
        return;
    }

    // Validate variable name (alphanumeric and underscore only)
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
        alert('Variable name must start with a letter or underscore and contain only letters, numbers, and underscores');
        return;
    }

    // Initialize prompts object if needed
    if (!config.steps[stepIndex].prompts) {
        config.steps[stepIndex].prompts = {};
    }

    // If editing and key changed, remove old key
    if (existingKey !== null && existingKey !== key) {
        delete config.steps[stepIndex].prompts[existingKey];
    }

    // Add/update prompt
    config.steps[stepIndex].prompts[key] = message;

    closePromptModal();
    saveToLocalStorage();
    renderSteps();
    updatePreview();
}

function removePrompt(stepIndex, key) {
    if (confirm(`Remove prompt "${key}"?`)) {
        delete config.steps[stepIndex].prompts[key];

        // Remove prompts object if empty
        if (Object.keys(config.steps[stepIndex].prompts).length === 0) {
            delete config.steps[stepIndex].prompts;
        }

        saveToLocalStorage();
        renderSteps();
        updatePreview();
    }
}

function closePromptModal() {
    const modal = document.getElementById('promptModal');
    if (modal) modal.remove();
}

// Headers Builder Functions
function renderHeadersList(headers, stepIndex) {
    const step = config.steps[stepIndex];
    const skipDefaults = step.skipDefaultHeaders === true;

    // If headers undefined
    if (headers === undefined) {
        if (skipDefaults) {
            // Skip defaults but no headers defined = no headers sent
            return '<div class="help-text" style="font-style: italic; color: #dc2626;">No headers will be sent (click + to add)</div>';
        } else {
            // Merge behavior - using defaults
            return '<div class="help-text" style="font-style: italic; color: #6b7280;">Using default headers (merged)</div>';
        }
    }

    const headerKeys = Object.keys(headers);

    if (headerKeys.length === 0) {
        if (skipDefaults) {
            // Skip defaults with empty object = no headers sent
            return '<div class="help-text" style="font-style: italic; color: #dc2626;">No headers will be sent (click + to add)</div>';
        } else {
            // Merge behavior with empty object = just defaults
            return '<div class="help-text" style="font-style: italic; color: #6b7280;">Using only default headers</div>';
        }
    }

    return headerKeys.map((key) => {
        return `
            <div class="builder-summary" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <div>
                    <strong>${key}</strong>: "${headers[key]}"
                </div>
                <div>
                    <button class="btn btn-secondary btn-small" onclick="editHeader(${stepIndex}, '${key.replace(/'/g, "\\'")}'); event.stopPropagation();" style="margin-left: 5px;">Edit</button>
                    <button class="btn btn-danger btn-small" onclick="removeHeader(${stepIndex}, '${key.replace(/'/g, "\\'")}'); event.stopPropagation();" style="margin-left: 5px;">×</button>
                </div>
            </div>
        `;
    }).join('');
}

function addHeader(stepIndex) {
    showHeaderModal(stepIndex, null);
}

function editHeader(stepIndex, key) {
    const value = config.steps[stepIndex].headers[key];
    showHeaderModal(stepIndex, key, value);
}

function showHeaderModal(stepIndex, existingKey, existingValue = '') {
    const isNew = existingKey === null;
    const modalHtml = `
        <div class="modal active" id="headerModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${isNew ? 'Add' : 'Edit'} Header</h2>
                    <p>Define a custom HTTP header for this request</p>
                </div>

                <div class="form-group">
                    <label>Header Name *</label>
                    <input type="text" id="headerKey" value="${existingKey || ''}" placeholder="Authorization" ${!isNew ? 'readonly' : ''}>
                    <div class="help-text">Common headers: Authorization, Content-Type, Accept, etc.</div>
                </div>

                <div class="form-group">
                    <label>Header Value *</label>
                    <input type="text" id="headerValue" value="${existingValue.replace(/"/g, '&quot;')}" placeholder="Bearer {{ .responses.login.token }}">
                    <div class="help-text">Can use {{ .responses.stepId.field }} or {{ .input.var }}</div>
                </div>

                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeHeaderModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="saveHeader(${stepIndex}, ${isNew ? 'null' : `'${existingKey.replace(/'/g, "\\'")}'`})">${isNew ? 'Add' : 'Save'}</button>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('headerModal');
    if (existingModal) existingModal.remove();

    // Add new modal
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Attach autocomplete to modal inputs
    setTimeout(() => {
        const modal = document.getElementById('headerModal');
        if (modal) {
            const inputs = modal.querySelectorAll('input[type="text"]');
            inputs.forEach(input => {
                attachAutocompleteToInput(input, stepIndex);
            });
        }
    }, 0);
}

function saveHeader(stepIndex, existingKey) {
    const key = document.getElementById('headerKey').value.trim();
    const value = document.getElementById('headerValue').value.trim();

    if (!key) {
        alert('Header name is required');
        return;
    }

    if (!value) {
        alert('Header value is required');
        return;
    }

    // Initialize headers object if needed
    if (!config.steps[stepIndex].headers) {
        config.steps[stepIndex].headers = {};
    }

    // If editing and key changed, remove old key
    if (existingKey !== null && existingKey !== key) {
        delete config.steps[stepIndex].headers[existingKey];
    }

    // Add/update header
    config.steps[stepIndex].headers[key] = value;

    closeHeaderModal();
    saveToLocalStorage();
    renderSteps();
    updatePreview();
}

function removeHeader(stepIndex, key) {
    if (confirm(`Remove header "${key}"?`)) {
        delete config.steps[stepIndex].headers[key];

        // Remove headers object if empty
        if (Object.keys(config.steps[stepIndex].headers).length === 0) {
            delete config.steps[stepIndex].headers;
        }

        saveToLocalStorage();
        renderSteps();
        updatePreview();
    }
}

function closeHeaderModal() {
    const modal = document.getElementById('headerModal');
    if (modal) modal.remove();
}

// New Config Modal functions
// Note: These functions are overridden by bootstrap-modal-bridge.js in Bootstrap 5 implementation
// Only export if they don't already exist (Bootstrap bridge loads first)
if (!window.createNew) {
    function createNew() {
        const modal = document.getElementById('newConfigModal');
        if (modal) modal.classList.add('active');
    }
    window.createNew = createNew;
}

if (!window.closeNewConfigModal) {
    function closeNewConfigModal() {
        const modal = document.getElementById('newConfigModal');
        if (modal) modal.classList.remove('active');
    }
    window.closeNewConfigModal = closeNewConfigModal;
}

if (!window.selectTemplate) {
    function selectTemplate(templateType, element) {
        // Remove selected class from all template options
        const allOptions = document.querySelectorAll('.template-option');
        allOptions.forEach(opt => opt.classList.remove('selected'));

        // Add selected class to clicked option
        if (element) {
            element.classList.add('selected');
        }

        // Update radio button
        const radio = element?.querySelector(`input[value="${templateType}"]`);
        if (radio) {
            radio.checked = true;
        }

        // Show/hide Postman import section
        const postmanSection = document.getElementById('postmanImportSection');
        if (postmanSection) {
            postmanSection.style.display = templateType === 'postman' ? 'block' : 'none';
        }
    }
    window.selectTemplate = selectTemplate;
}

if (!window.confirmNewConfig) {
    function confirmNewConfig() {
        const templateType = document.querySelector('input[name="template"]:checked')?.value || 'empty';
        const newFileName = document.getElementById('newFileName').value.trim() || 'config.json';

        if (templateType === 'postman') {
            const fileInput = document.getElementById('postmanCollectionFile');
            const file = fileInput?.files[0];

            if (!file) {
                alert('Please select a Postman collection file');
                return;
            }

            // Read and parse Postman collection
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const collection = JSON.parse(e.target.result);

                    // Use parsePostmanCollection from postman-parser.js
                    if (typeof parsePostmanCollection !== 'function') {
                        alert('Postman parser not loaded');
                        return;
                    }

                    const parsedConfig = parsePostmanCollection(collection);

                    // Set config and filename
                    config = parsedConfig;
                    fileName = newFileName;

                    // Update UI
                    closeNewConfigModal();
                    updateFileNameDisplay();
                    saveToLocalStorage();
                    renderEditor();
                    updatePreview();

                    // Show download and close buttons
                    const downloadBtn = document.getElementById('downloadBtn');
                    const closeBtn = document.getElementById('closeBtn');
                    if (downloadBtn) downloadBtn.style.display = 'inline-block';
                    if (closeBtn) closeBtn.style.display = 'inline-block';

                } catch (err) {
                    alert('Error parsing Postman collection: ' + err.message);
                }
            };
            reader.readAsText(file);
            return;
        }

        // Get template from templates.js
        const template = typeof getTemplate === 'function' ? getTemplate(templateType) : null;
        if (!template) {
            alert('Template not found');
            return;
        }

        // Set config and filename
        config = template;
        fileName = newFileName;

        // Update UI
        closeNewConfigModal();
        updateFileNameDisplay();
        saveToLocalStorage();
        renderEditor();
        updatePreview();

        // Show download and close buttons
        const downloadBtn = document.getElementById('downloadBtn');
        const closeBtn = document.getElementById('closeBtn');
        if (downloadBtn) downloadBtn.style.display = 'inline-block';
        if (closeBtn) closeBtn.style.display = 'inline-block';
    }
    window.confirmNewConfig = confirmNewConfig;
}
window.closeConditionModal = closeConditionModal;
window.saveCondition = saveCondition;
window.editCondition = editCondition;
window.removeCondition = removeCondition;
window.updateConditionTypeFields = updateConditionTypeFields;
window.editValidation = editValidation;
window.removeValidation = removeValidation;
window.closeValidationModal = closeValidationModal;
window.saveValidation = saveValidation;
window.addValidation = addValidation;
window.toggleValidationType = toggleValidationType;
window.toggleValidationCriteria = toggleValidationCriteria;
window.toggleSkipDefaultValidations = toggleSkipDefaultValidations;
window.toggleSkipDefaultHeaders = toggleSkipDefaultHeaders;
window.editPrompt = editPrompt;
window.removePrompt = removePrompt;
window.closePromptModal = closePromptModal;
window.savePrompt = savePrompt;
window.addPrompt = addPrompt;
window.editHeader = editHeader;
window.removeHeader = removeHeader;
window.closeHeaderModal = closeHeaderModal;
window.saveHeader = saveHeader;
window.addHeader = addHeader;
