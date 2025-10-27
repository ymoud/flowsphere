/**
 * Safe Wrappers for Optional Features
 *
 * Provides graceful degradation when optional features are not loaded.
 * These wrappers check if features exist before calling them.
 */

(function() {
    'use strict';

    /**
     * Safe wrapper for toggleTheme()
     * Falls back to basic theme toggle if theme-switcher is not loaded
     */
    window.safeToggleTheme = function() {
        if (typeof toggleTheme === 'function') {
            toggleTheme();
        } else {
            // Fallback: basic theme toggle without persistence
            console.log('[SafeWrappers] Theme switcher not loaded - using fallback');
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);

            // Update icon if elements exist
            const themeIcon = document.getElementById('themeIcon');
            const themeText = document.getElementById('themeText');
            if (themeIcon && themeText) {
                if (newTheme === 'dark') {
                    themeIcon.className = 'bi bi-moon-fill';
                    themeText.textContent = 'Dark';
                } else {
                    themeIcon.className = 'bi bi-sun-fill';
                    themeText.textContent = 'Light';
                }
            }
        }
    };

    /**
     * Safe wrapper for Postman import
     * This should never be called since UI hides the option when feature not loaded
     */
    window.safeHandlePostmanImport = function() {
        if (typeof handlePostmanImport === 'function') {
            return handlePostmanImport();
        } else {
            console.warn('[SafeWrappers] Postman parser not loaded - this should not happen as UI should hide the option');
            return false;
        }
    };

    /**
     * Check if a feature is available
     * @param {string} featureName - Name of the feature to check
     * @returns {boolean} True if feature is available
     */
    window.isFeatureAvailable = function(featureName) {
        switch(featureName) {
            case 'autocomplete':
                return typeof initAutocomplete === 'function';
            case 'theme-switcher':
                return typeof toggleTheme === 'function';
            case 'postman-parser':
                return typeof handlePostmanImport === 'function';
            case 'drag-drop':
                return typeof initDragDrop === 'function';
            default:
                return false;
        }
    };

    console.log('[SafeWrappers] Initialized safe wrappers for optional features');
})();
