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

    // Initialize autocomplete
    initAutocomplete();

    // File input event listener
    const fileInput = document.getElementById('fileInput');
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = function(e) {
            const jsonText = e.target.result;
            let parsed;

            // Step 1: Try to parse JSON
            try {
                parsed = JSON.parse(jsonText);
            } catch (parseErr) {
                console.error('Invalid JSON:', parseErr);
                alert('Invalid JSON: ' + parseErr.message);
                fileInput.value = '';
                return; // STOP - invalid JSON
            }

            // Step 2: Validate it's a valid config structure
            if (!parsed || typeof parsed !== 'object') {
                alert('Invalid config: Root must be an object');
                fileInput.value = '';
                return; // STOP - invalid config
            }

            if (!Array.isArray(parsed.steps)) {
                alert('Invalid config: Missing or invalid "steps" array');
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
                    alert('Warning: Configuration is too large to persist in localStorage. It will not be saved between page refreshes.');
                }
            }

            // Step 5: Render UI
            updateFileNameDisplay();
            renderEditor();
            updatePreview();

            // Show download and close buttons
            const downloadBtn = document.getElementById('downloadBtn');
            const closeBtn = document.getElementById('closeBtn');
            if (downloadBtn) downloadBtn.style.display = 'inline-block';
            if (closeBtn) closeBtn.style.display = 'inline-block';

            // Clear input to allow re-selecting the same file
            fileInput.value = '';
        };

        reader.onerror = function() {
            alert('Error reading file');
            fileInput.value = '';
        };

        reader.readAsText(file);
    });

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
        });
    }

    // Load from localStorage
    loadFromLocalStorage();
});
