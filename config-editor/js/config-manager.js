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
        editorContent.innerHTML = `
            <div class="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3>No Configuration Loaded</h3>
                <p>Load an existing config or create a new one to get started</p>
            </div>
        `;
        editorContent.classList.add('empty-state');
        updatePreview();
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
