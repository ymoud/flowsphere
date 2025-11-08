# Config Validation System - Technical Design

**Status:** ✅ Implemented
**Version:** 1.0
**Last Updated:** 2025-01-09

---

## Overview

FlowSphere's validation system provides pre-execution validation of configuration files, catching errors before execution with actionable error messages. Uses a **two-tier validation approach** separating structure validations (Studio UI prevents) from value validations (users can break).

---

## Architecture

### Core Components

```
lib/config-validator.js          # Core validation logic (Node.js)
studio/js/config-validator-ui.js # Studio UI integration (Browser)
bin/flowsphere.js                # CLI --validate flag + /api/validate endpoint
lib/executor.js                  # Pre-execution validation (CLI)
studio/js/flow-runner.js         # Pre-execution validation (Studio)
```

### Validation Flow

```
User Action → validateConfig(config, options) → {valid, errors}
                        ↓
        ┌───────────────┴────────────────┐
        ▼                                ▼
   Structure Checks              Value Checks
   (external files only)         (always run)
        ↓                                ↓
        └───────────────┬────────────────┘
                        ▼
                  Valid? → Yes: Proceed
                        → No: Show errors + abort
```

---

## Two-Tier Validation System

### Why Two Tiers?

Studio's form-based UI **prevents** structure errors but **cannot prevent** value errors:

**Structure Validations** (external file loads only):
- Missing required fields (id, method, url)
- Invalid field types (headers must be object)
- Invalid HTTP methods
- Invalid condition/validation syntax

**Value Validations** (always run):
- Duplicate node IDs
- References to non-existent nodes
- Malformed placeholders (missing `{{` or `}}`)
- JSON body type mismatch with Content-Type header
- Circular references in JSON bodies

**Rationale:** Studio forms prevent structure errors through dropdowns/type constraints, but users can still delete referenced nodes, duplicate IDs, or type incomplete placeholders.

---

## Integration Points

### CLI Integration

**Entry Point:** `bin/flowsphere.js`
- `--validate` flag triggers standalone validation without execution
- `/api/validate` POST endpoint for Studio validation requests
- Returns `{valid: Boolean, errors: Array}` JSON response

**Pre-Execution:** `lib/executor.js`
- Calls `validateConfig(config)` before `runSequence()` starts execution
- Calls `formatErrors(errors)` to display CLI-formatted error messages
- Throws error and exits if validation fails (prevents execution)

### Studio Integration

**State Management:**
- Uses global `config` variable from `state.js`
- Validates against `config.nodes` array and `config.variables` object
- No modifications to config during validation (read-only)

**UI Components:**

1. **Validate Button** (`studio/index.html`)
   - Visibility controlled by `updateValidateButton()` in `config-manager.js`
   - Calls `validateConfig(false)` for full modal display
   - Shows/hides based on whether config is loaded

2. **Auto-Validation Badge** (`config-validator-ui.js`)
   - Triggered on file loads in `main.js`, `bootstrap-modal-bridge.js`, `modals.js`
   - Calls `validateConfig(true)` for silent mode (badge only, no modal)
   - Badge: ✅ green checkmark (valid) or 🔴 red with error count (invalid)
   - Auto-disappears after 5 seconds

3. **Validation Modal** (`studio/index.html` + `config-validator-ui.js`)
   - Displayed by `showConfigValidationResults(result)` function
   - Shows error list with node context, field path, issue description, fix suggestion
   - Bootstrap 5 modal with expandable error details

4. **Pre-Execution Check** (`flow-runner.js`)
   - Calls `/api/validate` endpoint before starting execution
   - Calls `showConfigValidationResults(result)` if validation fails
   - Aborts execution if `result.valid === false`

### Inline JSON Validation

**Location:** `studio/js/form-handlers.js`

**Function:** `updateStepJSON(index, field, value)`
- Attempts `JSON.parse()` on textarea input
- Success: Updates `config.nodes[index][field]` and removes `.is-invalid` class
- Failure: Adds `.is-invalid` class to textarea, displays error below textarea
- Invalid JSON is **never saved** to config (protective behavior)

**UI Elements:**
- Textarea ID: `json-textarea-{field}-{index}` (for Bootstrap styling)
- Error container ID: `json-error-{field}-{index}` (for error messages)
- Created by `ui-renderer-bootstrap.js` when rendering node forms

---

## Data Structures

### Validation Result Object
```
{
  valid: Boolean,    // true if all checks passed
  errors: Array      // Array of error objects
}
```

### Error Object Format
```
{
  field: String,          // e.g., "nodes[3].id"
  message: String,        // Human-readable error description
  type: String,           // "structure", "duplicate", "reference", "format", "value"
  category: String,       // "structure" or "value"
  nodeIndex: Number,      // Index in nodes array
  nodeId: String,         // Node ID (if available)
  suggestion: String      // Actionable fix suggestion (optional)
}
```

---

## Validation Options

**Function Signature:** `validateConfig(config, options)`

**Options:**
- `structureOnly: true` - Skip value validations (useful for testing structure checks)
- `valuesOnly: true` - Skip structure validations (useful for Studio edits)
- Default (no options): Run both structure and value validations

**Use Cases:**
- External file loads: Full validation (both tiers)
- Studio edits (optional future): Values-only with debouncing
- Testing: Separate structure vs value validation tests

---

## Key Functions

### Core Validation
- `validateConfig(config, options)` - Main validation entry point (lib/config-validator.js)
- `formatErrors(errors)` - Formats errors for CLI output (lib/config-validator.js)
- `checkForMalformedPlaceholders(obj, ...)` - Recursive string scanner for incomplete placeholders

### Studio UI
- `validateConfig(silent)` - Studio wrapper that calls `/api/validate` endpoint (config-validator-ui.js)
- `showConfigValidationResults(result)` - Display validation modal with errors
- `showValidationIndicator(result)` - Display badge indicator (silent mode)
- `updateValidateButton()` - Show/hide validate button based on config state (config-manager.js)

### Form Handlers
- `updateStepJSON(index, field, value)` - Inline JSON validation with visual feedback (form-handlers.js)

---

## Validation Checks

### Structure Tier

1. **Required Fields**: Each node must have `id`, `method`, `url`
2. **Field Types**: Headers/body must be objects, timeout must be number
3. **HTTP Methods**: Must be GET/POST/PUT/DELETE/PATCH
4. **Condition Syntax**: Must have source + comparison operator
5. **Validation Rules**: JSONPath must start with "."

### Value Tier

1. **Duplicate IDs**: Checks `config.nodes` array for duplicate `id` values
2. **Node References**: Scans all placeholder strings for `{{ .responses.nodeId.*}}`, verifies nodeId exists
3. **Malformed Placeholders**: Recursively scans all string values for mismatched `{{` and `}}`
4. **JSON Body Type**: If `Content-Type: application/json`, body must be object/array (not string/number/null)
5. **Circular References**: Attempts `JSON.stringify(body)` to detect circular references

---

## Usage Patterns

### CLI Standalone Validation
```bash
flowsphere config.json --validate
```
Validates without execution. Exit code 0 (success) or 1 (failure).

### CLI Pre-Execution
Automatic validation before `runSequence()` in `lib/executor.js`. Throws error if validation fails.

### Studio Manual Validation
User clicks "Validate" button → calls `validateConfig(false)` → shows full modal.

### Studio Auto-Validation
File load → calls `validateConfig(true)` → shows badge for 5 seconds.

### Studio Pre-Execution
Flow Runner → calls `/api/validate` endpoint → shows modal if invalid → aborts execution.

---

## Error Message Format

All errors include:
- **Node context**: Which node has the error (by ID and index)
- **Field path**: Exact location of error (e.g., `nodes[3].body.userId`)
- **Issue description**: What's wrong
- **Fix suggestion**: How to fix it

Example:
```
Error 1:
  Node: "get-premium-data" (nodes[3])
  Field: nodes[3].id
  Issue: Duplicate node ID: "get-premium-data"
  Fix: Each node must have a unique ID
```

---

## Testing

**Test Configs** (in `tests/` directory):
- `config-test-validation-errors.json` - General validation errors
- `config-test-duplicate-ids.json` - Duplicate IDs + broken references
- `config-test-invalid-json-body.json` - JSON body type mismatches
- `config-test-malformed-placeholders.json` - Incomplete placeholders

**Category Separation Test:**
- `test-validator-categories.js` - Verifies structure/value separation works

**Running Tests:**
```bash
node bin/flowsphere.js tests/config-test-validation-errors.json --validate
node tests/test-validator-categories.js
```

---

## Future Enhancements

### Real-Time Value Validation in Studio (Optional)

**Concept:** Debounced validation on config changes

**Implementation:**
- Listen for config changes (add/delete/edit nodes)
- Debounce 2 seconds after last change
- Call `validateConfig(config, {valuesOnly: true})`
- Update badge indicator (non-intrusive)

**Benefits:**
- Catch duplicate IDs immediately when adding nodes
- Catch broken references when deleting nodes
- Non-intrusive (badge only, no modal)

**Tradeoffs:**
- Adds overhead during editing
- May distract users while actively working
- Could be annoying if badge appears while typing

---

## Files Modified

**Core Validation:**
- `lib/config-validator.js` (NEW)
- `studio/js/config-validator-ui.js` (NEW)

**CLI Integration:**
- `bin/flowsphere.js` - `--validate` flag + `/api/validate` endpoint
- `lib/executor.js` - Pre-execution validation

**Studio Integration:**
- `studio/js/flow-runner.js` - Pre-execution validation
- `studio/js/config-manager.js` - Validate button visibility
- `studio/js/form-handlers.js` - Inline JSON error feedback
- `studio/js/ui-renderer-bootstrap.js` - Error containers for JSON fields
- `studio/index.html` - Validate button + validation modal

**Auto-Validation Triggers:**
- `studio/js/main.js` - File upload
- `studio/js/bootstrap-modal-bridge.js` - FlowSphere JSON + Postman import
- `studio/js/modals.js` - Modal-based file loads

---

## Summary

**Key Design Decisions:**

1. **Two-Tier Approach**: Separates structure (file-only) from value (always) validations
2. **Shared Core Logic**: Same validation engine for CLI and Studio (lib/config-validator.js)
3. **Non-Intrusive UX**: Badge indicators for auto-validation, modals only for manual checks
4. **Protective Behavior**: Invalid JSON never saved to config (prevents corruption)
5. **Pre-Execution Blocking**: Invalid configs cannot execute (fail fast)

**Benefits:**

- Early error detection before execution
- Clear, actionable error messages
- Flexible validation modes (structure-only, value-only, full)
- Multiple entry points (CLI flag, Studio button, auto-validation, pre-execution)
- Real-time inline feedback for JSON syntax errors
