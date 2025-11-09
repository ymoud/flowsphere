# Modal System Architecture

**Last Updated:** 2025-01-09
**Status:** ✅ Implemented

## Overview

FlowSphere Studio uses a centralized modal configuration system to ensure consistent behavior across all Bootstrap modals in the application. This system provides a single point of control for global modal behaviors.

## Architecture

### Global Configuration Object

Located in `studio/js/flow-runner.js` (loaded first):

```javascript
window.FlowSphereModalConfig = {
    backdrop: 'static',  // Prevent dismissal by clicking outside
    keyboard: false      // Prevent dismissal with ESC key
};
```

**Design Principle:** Add properties to this object and all modals automatically inherit them.

### Configuration Helper Function

```javascript
window.configureModal(modalElement, customConfig = {})
```

**Parameters:**
- `modalElement` - Modal element ID (string) or DOM element
- `customConfig` - Optional overrides for specific modals

**Returns:** Bootstrap Modal instance with global + custom configuration applied

**Usage:**
```javascript
// Standard usage
const modal = window.configureModal('myModalId');
modal.show();

// With custom overrides
const modal = window.configureModal('myModal', { backdrop: true });
modal.show();
```

## Current Modal Implementations

All modals in the application use this centralized system:

### flow-runner.js
1. **Execution Mode Selector Modal** (`executionModeModal`)
   - Allows user to choose: Full Speed, Step-by-Step, or Auto-Step
   - Includes delay selector for Auto-Step mode

2. **Results Modal** (`resultsModal`)
   - Shows real-time execution progress
   - Displays step cards, validations, responses
   - Contains Stop/Continue buttons

3. **User Input Modal** (`userInputModal`)
   - Collects user input for steps with `userPrompts`
   - Auto-opens on first attempt, clickable placeholder after

4. **Browser Launch Modal** (`browserLaunchModal`)
   - Shows when step includes `launchBrowser` property
   - Displays URL that was opened in browser

### try-it-out.js
1. **Try It Out Modal** (dynamic ID)
   - Shows dependencies and mock options
   - Allows testing individual nodes in isolation

2. **Result Display Modal** (dynamic ID)
   - Shows execution results for single node
   - Displays request, response, validations, substitutions

3. **Schema Conflict Choice Modal** (dynamic ID)
   - Shown when OpenAPI import has schema conflicts
   - User chooses: Replace or Keep Existing

### import-nodes.js
1. **Import Nodes Modal** (`importNodesModal`)
   - Template-based node creation
   - Categories: Empty, Simple, OAuth, User Input, Comprehensive

## Current Global Behaviors

### Sticky Modals
- **Backdrop:** `'static'` - Clicking outside modal does NOT dismiss it
- **Keyboard:** `false` - Pressing ESC does NOT dismiss it
- **Rationale:** Prevents accidental data loss, ensures intentional user actions
- **User Action Required:** Must explicitly click Close, Cancel, or Submit buttons

### Future Extensibility

To add new global behaviors (applies to ALL modals):

1. Add property to `window.FlowSphereModalConfig`
2. No code changes needed in individual modals
3. All existing and future modals inherit automatically

**Example:**
```javascript
window.FlowSphereModalConfig = {
    backdrop: 'static',
    keyboard: false,
    focus: true,        // New: Auto-focus modal on show
    centered: true      // New: Center modals vertically
};
```

## Integration Points

### State Management
- Modal instances are NOT stored in global config state
- Created on-demand when needed
- Destroyed when closed (except flow-runner.js modals which persist)

### Lifecycle
1. **Create:** Modal HTML inserted into DOM
2. **Configure:** `window.configureModal()` applies global config
3. **Show:** `modal.show()` displays modal
4. **Interact:** User performs actions
5. **Close:** User clicks close/cancel/submit
6. **Cleanup:** Modal removed from DOM (if temporary)

## Benefits

### Consistency
- All modals behave the same way
- Predictable user experience across features

### Maintainability
- Change behavior once, affects all modals
- No need to update individual modal instances

### Flexibility
- Individual modals can override defaults
- Supports special cases while maintaining consistency

### Scalability
- New modals automatically inherit all global behaviors
- No additional configuration needed for standard cases

## Developer Guidelines

### Creating New Modals

✅ **Correct:**
```javascript
const modalHtml = `<div class="modal fade" id="myModal">...</div>`;
document.body.insertAdjacentHTML('beforeend', modalHtml);

const modal = window.configureModal('myModal');
modal.show();
```

❌ **Incorrect:**
```javascript
// Bypasses global configuration!
const modal = new bootstrap.Modal(document.getElementById('myModal'));
modal.show();
```

### Override Global Config (Rare Cases)

```javascript
// Allow this specific modal to be dismissed by clicking outside
const modal = window.configureModal('specialModal', {
    backdrop: true,   // Override: allow dismissal
    keyboard: true
});
modal.show();
```

### Modal Best Practices

1. **Always use `window.configureModal()`** instead of direct Bootstrap Modal instantiation
2. **Only override** when you have a specific reason
3. **Document overrides** with a comment explaining why
4. **Test dismissal behavior** - ensure users can't accidentally lose data

## Common Patterns

### Dynamic Modals (created on-demand)

```javascript
function showResultsModal(data) {
    const modalId = `results-${Date.now()}`;
    const modalHtml = `
        <div class="modal fade" id="${modalId}">
            <!-- modal content -->
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = window.configureModal(modalId);

    // Clean up after close
    document.getElementById(modalId).addEventListener('hidden.bs.modal', () => {
        document.getElementById(modalId).remove();
    });

    modal.show();
}
```

### Persistent Modals (reused multiple times)

```javascript
function showExecutionModeSelector() {
    let modal = document.getElementById('executionModeModal');

    if (!modal) {
        // Create once
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    // Configure and show (works for new and existing modals)
    const bootstrapModal = window.configureModal('executionModeModal');
    bootstrapModal.show();
}
```

## Related Documentation

- **[Core Architecture](./core-architecture.md)** - Overall Studio architecture
- **[Flow Execution Architecture](./flow-execution-architecture.md)** - Execution modal details
- **[Change Impact Guide](./change-impact-guide.md)** - How changes propagate through system

## Troubleshooting

### Modal Dismisses When Clicking Outside

**Problem:** Modal closes when user clicks backdrop

**Solution:** Check that `window.configureModal()` is being used, not direct Bootstrap Modal instantiation

```javascript
// ❌ Wrong - bypasses config
const modal = new bootstrap.Modal(element);

// ✅ Correct - applies global config
const modal = window.configureModal(element);
```

### Modal Doesn't Show

**Problem:** `modal.show()` doesn't display the modal

**Solution:** Ensure modal element exists in DOM before configuring

```javascript
// Add to DOM first
document.body.insertAdjacentHTML('beforeend', modalHtml);

// Then configure (checks for element existence)
const modal = window.configureModal('myModal');
if (modal) {
    modal.show();
}
```

### Need Different Behavior for One Modal

**Problem:** Specific modal needs to allow dismissal

**Solution:** Pass custom config as second parameter

```javascript
const modal = window.configureModal('myModal', {
    backdrop: true,  // Allow dismissal for this modal
    keyboard: true
});
modal.show();
```
