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

    // Show/hide Postman import section
    const postmanSection = document.getElementById('postmanImportSection');
    if (postmanSection) {
        postmanSection.style.display = templateType === 'postman' ? 'block' : 'none';
    }
}

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

                // Close modal using Bootstrap API
                const modalEl = document.getElementById('newConfigModal');
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
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

    // Close modal using Bootstrap API
    const modalEl = document.getElementById('newConfigModal');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();
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

// Export functions to global scope
window.createNew = createNew;
window.closeNewConfigModal = closeNewConfigModal;
window.selectTemplate = selectTemplate;
window.confirmNewConfig = confirmNewConfig;
