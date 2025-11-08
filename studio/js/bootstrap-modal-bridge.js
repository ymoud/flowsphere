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

    // Show/hide import sections based on selection
    const flowsphereJsonSection = document.getElementById('flowsphereJsonImportSection');
    const postmanSection = document.getElementById('postmanImportSection');

    if (flowsphereJsonSection) {
        flowsphereJsonSection.style.display = templateType === 'flowsphere-json' ? 'block' : 'none';
    }

    if (postmanSection) {
        postmanSection.style.display = templateType === 'postman' ? 'block' : 'none';
    }

    // Update Load Config button state based on file selection
    updateLoadConfigButtonState(templateType);
}

function updateLoadConfigButtonState(templateType) {
    const loadConfigBtn = document.getElementById('loadConfigBtn');
    if (!loadConfigBtn) return;

    let hasFile = false;

    if (templateType === 'flowsphere-json') {
        const fileInput = document.getElementById('flowsphereJsonFile');
        hasFile = fileInput?.files && fileInput.files.length > 0;
    } else if (templateType === 'postman') {
        const fileInput = document.getElementById('postmanCollectionFile');
        hasFile = fileInput?.files && fileInput.files.length > 0;
    }

    loadConfigBtn.disabled = !hasFile;
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

                // Scroll JSON preview to top
                if (typeof scrollJsonPreviewToTop === 'function') {
                    scrollJsonPreviewToTop();
                }

                // Show file actions dropdown
                const fileActionsDropdown = document.getElementById('fileActionsDropdown');
                if (fileActionsDropdown) fileActionsDropdown.style.display = 'inline-block';

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

                // Use parsePostmanCollection from postman-parser.js
                if (typeof parsePostmanCollection !== 'function') {
                    alert('Postman parser not loaded');
                    return;
                }

                const parsedConfig = parsePostmanCollection(collection);

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

                // Show Import Nodes button
                if (typeof updateImportNodesButton === 'function') {
                    updateImportNodesButton();
                }

                // Scroll JSON preview to top
                if (typeof scrollJsonPreviewToTop === 'function') {
                    scrollJsonPreviewToTop();
                }

                // Show file actions dropdown
                const fileActionsDropdown = document.getElementById('fileActionsDropdown');
                if (fileActionsDropdown) fileActionsDropdown.style.display = 'inline-block';

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
