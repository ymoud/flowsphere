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
    if (fileNameElement) {
        if (config) {
            fileNameElement.textContent = fileName;
            fileNameElement.style.color = '#374151';
        } else {
            fileNameElement.textContent = 'No file open';
            fileNameElement.style.color = '#9ca3af';
        }
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

        // Hide download and close buttons
        const downloadBtn = document.getElementById('downloadBtn');
        const closeBtn = document.getElementById('closeBtn');
        if (downloadBtn) downloadBtn.style.display = 'none';
        if (closeBtn) closeBtn.style.display = 'none';

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

            // Scroll JSON preview to top when loading from localStorage
            if (typeof scrollJsonPreviewToTop === 'function') {
                scrollJsonPreviewToTop();
            }
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
