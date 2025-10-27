// Global application state
let config = null;
let fileName = 'config.json';
let openStepIndices = new Set(); // Track which steps are currently open

// Autocomplete state
let autocompleteDropdown = null;
let autocompleteTarget = null;
let autocompleteSelectedIndex = -1;
let autocompleteSuggestions = [];
let autocompleteStepIndex = null; // Track the step index for current autocomplete session

// Empty state component - returns consistent HTML for both initial load and after closing files
function getEmptyStateHTML() {
    // Detect if Bootstrap 5 is being used (check for Bootstrap icon class support)
    const isBootstrap5 = document.querySelector('link[href*="bootstrap"]') &&
                        document.querySelector('link[href*="bootstrap-icons"]');

    if (isBootstrap5) {
        // Bootstrap 5 version with Bootstrap icons
        return `
            <div class="empty-state text-center py-5">
                <i class="bi bi-file-earmark-text fs-1 opacity-25"></i>
                <p class="mt-3 text-muted">No configuration loaded</p>
                <p class="small text-muted">Use "Load Config" to open a file or "New Config" to create one</p>
            </div>
        `;
    } else {
        // Original version with custom SVG
        return `
            <div class="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3>No Configuration Loaded</h3>
                <p>Load an existing config or create a new one to get started</p>
            </div>
        `;
    }
}

// Export to global scope
window.getEmptyStateHTML = getEmptyStateHTML;
