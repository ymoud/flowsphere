# Toggleable Features Implementation Guide

**⚠️ IMPORTANT: All new features should be toggleable by default.**

FlowSphere follows a philosophy that users should have control over which features are enabled. When implementing new features, you must make them toggleable using one of the established patterns below.

## When to Make Features Toggleable

### Always make toggleable:
- New Studio UI features (autocomplete, drag-drop, new panels, etc.)
- Experimental or beta features
- Features that may impact performance
- Features that change default behavior
- Features users might want to disable for simplicity

### Exceptions (can be non-toggleable):
- Core functionality required for the app to work
- Security or bug fixes
- Features explicitly requested as always-on by the user

---

## Pattern 1: Studio UI Features (Feature Registry)

**Use this for**: New Studio UI enhancements, productivity tools, import/export features

### Implementation Steps

#### 1. Register feature in `studio/js/core/feature-registry.js`:

```javascript
const features = {
    'my-new-feature': {
        name: 'My New Feature',
        description: 'Brief description of what this feature does',
        script: 'js/path/to/my-feature.js',    // or null for built-in features
        enabled: true,                          // Default state
        loaded: false,                          // Auto-managed
        essential: false,                       // Can be disabled
        category: 'Productivity'                // UI Enhancement, Testing, Import/Export, etc.
    }
}
```

#### 2. Feature categories:
- `UI Enhancement` - Visual improvements, theme switchers, etc.
- `Productivity` - Autocomplete, drag-drop, shortcuts
- `Testing` - Try it Out, Flow Runner, validators
- `Import/Export` - Postman parser, Swagger import, etc.

#### 3. Check if enabled in your code:

```javascript
// In your feature code
if (typeof FeatureRegistry !== 'undefined' &&
    !FeatureRegistry.isFeatureEnabled('my-new-feature')) {
    return; // Feature disabled, skip execution
}
```

#### 4. Settings UI automatically generated:
- Settings panel (`studio/js/core/settings-ui.js`) automatically creates toggle switches
- External script features auto-reload on toggle
- Built-in features update immediately

**Example:** See `autocomplete` feature (Lines 48-55 in `studio/js/core/feature-registry.js`)

**Key Files:**
- `studio/js/core/feature-registry.js` - Feature definitions
- `studio/js/core/settings-ui.js` - Settings panel UI

---

## Pattern 2: Built-in Features (localStorage)

**Use this for**: Features that don't require external scripts and update immediately

### Implementation Steps

#### 1. Create toggle function with localStorage persistence:

```javascript
const STORAGE_KEY = 'flowsphere-my-feature';

function initMyFeature() {
    const enabled = localStorage.getItem(STORAGE_KEY) !== 'false'; // Default true
    setFeatureState(enabled, false);
}

function toggleMyFeature() {
    const current = localStorage.getItem(STORAGE_KEY) !== 'false';
    const newState = !current;
    setFeatureState(newState, true);
}

function setFeatureState(enabled, save) {
    // 1. Apply changes to DOM/state
    if (enabled) {
        // Enable feature
        document.body.classList.add('my-feature-enabled');
    } else {
        // Disable feature
        document.body.classList.remove('my-feature-enabled');
    }

    // 2. Persist to localStorage
    if (save) {
        localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
    }
}
```

#### 2. Initialize on page load:

```javascript
document.addEventListener('DOMContentLoaded', initMyFeature);
```

#### 3. Add UI toggle in Studio:

```html
<div class="form-check form-switch">
    <input class="form-check-input" type="checkbox"
           id="myFeatureToggle" checked
           onchange="toggleMyFeature()">
    <label class="form-check-label" for="myFeatureToggle">
        Enable My Feature
    </label>
</div>
```

**Example:** See `studio/js/theme-switcher.js` (Lines 1-59)

**Key Concepts:**
- Store state in `localStorage` with descriptive key
- Initialize on page load to restore saved state
- Provide immediate visual feedback on toggle
- No page reload required for built-in features

---

## Pattern 3: Config-Level Toggles

**Use this for**: Execution-time features that affect CLI or Flow Runner behavior

### Implementation Steps

#### 1. Add property to config JSON:

```json
{
  "enableMyFeature": false,
  "variables": { ... },
  "nodes": [ ... ]
}
```

#### 2. Validate in `lib/config-validator.js`:

```javascript
// Add to validation function
if (config.enableMyFeature !== undefined &&
    typeof config.enableMyFeature !== 'boolean') {
    errors.push('enableMyFeature must be a boolean');
}
```

#### 3. Use in executor/modules:

```javascript
// In lib/executor.js or other modules
const { enableMyFeature = false } = config;

if (enableMyFeature) {
    // Feature-specific code
    console.log('My feature is enabled');
}
```

#### 4. Add to Studio UI (config-editor.js):

```html
<div class="form-check mb-3">
    <input class="form-check-input" type="checkbox"
           id="enableMyFeature"
           onchange="updateConfigProperty('enableMyFeature', this.checked)">
    <label class="form-check-label" for="enableMyFeature">
        Enable My Feature
        <small class="text-muted d-block">Description of what this enables</small>
    </label>
</div>
```

**Example:** See `enableDebug` config property

**Key Files to Update:**
- `lib/config-validator.js` - Add validation
- `lib/executor.js` - Read and use the flag
- `studio/js/config-editor.js` - Add UI toggle
- `examples/*.json` - Add example usage

---

## Pattern 4: Optional Node Properties

**Use this for**: Per-step features that users may want to use selectively

### Implementation Steps

#### 1. Add optional property to node schema:

```json
{
  "id": "my-step",
  "name": "My Step",
  "method": "POST",
  "url": "/endpoint",
  "myFeatureConfig": {
    "option1": "value1",
    "option2": true
  }
}
```

#### 2. Validate property in `lib/config-validator.js`:

```javascript
// In node validation section
if (node.myFeatureConfig !== undefined) {
    if (typeof node.myFeatureConfig !== 'object') {
        errors.push(`Node ${nodeId}: myFeatureConfig must be an object`);
    }
    // Validate sub-properties
    if (node.myFeatureConfig.option1 !== undefined &&
        typeof node.myFeatureConfig.option1 !== 'string') {
        errors.push(`Node ${nodeId}: myFeatureConfig.option1 must be a string`);
    }
}
```

#### 3. Execute conditionally in `lib/executor.js`:

```javascript
// During step execution
if (step.myFeatureConfig) {
    // Execute feature-specific code
    await executeMyFeature(step.myFeatureConfig);
}
```

#### 4. Add to Studio node editor:

```html
<div class="mb-3">
    <label class="form-check-label">
        <input type="checkbox" class="form-check-input"
               id="enableMyFeatureForNode"
               onchange="toggleNodeFeature()">
        Enable My Feature for this step
    </label>
    <div id="myFeatureConfig" style="display: none;">
        <!-- Feature-specific config fields -->
        <input type="text" class="form-control mt-2"
               placeholder="Option 1"
               id="myFeatureOption1">
    </div>
</div>

<script>
function toggleNodeFeature() {
    const enabled = document.getElementById('enableMyFeatureForNode').checked;
    document.getElementById('myFeatureConfig').style.display =
        enabled ? 'block' : 'none';
}
</script>
```

**Examples:**
- `userPrompts` - Optional user input collection
- `launchBrowser` - Optional browser launch with URL from response
- `conditions` - Optional conditional execution

**Key Characteristics:**
- Property is optional (undefined = feature not used)
- Validation only runs if property is present
- UI shows/hides feature config based on checkbox
- Each node can independently enable/disable

---

## Naming Conventions

Follow these consistent naming patterns across all toggleable features:

| Pattern | Usage | Example |
|---------|-------|---------|
| `enable*` | Config boolean properties | `enableDebug`, `enableMyFeature` |
| `isFeatureEnabled()` | Check enabled status | `FeatureRegistry.isFeatureEnabled('autocomplete')` |
| `toggle*` | User action functions | `toggleTheme()`, `toggleMyFeature()` |
| `init*` | Initialization functions | `initTheme()`, `initMyFeature()` |
| `*Config` | Per-node config objects | `myFeatureConfig`, `validationConfig` |
| `show*/hide*` | UI visibility toggles | `showAdvanced()`, `hideSettings()` |

**Consistency is key:** Using these conventions makes the codebase predictable and easier to maintain.

---

## Testing Toggleable Features

When implementing a toggleable feature, you must test all states:

### Test Checklist:
- ✅ **Default state** - Feature enabled/disabled by default as expected
- ✅ **Toggle on** - Feature works correctly when enabled
- ✅ **Toggle off** - Feature disabled, no errors or warnings
- ✅ **Persistence** - State persists across page reloads (localStorage) or file saves (config)
- ✅ **Settings UI** - Toggle switch displays correct state
- ✅ **External scripts** - Script features reload correctly on toggle (if applicable)
- ✅ **No conflicts** - Feature doesn't interfere with other features when enabled/disabled
- ✅ **Graceful degradation** - App works fine if feature is disabled

### Example Test Scenarios:

#### Studio UI Feature:
```javascript
// Test 1: Default enabled state
localStorage.removeItem('flowsphere-features');
location.reload();
// Verify feature is enabled by default

// Test 2: Disable feature
FeatureRegistry.disableFeature('my-feature');
// Verify feature stops working

// Test 3: Re-enable feature
FeatureRegistry.enableFeature('my-feature');
// Verify feature works again

// Test 4: Persistence
location.reload();
// Verify feature state persisted correctly
```

#### Config-Level Feature:
```bash
# Test 1: Feature disabled (default)
node bin/flowsphere.js examples/config-simple.json
# Verify feature-specific behavior doesn't run

# Test 2: Feature enabled
# Edit config: "enableMyFeature": true
node bin/flowsphere.js examples/config-simple.json
# Verify feature-specific behavior runs

# Test 3: Invalid config
# Edit config: "enableMyFeature": "yes"
node bin/flowsphere.js examples/config-simple.json
# Verify validation error is shown
```

---

## Documentation Requirements

When adding a toggleable feature, you must update:

### Required Documentation:

1. **Studio README** (`studio/README.md`)
   - Add feature to feature list
   - Document how to enable/disable
   - Include screenshots if UI feature

2. **Feature Registry** (`studio/js/core/feature-registry.js`)
   - Clear name and description
   - Correct category
   - Default state documented

3. **Config Examples** (`examples/*.json`)
   - Add to comprehensive demo if config-level
   - Show both enabled and disabled states

4. **CLAUDE.md** (if major pattern change)
   - Document new patterns
   - Update architecture notes

5. **UI Help Text**
   - Add tooltips to toggle switches
   - Include info icons with detailed explanations

### Documentation Template:

```markdown
## My New Feature

**Category:** Productivity / UI Enhancement / Testing / Import/Export

**Status:** Toggleable (enabled by default)

**Description:**
Brief description of what the feature does and why it's useful.

**How to Enable/Disable:**
- **Studio UI:** Settings → [Category] → Toggle "My New Feature"
- **Config File:** Add `"enableMyFeature": true` to config root
- **Per-Step:** Add `"myFeatureConfig": {...}` to node

**Example Usage:**
[Code example]

**Default State:** Enabled / Disabled

**Requires Reload:** Yes / No
```

---

## Quick Reference: Choosing the Right Pattern

Use this flowchart to decide which pattern to use:

```
Is this a Studio UI feature?
├─ YES → Is it a standalone script?
│  ├─ YES → Pattern 1: Feature Registry (external script)
│  └─ NO  → Pattern 2: Built-in Feature (localStorage)
│
└─ NO  → Does it affect CLI/execution behavior?
   ├─ YES → Is it global or per-step?
   │  ├─ GLOBAL   → Pattern 3: Config-Level Toggle
   │  └─ PER-STEP → Pattern 4: Optional Node Property
   │
   └─ NO  → Exception: Might not need to be toggleable
```

### Pattern Comparison Table:

| Pattern | Scope | Persistence | UI Location | Reload Required | Example |
|---------|-------|-------------|-------------|-----------------|---------|
| 1. Feature Registry | Studio UI | localStorage | Settings panel | Yes (external scripts) | `autocomplete`, `drag-drop` |
| 2. Built-in Feature | Studio UI | localStorage | Custom toggle | No | `theme-switcher` |
| 3. Config-Level | CLI/Execution | Config file | Config editor | N/A | `enableDebug` |
| 4. Node Property | Per-step | Config file | Node editor | N/A | `userPrompts`, `launchBrowser` |

---

## Real-World Examples

### Example 1: Autocomplete Feature (Pattern 1)

**File:** `studio/js/core/feature-registry.js`

```javascript
'autocomplete': {
    name: 'Autocomplete',
    description: 'Smart variable suggestions as you type',
    script: 'js/autocomplete.js',
    enabled: true,
    loaded: false,
    essential: false,
    category: 'Productivity'
}
```

**Usage in code:** `studio/js/autocomplete.js`

```javascript
// Feature checks if it's enabled before initializing
if (typeof FeatureRegistry !== 'undefined' &&
    !FeatureRegistry.isFeatureEnabled('autocomplete')) {
    return;
}
```

### Example 2: Theme Switcher (Pattern 2)

**File:** `studio/js/theme-switcher.js`

```javascript
const STORAGE_KEY = 'flowsphere-theme';

function initTheme() {
    const savedTheme = localStorage.getItem(STORAGE_KEY) || 'dark';
    setTheme(savedTheme, false);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme, true);
}

function setTheme(theme, save) {
    document.documentElement.setAttribute('data-theme', theme);
    if (save) {
        localStorage.setItem(STORAGE_KEY, theme);
    }
}
```

### Example 3: Debug Logging (Pattern 3)

**Config:** `examples/config-comprehensive-demo.json`

```json
{
  "enableDebug": false,
  "variables": { ... },
  "nodes": [ ... ]
}
```

**Usage:** `lib/executor.js`

```javascript
const { enableDebug = false } = config;

if (enableDebug) {
    console.error(`DEBUG: Executing ${method} ${url}`);
}
```

### Example 4: User Prompts (Pattern 4)

**Config:** `examples/config-comprehensive-demo.json`

```json
{
  "id": "user-login",
  "name": "User Login",
  "userPrompts": {
    "username": "Enter your username:",
    "userType": "Enter user type (basic/premium):"
  },
  "body": {
    "username": "{{ .input.username }}",
    "userType": "{{ .input.userType }}"
  }
}
```

**Usage:** `lib/executor.js`

```javascript
// Only prompt if userPrompts is defined
if (step.userPrompts) {
    userInput = await promptUserInput(step.userPrompts);
}
```

---

## Common Mistakes to Avoid

### ❌ Don't:
1. **Hard-code features as always-on** without justification
2. **Forget to validate** config properties
3. **Skip documentation** of toggle behavior
4. **Use inconsistent naming** (e.g., `showFeature`, `enableFeature`, `useFeature` for same type)
5. **Forget to test disabled state** - must work gracefully when off
6. **Add UI without Settings panel integration** for Studio features
7. **Break existing configs** by making required what was optional

### ✅ Do:
1. **Follow existing patterns** - consistency is critical
2. **Test both enabled and disabled states** thoroughly
3. **Document default state** clearly
4. **Use descriptive localStorage keys** with `flowsphere-` prefix
5. **Provide helpful UI descriptions** in Settings panel
6. **Make features independent** - toggling one shouldn't break others
7. **Consider performance impact** - document if feature is expensive

---

## Summary

FlowSphere's toggleable feature architecture provides:
- **User control** over which features are enabled
- **Clean separation** between core and optional functionality
- **Consistent patterns** across the codebase
- **Easy discovery** via Settings panel
- **Future-proof** architecture for adding new features

When in doubt, **make it toggleable**. It's easier to make a toggle permanent later than to add toggle functionality to an always-on feature.
