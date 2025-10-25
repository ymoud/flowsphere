# FlowSphere Studio - Modular Version

Visual flow designer for creating and editing API workflow configurations.

## Structure

```
config-editor/
├── index.html          # Main HTML file
├── css/
│   └── styles.css      # All CSS styles (16KB)
└── js/
    ├── state.js        # Global application state
    ├── config-manager.js      # File operations (load, save, localStorage)
    ├── templates.js           # Config templates (empty, simple, oauth, user-input)
    ├── postman-parser.js      # Postman collection import logic
    ├── form-handlers.js       # Update/add/remove functions for form inputs
    ├── ui-renderer.js         # Render functions for all UI components
    ├── modals.js              # Modal dialogs (conditions, validations, prompts, headers)
    ├── autocomplete.js        # Variable substitution autocomplete
    └── main.js                # Initialization and event listeners
```

## Modules

### Core Modules

**state.js** (307 bytes)
- Global variables: `config`, `fileName`, `openNodeIndices`
- Autocomplete state

**config-manager.js** (3.2KB)
- `saveToLocalStorage()` - Auto-save config
- `loadFromLocalStorage()` - Restore on page load
- `loadFile()` / `downloadFile()` / `closeFile()`
- `updateFileNameDisplay()`, `updateAutoSaveIndicator()`

**templates.js** (4.7KB)
- `getTemplate(type)` - Returns config templates
- Templates: empty, simple, oauth, user-input

**postman-parser.js** (4.2KB)
- `parsePostmanCollection(collection)` - Convert Postman to config format
- `handlePostmanImport()` - Process Postman file upload

### UI Modules

**ui-renderer.js** (17KB)
- `renderEditor()` - Main editor layout
- `renderGlobalVariables()` - Global variables section
- `renderDefaultHeaders()` - Default headers section
- `renderDefaultValidations()` - Default validations section
- `renderNodes()` - Nodes list
- `renderNodeForm(node, index)` - Individual node form
- `updatePreview()` - JSON preview panel
- `toggleSection()` - Collapsible sections

**modals.js** (30KB)
- `showConditionModal()` / `saveCondition()` / `closeConditionModal()`
- `showValidationModal()` / `saveValidation()` / `closeValidationModal()`
- `showPromptModal()` / `savePrompt()` / `closePromptModal()`
- `showHeaderModal()` / `saveHeader()` / `closeHeaderModal()`
- `createNew()` / `selectTemplate()` / `confirmNewConfig()`

**form-handlers.js** (7.1KB)
- `updateConfig()` - Update enableDebug, baseUrl, timeout
- `addGlobalVariable()` / `updateGlobalVariable()` / `removeGlobalVariable()`
- `addDefaultHeader()` / `updateDefaultHeader()` / `removeDefaultHeader()`
- `addNode()` / `updateNode()` / `removeNode()` / `moveNode()`

**autocomplete.js** (18KB)
- `initAutocomplete()` - Initialize autocomplete system
- `attachAutocompleteToInput(input, nodeIndex)` - Attach to text inputs
- `buildAutocompleteSuggestions(partialText, nodeIndex)` - Generate suggestions
- `showAutocomplete()` / `hideAutocomplete()` - Display/hide dropdown
- `getCaretCoordinates(input)` - Calculate caret position
- Keyboard navigation (arrow keys, enter, escape)

**main.js** (1.6KB)
- Event listeners (file input, Postman import)
- DOMContentLoaded handler
- Autocomplete initialization

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

- **Visual Editing**: Form-based interface for all config options
- **Auto-save**: Configs automatically saved to localStorage
- **Live Preview**: Real-time JSON preview with copy-to-clipboard
- **Templates**: Quick-start templates for common use cases
- **Postman Import**: Convert Postman collections to config format
- **Autocomplete**: Intelligent suggestions for variable substitution (`{{ }}`)
  - Triggers on typing `{{`
  - Context-aware suggestions (global vars, response refs, user input)
  - Keyboard navigation (↑/↓, Enter, Esc)
  - Positioned at text caret

## Module Dependencies

```
index.html
  ├─ css/styles.css
  └─ js/
      ├─ state.js                 (no dependencies)
      ├─ config-manager.js        → state.js, ui-renderer.js
      ├─ templates.js             (no dependencies)
      ├─ postman-parser.js        → state.js, config-manager.js
      ├─ form-handlers.js         → state.js, ui-renderer.js, config-manager.js
      ├─ ui-renderer.js           → state.js, form-handlers.js, autocomplete.js
      ├─ modals.js                → state.js, ui-renderer.js, config-manager.js
      ├─ autocomplete.js          → state.js
      └─ main.js                  → All modules
```

**Load order matters!** Scripts must be loaded in the order shown in `index.html`.

**Global scope exports**: Each module exports functions to `window` object for inline onclick/onchange handlers in HTML. This maintains modular structure while keeping HTML markup simple. Functions are attached at the end of each module file (e.g., `window.createNew = createNew;`).

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

Requires ES6 support and LocalStorage.
