# FlowSphere Studio - Plug-and-Play Architecture

Visual flow designer for creating and editing API workflow configurations with optional modular features.

## Architecture Overview

FlowSphere Studio uses a **Plug-and-Play Architecture** with a lightweight core UI and optional features that can be enabled or disabled based on your needs.

**Benefits:**
- Faster initial load time
- Better reliability (core UI never breaks from feature issues)
- Easier maintenance and testing
- Customizable experience with graceful degradation
- Users can enable/disable features via Settings

## Structure

```
config-editor/
├── index.html          # Main HTML file
├── css/
│   └── styles.css      # All CSS styles
└── js/
    ├── core/           # Core system (always loaded)
    │   ├── feature-registry.js   # Feature management system
    │   ├── settings-ui.js        # Settings modal UI
    │   └── safe-wrappers.js      # Graceful degradation wrappers
    ├── state.js                  # Global application state
    ├── config-manager.js         # File operations (load, save, localStorage)
    ├── templates.js              # Config templates
    ├── bootstrap-modal-bridge.js # Bootstrap modal integration
    ├── ui-renderer-bootstrap.js  # Bootstrap UI renderer
    ├── form-handlers.js          # Form input handlers
    ├── modals.js                 # Modal dialogs
    ├── main.js                   # Initialization and event listeners
    ├── theme-switcher.js         # [OPTIONAL] Dark/light theme toggle
    ├── autocomplete.js           # [OPTIONAL] Variable autocomplete
    ├── drag-drop-handler.js      # [OPTIONAL] Drag-and-drop reordering
    ├── postman-parser.js         # [OPTIONAL] Postman import
    └── (json-scroll-sync)        # [OPTIONAL] Built into form-handlers.js
```

## Modules

### Core System (Always Loaded)

**core/feature-registry.js**
- Feature management and loading system
- `FeatureRegistry.init()` - Initialize feature system
- `FeatureRegistry.enableFeature(id)` / `disableFeature(id)` - Manage features
- `FeatureRegistry.loadEnabledFeatures()` - Load all enabled features
- Stores feature preferences in localStorage

**core/settings-ui.js**
- Settings modal UI
- `showSettings()` - Display settings modal
- Feature toggle interface
- About tab with architecture info

**core/safe-wrappers.js**
- Graceful degradation wrappers
- `safeToggleTheme()` - Safe theme toggle with fallback
- `isFeatureAvailable(name)` - Check if feature is loaded

### Core Modules (Always Loaded)

**state.js**
- Global application state: `config`, `fileName`, `openNodeIndices`

**config-manager.js**
- File operations: load, save, localStorage persistence
- `saveToLocalStorage()`, `loadFromLocalStorage()`
- `loadFile()`, `downloadFile()`, `closeFile()`

**templates.js**
- Config templates: empty, simple, oauth, user-input
- `getTemplate(type)` - Returns template configs

**bootstrap-modal-bridge.js**
- Bootstrap modal integration

**ui-renderer-bootstrap.js**
- Main UI renderer using Bootstrap 5
- `renderEditor()` - Main editor layout
- `renderGlobalVariables()`, `renderDefaultHeaders()`, `renderDefaultValidations()`
- `renderSteps()` - Node list rendering
- Includes safe autocomplete wrappers for graceful degradation

**modals.js**
- Modal dialogs for conditions, validations, prompts, headers
- Template selection and new config creation
- Includes safe autocomplete wrappers

**form-handlers.js**
- Form input handlers
- Add/update/remove operations for variables, headers, nodes

**main.js**
- Application initialization
- Event listeners and DOMContentLoaded handler
- Safe initialization of optional features

### Optional Features (Can Be Disabled)

**theme-switcher.js** *(Productivity - Enabled by default)*
- Dark/light theme toggle
- `toggleTheme()`, `setTheme(theme, save)`
- Persists theme preference to localStorage
- Auto-initializes when loaded

**autocomplete.js** *(Productivity - Enabled by default)*
- Smart autocomplete for `{{ }}` variable syntax
- `initAutocomplete()` - Initialize system
- `attachAutocompleteToInput(input, stepIndex, mode)` - Attach to inputs
- Context-aware suggestions (global vars, response refs, user input)
- Keyboard navigation support

**drag-drop-handler.js** *(Productivity - Enabled by default)*
- Drag-and-drop node reordering
- Touch and mouse support
- Visual feedback during drag operations

**json-scroll-sync** *(UI Enhancement - Enabled by default)*
- Auto-scroll JSON preview to match edited sections
- Implemented in `form-handlers.js` via feature flag
- Functions: `scrollJsonPreviewToTop()`, `scrollToJsonSection(section)`
- Automatically scrolls when opening/editing nodes

**postman-parser.js** *(Import/Export - Enabled by default)*
- Import Postman collections
- `parsePostmanCollection(collection)` - Convert to config format
- Auto-detect dependencies between requests

## Managing Features

### Using the Settings UI

1. Click the **Settings** button in the top-right header
2. Go to the **Features** tab
3. Toggle features on/off using the switches
4. **External script features** (theme-switcher, autocomplete, drag-drop, postman-parser):
   - Shows info icon (ℹ️) with tooltip: "Toggling this feature will automatically reload the page"
   - When enabled: Page automatically reloads after 1.5 seconds
   - When disabled: Page automatically reloads after 1.5 seconds
   - Toast notification shows: "Reloading... Enabling/Disabling [Feature Name]"
5. **Built-in features** (json-scroll-sync):
   - No info icon (no reload needed)
   - Take effect immediately when toggled

### Feature States

For **external script features** (theme-switcher, autocomplete, drag-drop, postman-parser):
- **Loaded** (green badge): Feature script is loaded and active
- **Enabled (reload required)** (yellow badge): Feature is enabled but not yet loaded
  - Shows inline warning: "Reload required: This feature will be available after reloading the page"
  - Toggling (enable/disable) triggers automatic page reload after 1.5 seconds
- **Disabled** (gray badge): Feature is disabled

For **built-in features** (json-scroll-sync):
- **Enabled** (green badge): Feature is active
- **Disabled** (gray badge): Feature is disabled
- Takes effect immediately without requiring a reload

### Graceful Degradation

If a feature is disabled:
- The core UI continues to work normally
- Feature-specific functionality is skipped silently
- No errors are thrown
- Fallback behavior is provided where applicable (e.g., theme toggle)

## Usage

### Local Development

Open `index.html` directly in a browser:

```bash
# From project root
open config-editor/index.html        # macOS
start config-editor/index.html       # Windows
xdg-open config-editor/index.html    # Linux
```

### Web Server

For production, serve via HTTP:

```bash
# Python
python -m http.server 8000
# Then visit: http://localhost:8000/config-editor/

# Node.js (with http-server)
npx http-server
```

## Features

### Core Features (Always Available)

- **Visual Editing**: Form-based interface for all config options
- **Auto-save**: Configs automatically saved to localStorage
- **Live Preview**: Real-time JSON preview with copy-to-clipboard
- **Templates**: Quick-start templates for common use cases
- **JSON Preview Toggle**: Collapsible JSON panel to maximize editor space
- **Settings Panel**: Manage optional features via intuitive UI

### Optional Features (Can Be Disabled)

- **Theme Switcher**: Toggle between dark and light themes
- **Variable Autocomplete**: Intelligent suggestions for `{{ }}` syntax
  - Triggers on typing `{{`
  - Context-aware suggestions (global vars, response refs, user input)
  - Keyboard navigation (↑/↓, Enter, Esc)
  - Positioned at text caret
- **Drag-and-Drop**: Reorder nodes by dragging them
- **JSON Preview Auto-Scroll**: Automatically scroll JSON preview to match edited sections
  - Syncs when opening/editing nodes
  - Can be disabled if auto-scrolling is distracting
- **Postman Import**: Convert Postman collections to config format

## Module Dependencies

### Load Order (Critical!)

Scripts are loaded in this specific order:

1. **Bootstrap** (external CDN)
2. **Core System**
   - `core/feature-registry.js` (no dependencies)
   - `core/settings-ui.js` → feature-registry.js
   - `core/safe-wrappers.js` (no dependencies)
3. **Core Modules**
   - `state.js` (no dependencies)
   - `templates.js` (no dependencies)
   - `bootstrap-modal-bridge.js` → state.js
   - `ui-renderer-bootstrap.js` → state.js
   - `form-handlers.js` → state.js, ui-renderer-bootstrap.js
   - `modals.js` → state.js, ui-renderer-bootstrap.js
   - `config-manager.js` → state.js, ui-renderer-bootstrap.js
   - `main.js` → all above modules
4. **Optional Features** (loaded dynamically by feature registry)
   - `theme-switcher.js` (self-initializing)
   - `autocomplete.js` → state.js
   - `drag-drop-handler.js` → state.js
   - `postman-parser.js` → state.js
   - `json-scroll-sync` (built into form-handlers.js, controlled by feature flag)

### Dynamic Loading

Optional features are loaded dynamically by the feature registry system:

```javascript
FeatureRegistry.init();
FeatureRegistry.loadEnabledFeatures()
    .then(() => console.log('Features loaded'))
    .catch(error => console.warn('Some features failed', error));
```

### Graceful Degradation Pattern

All references to optional features use safe wrappers:

```javascript
// Safe wrapper function
function safeAttachAutocomplete(input, stepIndex, mode) {
    if (typeof attachAutocompleteToInput === 'function') {
        attachAutocompleteToInput(input, stepIndex, mode);
    }
    // Silently skip if not loaded
}

// Usage
safeAttachAutocomplete(myInput, 0);  // Works whether autocomplete is loaded or not
```

**Global scope exports**: Each module exports functions to `window` object for inline onclick/onchange handlers in HTML. This maintains modular structure while keeping HTML markup simple.

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

Requires ES6 support and LocalStorage.
