// Theme Switcher for API FlowSphere
// Handles dark/light theme toggling with localStorage persistence

/**
 * Initialize theme on page load
 */
function initTheme() {
    // Check localStorage for saved theme, default to 'dark'
    const savedTheme = localStorage.getItem('flowsphere-theme') || 'dark';
    setTheme(savedTheme, false); // false = don't save again
}

/**
 * Toggle between dark and light themes
 */
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme, true); // true = save to localStorage
}

/**
 * Set the theme and update UI elements
 * @param {string} theme - 'dark' or 'light'
 * @param {boolean} save - Whether to save to localStorage
 */
function setTheme(theme, save) {
    // Set theme attribute on document root
    document.documentElement.setAttribute('data-theme', theme);

    // Update button icon and text
    const themeIcon = document.getElementById('themeIcon');
    const themeText = document.getElementById('themeText');

    if (theme === 'dark') {
        themeIcon.className = 'bi bi-moon-fill';
        themeText.textContent = 'Dark';
    } else {
        themeIcon.className = 'bi bi-sun-fill';
        themeText.textContent = 'Light';
    }

    // Save to localStorage if requested
    if (save) {
        localStorage.setItem('flowsphere-theme', theme);
    }
}

// Initialize theme when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTheme);
} else {
    initTheme();
}

// Export functions to global scope
window.toggleTheme = toggleTheme;
window.initTheme = initTheme;
