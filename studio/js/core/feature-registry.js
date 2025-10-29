/**
 * Feature Registry System
 *
 * Manages optional plug-and-play features for FlowSphere Studio.
 * Provides enable/disable functionality with graceful degradation.
 */

const FeatureRegistry = (function() {
    'use strict';

    // Feature definitions
    const features = {
        'theme-switcher': {
            name: 'Theme Switcher',
            description: 'Toggle between dark and light themes',
            script: 'js/theme-switcher.js',
            enabled: true,
            loaded: false,
            essential: false,
            category: 'UI Enhancement'
        },
        'autocomplete': {
            name: 'Variable Autocomplete',
            description: 'Smart autocomplete for {{ }} variable syntax',
            script: 'js/autocomplete.js',
            enabled: true,
            loaded: false,
            essential: false,
            category: 'Productivity'
        },
        'drag-drop': {
            name: 'Drag-and-Drop Reordering',
            description: 'Reorder nodes by dragging',
            script: 'js/drag-drop-handler.js',
            enabled: true,
            loaded: false,
            essential: false,
            category: 'Productivity'
        },
        'postman-parser': {
            name: 'Postman Import',
            description: 'Import Postman collections',
            script: 'js/postman-parser.js',
            enabled: true,
            loaded: false,
            essential: false,
            category: 'Import/Export'
        },
        'json-scroll-sync': {
            name: 'JSON Preview Auto-Scroll',
            description: 'Automatically scroll JSON preview to match edited sections',
            script: null, // Built into form-handlers.js, controlled by flag
            enabled: true,
            loaded: true,
            essential: false,
            category: 'UI Enhancement'
        },
        'try-it-out': {
            name: 'Try it Out',
            description: 'Test individual nodes in isolation with dependency mocking',
            script: 'js/try-it-out.js',
            enabled: true,
            loaded: false,
            essential: false,
            category: 'Testing'
        }
    };

    // Storage key for feature preferences
    const STORAGE_KEY = 'flowsphere-features';

    /**
     * Initialize the feature registry
     */
    function init() {
        loadFeaturePreferences();
        console.log('[FeatureRegistry] Initialized');
    }

    /**
     * Load feature preferences from localStorage
     */
    function loadFeaturePreferences() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const preferences = JSON.parse(stored);
                Object.keys(preferences).forEach(featureId => {
                    if (features[featureId]) {
                        features[featureId].enabled = preferences[featureId];
                    }
                });
                console.log('[FeatureRegistry] Loaded feature preferences');
            }
        } catch (error) {
            console.warn('[FeatureRegistry] Failed to load preferences:', error);
        }
    }

    /**
     * Save feature preferences to localStorage
     */
    function saveFeaturePreferences() {
        try {
            const preferences = {};
            Object.keys(features).forEach(featureId => {
                preferences[featureId] = features[featureId].enabled;
            });
            localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
            console.log('[FeatureRegistry] Saved feature preferences');
        } catch (error) {
            console.warn('[FeatureRegistry] Failed to save preferences:', error);
        }
    }

    /**
     * Load a feature script dynamically
     * @param {string} featureId - The feature ID
     * @returns {Promise} Promise that resolves when script is loaded
     */
    function loadFeature(featureId) {
        return new Promise((resolve, reject) => {
            const feature = features[featureId];

            if (!feature) {
                reject(new Error(`Feature "${featureId}" not found`));
                return;
            }

            if (feature.loaded) {
                console.log(`[FeatureRegistry] Feature "${featureId}" already loaded`);
                resolve();
                return;
            }

            if (!feature.script) {
                console.log(`[FeatureRegistry] Feature "${featureId}" has no script (built-in)`);
                feature.loaded = true;
                resolve();
                return;
            }

            console.log(`[FeatureRegistry] Loading feature "${featureId}" from ${feature.script}`);

            const script = document.createElement('script');
            script.src = feature.script;
            script.async = false; // Load in order

            script.onload = () => {
                feature.loaded = true;
                console.log(`[FeatureRegistry] Successfully loaded feature "${featureId}"`);

                // Trigger feature initialization if available
                const initFunctionName = `init${featureId.split('-').map(word =>
                    word.charAt(0).toUpperCase() + word.slice(1)
                ).join('')}`;

                if (typeof window[initFunctionName] === 'function') {
                    try {
                        window[initFunctionName]();
                        console.log(`[FeatureRegistry] Initialized feature "${featureId}"`);
                    } catch (error) {
                        console.warn(`[FeatureRegistry] Failed to initialize feature "${featureId}":`, error);
                    }
                }

                resolve();
            };

            script.onerror = () => {
                console.error(`[FeatureRegistry] Failed to load feature "${featureId}"`);
                reject(new Error(`Failed to load script: ${feature.script}`));
            };

            document.head.appendChild(script);
        });
    }

    /**
     * Load all enabled features
     * @returns {Promise} Promise that resolves when all features are loaded
     */
    function loadEnabledFeatures() {
        const promises = [];

        Object.keys(features).forEach(featureId => {
            if (features[featureId].enabled && !features[featureId].loaded) {
                promises.push(
                    loadFeature(featureId).catch(error => {
                        console.warn(`[FeatureRegistry] Feature "${featureId}" failed to load, continuing without it:`, error);
                        // Don't reject - graceful degradation
                        return null;
                    })
                );
            }
        });

        return Promise.all(promises);
    }

    /**
     * Enable a feature
     * @param {string} featureId - The feature ID
     * @param {boolean} savePreference - Whether to save to localStorage
     * @returns {Promise} Promise that resolves when feature is enabled
     */
    function enableFeature(featureId, savePreference = true) {
        const feature = features[featureId];

        if (!feature) {
            return Promise.reject(new Error(`Feature "${featureId}" not found`));
        }

        feature.enabled = true;

        if (savePreference) {
            saveFeaturePreferences();
        }

        // Load the feature if not already loaded
        if (!feature.loaded) {
            return loadFeature(featureId);
        }

        return Promise.resolve();
    }

    /**
     * Disable a feature
     * @param {string} featureId - The feature ID
     * @param {boolean} savePreference - Whether to save to localStorage
     */
    function disableFeature(featureId, savePreference = true) {
        const feature = features[featureId];

        if (!feature) {
            console.warn(`[FeatureRegistry] Feature "${featureId}" not found`);
            return;
        }

        feature.enabled = false;

        if (savePreference) {
            saveFeaturePreferences();
        }

        console.log(`[FeatureRegistry] Disabled feature "${featureId}". Reload page for full effect.`);
    }

    /**
     * Check if a feature is enabled
     * @param {string} featureId - The feature ID
     * @returns {boolean} True if enabled
     */
    function isFeatureEnabled(featureId) {
        return features[featureId]?.enabled || false;
    }

    /**
     * Check if a feature is loaded
     * @param {string} featureId - The feature ID
     * @returns {boolean} True if loaded
     */
    function isFeatureLoaded(featureId) {
        return features[featureId]?.loaded || false;
    }

    /**
     * Get all features
     * @returns {Object} All features
     */
    function getAllFeatures() {
        return { ...features };
    }

    /**
     * Get features by category
     * @param {string} category - The category name
     * @returns {Object} Features in the category
     */
    function getFeaturesByCategory(category) {
        const result = {};
        Object.keys(features).forEach(featureId => {
            if (features[featureId].category === category) {
                result[featureId] = features[featureId];
            }
        });
        return result;
    }

    // Public API
    return {
        init,
        loadFeature,
        loadEnabledFeatures,
        enableFeature,
        disableFeature,
        isFeatureEnabled,
        isFeatureLoaded,
        getAllFeatures,
        getFeaturesByCategory
    };
})();

// Export to window for global access
window.FeatureRegistry = FeatureRegistry;
