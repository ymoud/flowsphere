// Main initialization and event listeners

// Wait for DOM to be ready
window.addEventListener('DOMContentLoaded', function() {
    // Initialize autocomplete
    initAutocomplete();

    // File input event listener
    document.getElementById('fileInput').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        fileName = file.name;
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                config = JSON.parse(e.target.result);
                updateFileNameDisplay();
                saveToLocalStorage();
                renderEditor();
                updatePreview();
            } catch (err) {
                alert('Error parsing JSON file: ' + err.message);
            }
        };
        reader.readAsText(file);
    });

    // Postman file input event listener
    document.getElementById('postmanCollectionFile').addEventListener('change', function(e) {
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

    // Load from localStorage
    loadFromLocalStorage();
});
