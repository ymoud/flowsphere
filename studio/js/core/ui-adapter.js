/**
 * UI Adapter
 *
 * Adapts the UI based on which features are loaded.
 * Hides functionality that depends on optional features.
 */

(function() {
    'use strict';

    // Debounce timer to prevent excessive updates
    let updateTimer = null;

    /**
     * Update UI visibility based on loaded features (internal, immediate)
     * Called after features are loaded or when feature states change
     */
    function updateUIForLoadedFeaturesImmediate() {
        // Hide/show theme toggle button
        const themeToggleBtn = document.querySelector('.theme-toggle[onclick*="safeToggleTheme"]');
        if (themeToggleBtn) {
            if (FeatureRegistry.isFeatureLoaded('theme-switcher')) {
                themeToggleBtn.style.display = '';
            } else {
                themeToggleBtn.style.display = 'none';
            }
        }

        // Hide/show Postman import template option
        const postmanTemplateOption = document.querySelector('.template-option[onclick*="postman"]');
        if (postmanTemplateOption) {
            if (FeatureRegistry.isFeatureLoaded('postman-parser')) {
                postmanTemplateOption.style.display = '';
            } else {
                postmanTemplateOption.style.display = 'none';
            }
        }

        // Hide/show drag handles when drag-drop feature not loaded
        const dragHandles = document.querySelectorAll('.drag-handle');
        const isDragDropLoaded = FeatureRegistry.isFeatureLoaded('drag-drop');
        dragHandles.forEach(handle => {
            if (isDragDropLoaded) {
                handle.style.display = '';
            } else {
                handle.style.display = 'none';
            }
        });

        // Also update draggable attributes on accordion items
        const accordionItems = document.querySelectorAll('.accordion-item[draggable]');
        if (!isDragDropLoaded) {
            accordionItems.forEach(item => {
                item.removeAttribute('draggable');
            });
        }

        // Update Validate button visibility based on config-validator feature
        if (typeof updateValidateButton === 'function') {
            updateValidateButton();
        }

        console.log('[UI Adapter] Updated UI for loaded features');
    }

    /**
     * Update UI visibility (debounced version)
     * Prevents excessive calls by batching updates within 100ms
     */
    function updateUIForLoadedFeatures() {
        // Clear existing timer
        if (updateTimer) {
            clearTimeout(updateTimer);
        }

        // Schedule update
        updateTimer = setTimeout(() => {
            updateUIForLoadedFeaturesImmediate();
            updateTimer = null;
        }, 100);
    }

    /**
     * Update UI visibility immediately (no debouncing)
     * Use this for critical updates that can't wait
     */
    function updateUIForLoadedFeaturesNow() {
        if (updateTimer) {
            clearTimeout(updateTimer);
            updateTimer = null;
        }
        updateUIForLoadedFeaturesImmediate();
    }

    /**
     * Initialize UI adapter
     * Sets up observers for when new UI elements are added
     */
    function init() {
        // Initial update (immediate, no debounce)
        updateUIForLoadedFeaturesNow();

        // Re-update when modals are shown (in case template options are re-rendered)
        const newConfigModal = document.getElementById('newConfigModal');
        if (newConfigModal) {
            newConfigModal.addEventListener('shown.bs.modal', function() {
                updateUIForLoadedFeatures(); // Debounced is fine here
            });
        }

        console.log('[UI Adapter] Initialized');
    }

    // Export functions
    window.UIAdapter = {
        init,
        updateUIForLoadedFeatures,
        updateUIForLoadedFeaturesNow
    };
})();
