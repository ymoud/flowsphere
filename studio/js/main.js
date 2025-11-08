// Main initialization and event listeners

// Wait for DOM to be ready
window.addEventListener('DOMContentLoaded', function() {
    // Initialize empty state if no config is loaded
    // This ensures the empty state always matches what's shown after closing a file
    if (!config) {
        const editorContent = document.getElementById('editorContent');
        if (editorContent && editorContent.classList.contains('empty-state')) {
            editorContent.innerHTML = getEmptyStateHTML();
        }
    }

    // Initialize autocomplete (if feature is loaded)
    if (typeof initAutocomplete === 'function') {
        initAutocomplete();
    } else {
        console.log('[Main] Autocomplete feature not loaded - skipping initialization');
    }

    // File input event listener
    const fileInput = document.getElementById('fileInput');
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Show loader
        showLoader('Loading configuration...');

        const reader = new FileReader();

        reader.onload = function(e) {
            // Use setTimeout to allow loader to render
            setTimeout(() => {
                try {
                    const jsonText = e.target.result;
                    let parsed;

                    // Step 1: Try to parse JSON
                    try {
                        parsed = JSON.parse(jsonText);
                    } catch (parseErr) {
                        console.error('Invalid JSON:', parseErr);
                        hideLoader();
                        alert('Invalid JSON: ' + parseErr.message);
                        fileInput.value = '';
                        return; // STOP - invalid JSON
                    }

                    // Step 2: Validate it's a valid config structure
                    if (!parsed || typeof parsed !== 'object') {
                        hideLoader();
                        alert('Invalid config: Root must be an object');
                        fileInput.value = '';
                        return; // STOP - invalid config
                    }

                    if (!Array.isArray(parsed.nodes)) {
                        hideLoader();
                        alert('Invalid config: Missing or invalid "nodes" array');
                        fileInput.value = '';
                        return; // STOP - invalid config
                    }

                    // Step 3: JSON is valid config - update config
                    config = parsed;
                    fileName = file.name;

                    // Step 4: Try to persist to localStorage
                    try {
                        saveToLocalStorage();
                    } catch (storageErr) {
                        console.warn('Cannot persist to localStorage:', storageErr);
                        if (storageErr.name === 'QuotaExceededError') {
                            hideLoader();
                            alert('Warning: Configuration is too large to persist in localStorage. It will not be saved between page refreshes.');
                        }
                    }

                    // Step 5: Render UI
                    updateFileNameDisplay();
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

                    // Scroll JSON preview to top when loading a file
                    if (typeof scrollJsonPreviewToTop === 'function') {
                        scrollJsonPreviewToTop();
                    }

                    // Show file actions dropdown
                    const fileActionsDropdown = document.getElementById('fileActionsDropdown');
                    if (fileActionsDropdown) fileActionsDropdown.style.display = 'inline-block';

                    // Auto-validate loaded config (silent mode - shows badge only)
                    if (typeof validateConfig === 'function') {
                        validateConfig(true);
                    }

                    // Clear input to allow re-selecting the same file
                    fileInput.value = '';

                    // Hide loader
                    hideLoader();
                } catch (err) {
                    hideLoader();
                    console.error('Error loading file:', err);
                    alert('Error loading file: ' + err.message);
                    fileInput.value = '';
                }
            }, 50);
        };

        reader.onerror = function() {
            hideLoader();
            alert('Error reading file');
            fileInput.value = '';
        };

        reader.readAsText(file);
    });

    // FlowSphere JSON file input event listener
    const flowsphereJsonFileInput = document.getElementById('flowsphereJsonFile');
    if (flowsphereJsonFileInput) {
        flowsphereJsonFileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            const fileNameSpan = document.getElementById('flowsphereJsonFileName');
            if (file && fileNameSpan) {
                fileNameSpan.textContent = file.name;
                fileNameSpan.style.color = '#059669';

                const newFileNameInput = document.getElementById('newFileName');
                if (newFileNameInput && file.name) {
                    newFileNameInput.value = file.name;
                }
            }

            // Enable/disable Load Config button
            if (typeof updateLoadConfigButtonState === 'function') {
                updateLoadConfigButtonState('flowsphere-json');
            }
        });
    }

    // Postman file input event listener
    const postmanFileInput = document.getElementById('postmanCollectionFile');
    if (postmanFileInput) {
        postmanFileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            const fileNameSpan = document.getElementById('postmanFileName');
            if (file && fileNameSpan) {
                fileNameSpan.textContent = file.name;
                fileNameSpan.style.color = '#059669';

                const newFileNameInput = document.getElementById('newFileName');
                if (newFileNameInput) {
                    let baseName = file.name
                        .replace(/\.postman_collection\.json$/i, '')
                        .replace(/\.json$/i, '')
                        .replace(/\s+/g, '-')
                        .toLowerCase();
                    newFileNameInput.value = `config-${baseName}.json`;
                }
            }

            // Enable/disable Load Config button
            if (typeof updateLoadConfigButtonState === 'function') {
                updateLoadConfigButtonState('postman');
            }
        });
    }

    // Restore JSON preview collapse state from localStorage
    restoreJsonPreviewState();

    // Initialize Import Nodes button visibility
    if (typeof updateImportNodesButton === 'function') {
        updateImportNodesButton();
    }

    // Initialize Validate button visibility
    if (typeof updateValidateButton === 'function') {
        updateValidateButton();
    }

    // Load from localStorage with loader if config exists
    const savedConfig = localStorage.getItem('apiseq_config');
    if (savedConfig) {
        showLoader('Loading configuration...');
        // Use setTimeout to ensure loader displays before heavy work
        setTimeout(() => {
            loadFromLocalStorage();
            hideLoader();
        }, 50);
    }
});

/**
 * Toggle JSON preview panel collapse/expand
 */
function toggleJsonPreview() {
    const previewPanel = document.getElementById('previewPanel');
    const mainPanelsRow = document.getElementById('mainPanelsRow');
    const toggleIcon = document.getElementById('jsonPreviewToggleIcon');
    const jsonPreviewBody = document.getElementById('jsonPreviewBody');

    if (!previewPanel || !mainPanelsRow || !toggleIcon || !jsonPreviewBody) return;

    const isCollapsed = previewPanel.classList.contains('collapsed');

    if (isCollapsed) {
        // Expand: Keep content hidden during animation, show after
        jsonPreviewBody.style.display = 'none';

        // Start expand animation
        previewPanel.classList.remove('collapsed');
        mainPanelsRow.classList.remove('preview-collapsed');

        // Save expanded state to localStorage
        localStorage.setItem('flowsphere-json-preview-collapsed', 'false');

        // Wait for expand animation to complete, then show content
        setTimeout(() => {
            jsonPreviewBody.style.display = '';
        }, 320); // Wait for expand animation to complete (300ms transition)
    } else {
        // Collapse: Apply classes immediately for instant collapse
        previewPanel.classList.add('collapsed');
        mainPanelsRow.classList.add('preview-collapsed');
        // Keep the same icon class, rotation will be handled by CSS
        // toggleIcon.className = 'bi bi-chevron-left'; // Remove this line

        // Save collapsed state to localStorage
        localStorage.setItem('flowsphere-json-preview-collapsed', 'true');
    }
}

/**
 * Restore JSON preview collapse state from localStorage
 */
function restoreJsonPreviewState() {
    const previewPanel = document.getElementById('previewPanel');
    const mainPanelsRow = document.getElementById('mainPanelsRow');
    const toggleIcon = document.getElementById('jsonPreviewToggleIcon');

    if (!previewPanel || !mainPanelsRow || !toggleIcon) return;

    const isCollapsed = localStorage.getItem('flowsphere-json-preview-collapsed') === 'true';

    if (isCollapsed) {
        // Apply collapsed state immediately without animation
        previewPanel.classList.add('collapsed');
        mainPanelsRow.classList.add('preview-collapsed');
        // Icon rotation handled by CSS based on collapsed class
    }

    // Re-enable transitions after state is restored
    setTimeout(() => {
        const preloadStyle = document.getElementById('preloadJsonPreviewState');
        if (preloadStyle) {
            preloadStyle.remove();
        }
    }, 50);
}
