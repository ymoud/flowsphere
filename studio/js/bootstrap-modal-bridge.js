/**
 * Bootstrap Modal Bridge
 * Adapts the original modal functions to work with Bootstrap 5 modal API
 */

// Create New Config Modal functions
function createNew() {
    const modalEl = document.getElementById('newConfigModal');
    let modal = bootstrap.Modal.getInstance(modalEl);

    // If no instance exists, create one
    if (!modal) {
        modal = new bootstrap.Modal(modalEl);
    }

    modal.show();
}

function closeNewConfigModal() {
    const modalEl = document.getElementById('newConfigModal');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) {
        modal.hide();
    } else {
        // If no instance exists, try to hide it manually
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) backdrop.remove();
        modalEl.classList.remove('show');
        modalEl.style.display = 'none';
        document.body.classList.remove('modal-open');
        document.body.style.removeProperty('overflow');
        document.body.style.removeProperty('padding-right');
    }
}

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

    // Show/hide all sections based on selection
    const sections = {
        'flowsphere-json': 'flowsphereJsonImportSection',
        'postman': 'postmanImportSection',
        'empty': 'emptyTemplateSection',
        'simple': 'simpleTemplateSection',
        'oauth': 'oauthTemplateSection',
        'user-input': 'userInputTemplateSection'
    };

    Object.entries(sections).forEach(([type, sectionId]) => {
        const section = document.getElementById(sectionId);
        if (section) {
            section.style.display = templateType === type ? 'block' : 'none';
        }
    });

    // Update Load Config button state and text based on selection
    updateLoadConfigButtonState(templateType);
}

function updateLoadConfigButtonState(templateType) {
    const loadConfigBtn = document.getElementById('loadConfigBtn');
    const loadConfigBtnText = document.getElementById('loadConfigBtnText');
    if (!loadConfigBtn) return;

    // Determine button state and text based on template type
    const isTemplate = ['empty', 'simple', 'oauth', 'user-input'].includes(templateType);
    let isEnabled = false;
    let buttonText = 'Load Config';

    if (isTemplate) {
        // Templates don't require files - always enabled
        isEnabled = true;
        buttonText = 'Create Config';
    } else if (templateType === 'flowsphere-json') {
        const fileInput = document.getElementById('flowsphereJsonFile');
        isEnabled = fileInput?.files && fileInput.files.length > 0;
        buttonText = 'Load Config';
    } else if (templateType === 'postman') {
        const fileInput = document.getElementById('postmanCollectionFile');
        isEnabled = fileInput?.files && fileInput.files.length > 0;
        buttonText = 'Load Config';
    }

    loadConfigBtn.disabled = !isEnabled;
    if (loadConfigBtnText) {
        loadConfigBtnText.textContent = buttonText;
    }
}

function confirmNewConfig() {
    const templateType = document.querySelector('input[name="template"]:checked')?.value || 'flowsphere-json';
    const newFileName = document.getElementById('newFileName').value.trim() || 'config.json';

    // Check if we need to show confirmation (only if config already exists with nodes)
    const configExists = config && config.nodes && config.nodes.length > 0;

    if (configExists) {
        // Show confirmation dialog
        const confirmed = confirm('This will replace your current flow. Continue?');
        if (!confirmed) {
            return; // User cancelled
        }
    }

    // Handle template creation (not file imports)
    const templateTypes = ['empty', 'simple', 'oauth', 'user-input'];
    if (templateTypes.includes(templateType)) {
        // Get template from templates.js
        if (typeof getTemplate !== 'function') {
            alert('Template system not available');
            return;
        }

        const templateConfig = getTemplate(templateType);

        // Set config and filename
        config = templateConfig;
        fileName = newFileName;

        // Close modal
        const modalEl = document.getElementById('newConfigModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();

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

        // Auto-validate created config (silent mode - shows badge only)
        if (typeof validateConfig === 'function' &&
            typeof FeatureRegistry !== 'undefined' &&
            FeatureRegistry.isFeatureEnabled('config-validator')) {
            validateConfig(true);
        }

        // Clear modal and reset UI
        resetLoadConfigModal();
        return;
    }

    if (templateType === 'flowsphere-json') {
        const fileInput = document.getElementById('flowsphereJsonFile');
        const file = fileInput?.files[0];

        if (!file) {
            alert('Please select a FlowSphere configuration file');
            return;
        }

        // Read and parse FlowSphere JSON config
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const loadedConfig = JSON.parse(e.target.result);

                // Set config and filename
                config = loadedConfig;
                fileName = newFileName;

                // Close modal using Bootstrap API
                const modalEl = document.getElementById('newConfigModal');
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
                updateFileNameDisplay();
                saveToLocalStorage();
                renderEditor();
                updatePreview();

                // Show Import Nodes button
                if (typeof updateImportNodesButton === 'function') {
                    updateImportNodesButton();
                }

                // Show Validate button
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

                // Clear file input and reset UI
                resetLoadConfigModal();

            } catch (err) {
                alert('Error parsing configuration file: ' + err.message);
            }
        };
        reader.readAsText(file);
        return;
    }

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

                // Check for environment file
                const envFileInput = document.getElementById('postmanEnvironmentFile');
                const envFile = envFileInput?.files[0];

                // Function to parse with or without environment
                const parseAndLoad = function(environment) {
                    // Use parsePostmanCollection from postman-parser.js
                    if (typeof parsePostmanCollection !== 'function') {
                        alert('Postman parser not loaded');
                        return;
                    }

                    const parsedConfig = parsePostmanCollection(collection, environment);

                    // Set config and filename
                    config = parsedConfig;
                    fileName = newFileName;

                    // Close modal using Bootstrap API
                    const modalEl = document.getElementById('newConfigModal');
                    const modal = bootstrap.Modal.getInstance(modalEl);
                    if (modal) modal.hide();
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
                };

                // If environment file is provided, read it first
                if (envFile) {
                    const envReader = new FileReader();
                    envReader.onload = function(envEvent) {
                        try {
                            const environment = JSON.parse(envEvent.target.result);
                            parseAndLoad(environment);
                        } catch (err) {
                            alert('Error parsing environment file: ' + err.message);
                        }
                    };
                    envReader.readAsText(envFile);
                } else {
                    // No environment file, parse without it
                    parseAndLoad(null);
                }

                // Show Validate button
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

                // Clear file input and reset UI
                resetLoadConfigModal();

            } catch (err) {
                alert('Error parsing Postman collection: ' + err.message);
            }
        };
        reader.readAsText(file);
        return;
    }

    // Unknown template type
    alert('Please select a valid import source');
}

function resetLoadConfigModal() {
    // Clear FlowSphere JSON file input
    const flowsphereJsonFileInput = document.getElementById('flowsphereJsonFile');
    if (flowsphereJsonFileInput) {
        flowsphereJsonFileInput.value = '';
    }

    // Reset FlowSphere JSON file name display
    const flowsphereJsonFileName = document.getElementById('flowsphereJsonFileName');
    if (flowsphereJsonFileName) {
        flowsphereJsonFileName.textContent = 'Click to select FlowSphere config file';
        flowsphereJsonFileName.style.color = '';
    }

    // Clear Postman file input
    const postmanFileInput = document.getElementById('postmanCollectionFile');
    if (postmanFileInput) {
        postmanFileInput.value = '';
    }

    // Reset Postman file name display
    const postmanFileName = document.getElementById('postmanFileName');
    if (postmanFileName) {
        postmanFileName.textContent = 'Click to select Postman collection file';
        postmanFileName.style.color = '';
    }

    // Clear Postman environment file input
    const postmanEnvFileInput = document.getElementById('postmanEnvironmentFile');
    if (postmanEnvFileInput) {
        postmanEnvFileInput.value = '';
    }

    // Reset Postman environment file name display
    const postmanEnvFileName = document.getElementById('postmanEnvFileName');
    if (postmanEnvFileName) {
        postmanEnvFileName.textContent = 'Click to select environment file (optional)';
        postmanEnvFileName.style.color = '';
    }

    // Reset filename input to default
    const newFileNameInput = document.getElementById('newFileName');
    if (newFileNameInput) {
        newFileNameInput.value = 'config.json';
    }

    // Disable Load Config button
    const loadConfigBtn = document.getElementById('loadConfigBtn');
    if (loadConfigBtn) {
        loadConfigBtn.disabled = true;
    }

    // Reset to FlowSphere JSON option selected
    const flowsphereRadio = document.getElementById('template-flowsphere-json');
    if (flowsphereRadio) {
        flowsphereRadio.checked = true;
    }

    // Show FlowSphere section, hide Postman section
    const flowsphereSection = document.getElementById('flowsphereJsonImportSection');
    if (flowsphereSection) {
        flowsphereSection.style.display = 'block';
    }

    const postmanSection = document.getElementById('postmanImportSection');
    if (postmanSection) {
        postmanSection.style.display = 'none';
    }

    // Update selected card styling
    const allOptions = document.querySelectorAll('.template-option');
    allOptions.forEach(opt => opt.classList.remove('selected'));

    const flowsphereOption = document.querySelector('.template-option:has(#template-flowsphere-json)');
    if (flowsphereOption) {
        flowsphereOption.classList.add('selected');
    }
}

// Export functions to global scope
window.createNew = createNew;
window.closeNewConfigModal = closeNewConfigModal;
window.selectTemplate = selectTemplate;
window.confirmNewConfig = confirmNewConfig;
window.updateLoadConfigButtonState = updateLoadConfigButtonState;
window.resetLoadConfigModal = resetLoadConfigModal;
