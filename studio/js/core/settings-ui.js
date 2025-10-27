/**
 * Settings UI
 *
 * Provides user interface for managing features and preferences.
 */

(function() {
    'use strict';

    /**
     * Show the settings modal
     */
    function showSettings() {
        const modal = document.getElementById('settingsModal');
        if (!modal) {
            console.error('[SettingsUI] Settings modal not found');
            return;
        }

        renderFeaturesTab();

        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }

    /**
     * Render the features tab
     */
    function renderFeaturesTab() {
        const container = document.getElementById('featuresTabContent');
        if (!container) return;

        const features = FeatureRegistry.getAllFeatures();
        const categories = {};

        // Group features by category
        Object.keys(features).forEach(featureId => {
            const feature = features[featureId];
            if (!categories[feature.category]) {
                categories[feature.category] = [];
            }
            categories[feature.category].push({ id: featureId, ...feature });
        });

        let html = '<div class="settings-features">';

        // Render each category
        Object.keys(categories).sort().forEach(category => {
            html += `
                <div class="feature-category mb-4">
                    <h6 class="text-muted text-uppercase small fw-bold mb-3">${category}</h6>
            `;

            categories[category].forEach(feature => {
                const isEnabled = feature.enabled;
                const isLoaded = feature.loaded;
                const isBuiltIn = feature.script === null; // Built-in features (controlled by flags)
                const needsReload = !isBuiltIn && !isLoaded && isEnabled;

                // For built-in features, show enabled/disabled based on checkbox state
                // For external scripts, show loaded/enabled/disabled based on actual loading state
                let statusBadge;
                if (isBuiltIn) {
                    // Built-in feature: always "loaded" but controlled by flag
                    statusBadge = isEnabled
                        ? '<span class="badge bg-success">Enabled</span>'
                        : '<span class="badge bg-secondary">Disabled</span>';
                } else {
                    // External script feature
                    statusBadge = isLoaded
                        ? '<span class="badge bg-success">Loaded</span>'
                        : isEnabled
                            ? '<span class="badge bg-warning">Enabled (reload required)</span>'
                            : '<span class="badge bg-secondary">Disabled</span>';
                }

                // Show warning if feature needs reload
                const reloadWarning = needsReload
                    ? `<div class="alert alert-warning py-2 px-3 mt-2 mb-0 small">
                         <i class="bi bi-exclamation-triangle-fill me-1"></i>
                         <strong>Reload required:</strong> This feature will be available after reloading the page.
                       </div>`
                    : '';

                // Show info icon for external script features
                const reloadInfoIcon = !isBuiltIn
                    ? `<i class="bi bi-info-circle text-muted ms-1"
                          data-bs-toggle="tooltip"
                          data-bs-placement="top"
                          title="Toggling this feature will automatically reload the page"
                          style="font-size: 0.9rem; cursor: help;"></i>`
                    : '';

                html += `
                    <div class="card mb-2">
                        <div class="card-body p-3">
                            <div class="d-flex align-items-start justify-content-between">
                                <div class="flex-grow-1">
                                    <div class="d-flex align-items-center gap-2 mb-1">
                                        <h6 class="mb-0">${feature.name}${reloadInfoIcon}</h6>
                                        ${statusBadge}
                                    </div>
                                    <p class="text-muted small mb-0">${feature.description}</p>
                                    ${reloadWarning}
                                </div>
                                <div class="form-check form-switch ms-3">
                                    <input class="form-check-input" type="checkbox"
                                           id="feature-${feature.id}"
                                           ${isEnabled ? 'checked' : ''}
                                           onchange="toggleFeature('${feature.id}', this.checked)">
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });

            html += '</div>';
        });

        html += '</div>';

        container.innerHTML = html;

        // Initialize Bootstrap tooltips
        const tooltipTriggerList = container.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltipTriggerList.forEach(tooltipTriggerEl => {
            new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }

    /**
     * Toggle a feature on/off
     * @param {string} featureId - The feature ID
     * @param {boolean} enabled - Whether to enable or disable
     */
    function toggleFeature(featureId, enabled) {
        const features = FeatureRegistry.getAllFeatures();
        const feature = features[featureId];
        const isBuiltIn = feature && feature.script === null;

        if (enabled) {
            FeatureRegistry.enableFeature(featureId)
                .then(() => {
                    console.log(`[SettingsUI] Enabled feature: ${featureId}`);

                    // For external script features, auto-reload after a brief delay
                    if (!isBuiltIn) {
                        // Show a toast-style notification
                        showReloadNotification(featureId);

                        // Auto-reload after 1.5 seconds to give user time to see the change
                        setTimeout(() => {
                            console.log(`[SettingsUI] Auto-reloading to load feature: ${featureId}`);
                            window.location.reload();
                        }, 1500);
                    } else {
                        // Built-in feature - just update UI
                        renderFeaturesTab();
                        if (typeof UIAdapter !== 'undefined' && UIAdapter.updateUIForLoadedFeaturesNow) {
                            UIAdapter.updateUIForLoadedFeaturesNow();
                        }
                    }
                })
                .catch(error => {
                    console.error(`[SettingsUI] Failed to enable feature: ${featureId}`, error);
                    alert(`Failed to enable feature: ${error.message}`);
                    // Revert checkbox
                    document.getElementById(`feature-${featureId}`).checked = false;
                });
        } else {
            FeatureRegistry.disableFeature(featureId);
            console.log(`[SettingsUI] Disabled feature: ${featureId}`);

            // For external script features, auto-reload to unload the feature
            if (!isBuiltIn && feature.loaded) {
                // Show a toast-style notification
                showReloadNotification(featureId, false); // false = disabling

                // Auto-reload after 1.5 seconds
                setTimeout(() => {
                    console.log(`[SettingsUI] Auto-reloading to unload feature: ${featureId}`);
                    window.location.reload();
                }, 1500);
            } else {
                // Built-in feature or already unloaded - just update UI
                renderFeaturesTab();
                if (typeof UIAdapter !== 'undefined' && UIAdapter.updateUIForLoadedFeaturesNow) {
                    UIAdapter.updateUIForLoadedFeaturesNow();
                }
            }
        }
    }

    /**
     * Show a notification that the page will reload
     * @param {string} featureId - The feature ID
     * @param {boolean} isEnabling - True if enabling, false if disabling
     */
    function showReloadNotification(featureId, isEnabling = true) {
        const features = FeatureRegistry.getAllFeatures();
        const feature = features[featureId];
        const featureName = feature ? feature.name : featureId;

        const action = isEnabling ? 'Enabling' : 'Disabling';

        // Create toast notification
        const toast = document.createElement('div');
        toast.className = 'position-fixed top-0 start-50 translate-middle-x mt-3';
        toast.style.zIndex = '9999';
        toast.innerHTML = `
            <div class="alert alert-info d-flex align-items-center shadow-lg" role="alert">
                <i class="bi bi-arrow-clockwise me-2"></i>
                <strong>Reloading...</strong> ${action} ${featureName}
            </div>
        `;
        document.body.appendChild(toast);

        // Remove after animation
        setTimeout(() => {
            toast.remove();
        }, 2000);
    }

    // Export functions to window
    window.showSettings = showSettings;
    window.toggleFeature = toggleFeature;
})();
