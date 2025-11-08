// Config file management functions (load, save, download, localStorage)

function saveToLocalStorage() {
    if (config) {
        localStorage.setItem('apiseq_config', JSON.stringify(config));
        localStorage.setItem('apiseq_fileName', fileName);
        updateAutoSaveIndicator();
    }
}

function updateAutoSaveIndicator() {
    const indicator = document.getElementById('autoSaveIndicator');
    if (!indicator) return;

    indicator.style.display = 'inline';
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    indicator.textContent = `✓ Auto-saved at ${timeStr}`;
    indicator.style.color = '#10b981';

    setTimeout(() => {
        indicator.style.color = '#6b7280';
    }, 2000);
}

function updateFileNameDisplay() {
    const fileNameElement = document.getElementById('fileNameText');
    const fileNameContainer = document.getElementById('fileNameContainer');

    if (fileNameElement) {
        if (config) {
            fileNameElement.textContent = fileName;
            fileNameElement.style.color = '#374151';
            // Show file name container by adding d-flex class
            if (fileNameContainer) {
                fileNameContainer.classList.add('d-flex');
                fileNameContainer.style.display = '';
            }
        } else {
            fileNameElement.textContent = '-';
            fileNameElement.style.color = '#9ca3af';
            // Hide file name container by removing d-flex class and setting display none
            if (fileNameContainer) {
                fileNameContainer.classList.remove('d-flex');
                fileNameContainer.style.display = 'none';
            }
        }
    }
}

function updateImportNodesButton() {
    const btn = document.getElementById('importNodesBtn');
    if (!btn) return;

    // Show button only if config is loaded
    btn.style.display = config ? 'inline-block' : 'none';
}

function renameFile() {
    if (!config) {
        alert('No file is currently open');
        return;
    }

    // Get current name without extension
    const currentNameWithoutExt = fileName.replace(/\.json$/, '');

    const newName = prompt('Enter new file name:', currentNameWithoutExt);

    if (newName === null) {
        // User cancelled
        return;
    }

    if (!newName || newName.trim() === '') {
        alert('File name cannot be empty');
        return;
    }

    // Clean up the name and ensure .json extension
    const cleanedName = newName.trim();
    const newFileName = cleanedName.endsWith('.json') ? cleanedName : cleanedName + '.json';

    // Validate file name (no invalid characters)
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(newFileName)) {
        alert('File name contains invalid characters: < > : " / \\ | ? *');
        return;
    }

    // Update the file name
    fileName = newFileName;
    updateFileNameDisplay();
    saveToLocalStorage();

    // Show success feedback
    const indicator = document.getElementById('autoSaveIndicator');
    if (indicator) {
        indicator.style.display = 'inline';
        indicator.textContent = '✓ Renamed to ' + fileName;
        indicator.style.color = '#10b981';

        setTimeout(() => {
            indicator.style.display = 'none';
        }, 3000);
    }
}

function loadFile() {
    document.getElementById('fileInput').click();
}

function downloadFile() {
    if (!config) {
        alert('No configuration to download');
        return;
    }

    const json = JSON.stringify(config, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
}

function closeFile() {
    if (!config) return;

    if (confirm('Close the current file? Any unsaved changes will be lost.')) {
        config = null;
        fileName = 'config.json';
        localStorage.removeItem('apiseq_config');
        localStorage.removeItem('apiseq_fileName');
        updateFileNameDisplay();

        const editorContent = document.getElementById('editorContent');
        // Use the shared empty state component for consistency
        editorContent.innerHTML = getEmptyStateHTML();
        editorContent.classList.add('empty-state');
        updatePreview();

        // Hide Run Sequence button
        if (typeof updateRunSequenceButton === 'function') {
            updateRunSequenceButton();
        }

        // Hide Import Nodes button
        updateImportNodesButton();

        // Hide file actions dropdown
        const fileActionsDropdown = document.getElementById('fileActionsDropdown');
        if (fileActionsDropdown) fileActionsDropdown.style.display = 'none';

        // Clear auto-save indicator
        const autoSaveIndicator = document.getElementById('autoSaveIndicator');
        if (autoSaveIndicator) {
            autoSaveIndicator.textContent = '';
            autoSaveIndicator.style.display = 'none';
        }
    }
}

function loadFromLocalStorage() {
    const savedConfig = localStorage.getItem('apiseq_config');
    const savedFileName = localStorage.getItem('apiseq_fileName');

    if (savedConfig) {
        try {
            config = JSON.parse(savedConfig);
            fileName = savedFileName || 'config.json';
            updateFileNameDisplay();
            renderEditor();
            updatePreview();

            // Show Import Nodes button
            updateImportNodesButton();

            // Scroll JSON preview to top when loading from localStorage
            if (typeof scrollJsonPreviewToTop === 'function') {
                scrollJsonPreviewToTop();
            }

            // Show file actions dropdown
            const fileActionsDropdown = document.getElementById('fileActionsDropdown');
            if (fileActionsDropdown) fileActionsDropdown.style.display = 'inline-block';
        } catch (err) {
            console.error('Error loading from localStorage:', err);
        }
    }
}

// Export functions to global scope for onclick handlers
window.loadFile = loadFile;
window.downloadFile = downloadFile;
window.closeFile = closeFile;
window.copyJSON = copyJSON;
window.positionTooltip = positionTooltip;
