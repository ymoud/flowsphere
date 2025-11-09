# FlowSphere Core Architecture

> **🚨 REQUIRED READING FOR ALL AGENTS**
> Read this document BEFORE implementing any features. It contains critical architecture details that prevent common mistakes.
>
> **Also read**: [Change Impact Guide](change-impact-guide.md) - Shows what files need updating for different types of changes

## Quick Start for Agents

**Before you write any code, know these critical facts:**

### Where is the Config Stored?

| Context | Storage Location | How to Access |
|---------|------------------|---------------|
| **Studio (Browser)** | Global variable in `studio/js/state.js` | Import: `import { config } from './state.js'`<br>Access: `config` (not `window.config`!) |
| **CLI Execution** | Local variable in `lib/executor.js:runSequence()` | Passed as parameter through function calls |
| **Server API** | Posted from client, stored as temp file | Received in request body, loaded from disk |
| **Persistence** | Browser localStorage | `localStorage['flowsphere-config']` (JSON string) |

**⚠️ CRITICAL:** In Studio, the config is **NOT** stored in `window.config`. It's a module-level variable exported from `state.js`. Always import it.

### How to Modify Config in Studio?

```javascript
// ✅ CORRECT - Import and modify
import { config } from './state.js';
import { renderEditor } from './main.js';

// Add a node
config.nodes.push(newNode);
renderEditor();  // Always re-render after modifications!

// Add a variable
if (!config.variables) config.variables = {};
config.variables.newVar = 'value';
renderGlobalVariables();  // Update variables UI
```

```javascript
// ❌ WRONG - Don't do this
window.config.nodes.push(newNode);  // config is not on window!
config.nodes.push(newNode);  // Missing renderEditor() call - UI won't update!
```

### How Does Execution Work?

**Studio Execution (Flow Runner):**
1. User clicks "Go with the Flow" → `flow-runner.js:runSequence()`
2. POST config to `/api/execute-stream` (Server-Sent Events)
3. Server creates temp config file, loads it
4. Server uses **same executor modules as CLI** (`lib/executor.js`, `lib/validator.js`, etc.)
5. Server streams events back to client: `step_start`, `step`, `input_required`, `end`
6. Client updates UI in real-time with step cards

**CLI Execution:**
1. User runs `flowsphere config.json`
2. `bin/flowsphere.js` calls `lib/executor.js:runSequence(configPath)`
3. Executor loads config, iterates through nodes, executes HTTP requests
4. Returns final result (success/failure, execution log)

**Try it Out (Single Node):**
1. User clicks "Try it Out" on a node → `try-it-out.js:executeNode()`
2. POST single node + full config to `/api/execute-node`
3. Server executes ONE step using executor modules
4. Returns synchronous JSON response (not streaming)

### Key Architecture Principles

1. **Modular Execution Engine**: All execution logic lives in `lib/` (executor, validator, http-client, conditions, substitution)
2. **Shared Code**: Server reuses CLI modules for consistency (no duplicate logic)
3. **State Management**:
   - CLI: Local variables (no global state)
   - Studio: Global `config` from `state.js` + always call `renderEditor()` after changes
   - Server: Execution-scoped state (execution ID, pending requests map)
4. **Variable Substitution**: Centralized in `lib/substitution.js`, used by all execution contexts
5. **Validation**: Single source of truth in `lib/validator.js`, supports httpStatusCode + jsonpath validations

---

## Common Mistakes to Avoid

### ❌ Mistake #1: Accessing `window.config`
**Problem:** Agents assume config is on the global window object.

**Why it fails:** Config is a module-level export from `state.js`, not attached to window.

**Solution:**
```javascript
// ✅ CORRECT
import { config } from './state.js';
```

### ❌ Mistake #2: Forgetting to Re-render UI
**Problem:** Modify `config` but UI doesn't update.

**Why it fails:** Studio UI renders from `config` state. Changes don't auto-update the DOM.

**Solution:**
```javascript
// ✅ CORRECT
config.nodes.push(newNode);
renderEditor();  // Trigger UI update!
```

### ❌ Mistake #3: Duplicating Executor Logic
**Problem:** Implementing execution logic in server endpoints instead of reusing `lib/` modules.

**Why it fails:** Creates inconsistency between CLI and Studio behavior.

**Solution:** Always import and use existing modules from `lib/`:
```javascript
// ✅ CORRECT - In server endpoint
const { executeStep } = require('./lib/executor');
const { validateResponse } = require('./lib/validator');
const { substituteWithTracking } = require('./lib/substitution');
```

### ❌ Mistake #4: Not Understanding Context Object
**Problem:** Trying to access responses or variables directly instead of through context.

**Why it fails:** Execution engine passes state via the `context` object.

**Solution:**
```javascript
// ✅ CORRECT - Context structure
const context = {
  vars: config.variables || {},      // Global variables
  responses: [],                      // Previous step responses (indexed by position)
  input: {},                          // User input from prompts
  enableDebug: config.enableDebug || false
};
```

### ❌ Mistake #5: Hardcoding Paths Instead of Using path.join()
**Problem:** Using `/` or `\` in file paths breaks cross-platform compatibility.

**Why it fails:** Windows uses `\`, Unix uses `/`.

**Solution:**
```javascript
// ✅ CORRECT
const path = require('path');
const configPath = path.join(__dirname, 'config.json');
```

---

## Overview

FlowSphere is an HTTP sequence runner implemented in **Node.js** with two execution modes:
- **CLI Mode**: Command-line execution (`flowsphere config.json`)
- **Studio Mode**: Browser-based visual editor with execution engine (`flowsphere studio`)

This document describes the foundational architecture, data flow, and integration points across the system.

---

## System Components

### CLI Components (Node.js)

#### bin/flowsphere.js - CLI Entry Point
**Responsibilities:**
- Parse command-line arguments (`--start-step`, `--version`, `--help`, `studio`)
- Route commands to appropriate handlers (execution vs studio launch)
- Launch Express server when `studio` command is invoked

**Key Functions:**
- `showHelp()` - Display CLI usage
- `showVersion()` - Display version from package.json
- `launchStudio(port)` - Start Express server + open browser
- `main()` - Main CLI orchestration

#### lib/executor.js - Execution Engine
**Responsibilities:**
- Orchestrate the entire sequence execution
- Manage execution state (responses, user input, execution log)
- Coordinate validation, substitution, and HTTP execution

**Key Functions:**
- `runSequence(configPath, options)` - Main entry point for execution
- `executeStep(step, context)` - Execute a single HTTP request
- `mergeWithDefaults(step, defaults)` - Merge step config with global defaults
- `promptUserInput(userPrompts)` - Collect CLI user input interactively

**State Management:**
- **Config**: Loaded from file via `readJSONFile(configPath)` in `runSequence()`, stored as local variable `config`
- **Responses Array**: `responses[]` - Stores all step responses for reference by later steps (indexed by step position)
  - Each entry: `{ id: "step-id", status: 200, body: {...} }`
  - Skipped steps stored as `{ id: "step-id", status: 0, body: {} }` to maintain array indexing
- **User Input**: `userInput{}` - Persistent object across all steps, merged with new input from each step's `userPrompts`
- **Execution Log**: `executionLog[]` - Complete record of all steps for logging/debugging

#### lib/substitution.js - Variable Substitution
**Responsibilities:**
- Replace placeholders in config with actual values
- Track substitutions for debugging/logging

**Key Functions:**
- `replaceDynamicPlaceholders(obj)` - Replace `{{ $guid }}` and `{{ $timestamp }}`
- `substituteVariables(value, context)` - Replace global vars, user input, response references
- `substituteInObject(obj, context)` - Recursively substitute in objects/arrays
- `substituteWithTracking(obj, context)` - Returns both substituted object and substitution log

**Substitution Order:**
1. Dynamic Variables (`{{ $guid }}`, `{{ $timestamp }}`)
2. Global Variables (`{{ .vars.key }}`)
3. User Input (`{{ .input.key }}`)
4. Response References (`{{ .responses.stepId.field }}`)

#### lib/http-client.js - HTTP Requests
**Responsibilities:**
- Execute HTTP requests using axios
- Handle timeouts and network errors

**Key Functions:**
- `executeRequest({ method, url, headers, body, timeout })` - Execute HTTP request
  - Converts timeout from seconds to milliseconds for axios
  - Returns normalized response: `{ status, statusText, headers, body }`

#### lib/validator.js - Response Validation
**Responsibilities:**
- Validate HTTP responses against rules
- Support multiple validation types (status codes, JSON paths, comparisons)

**Key Functions:**
- `validateResponse(response, validations, enableDebug)` - Validates response
  - Returns array of validation results
  - Throws error on validation failure (includes validationResults in error object)

**Validation Types:**
- `httpStatusCode` - HTTP status validation
- `jsonpath` - Field existence, equality, inequality, numeric comparisons

#### lib/conditions.js - Conditional Execution
**Responsibilities:**
- Evaluate step execution conditions
- Determine if step should be skipped

**Key Functions:**
- `evaluateConditions(conditions, context)` - Returns `{ shouldExecute, skipReason }`
- Condition sources: `node` (previous response), `variable` (global var), `input` (user input)
- Condition types: `statusCode`, `equals`, `notEquals`, `exists`, `greaterThan`, `lessThan`, etc.

#### lib/utils.js - Utilities
**Key Functions:**
- `readJSONFile(path)` - Load and parse JSON config file
- `extractValue(obj, path)` - Extract value from object using JSON path
- `generateUUID()` - Generate UUID v4 for `{{ $guid }}`
- `getTimestamp()` - Get Unix timestamp for `{{ $timestamp }}`
- `deepMerge(target, source)` - Deep merge objects
- `colorize(text, color)` - Terminal color output

---

### Studio Components (Browser + Express Server)

#### Studio Server (bin/flowsphere.js)
When `flowsphere studio` is invoked, an Express server starts on port 3737 (configurable with `--port`).

**API Endpoints:**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/execute` | POST | Execute sequence (legacy, non-streaming) |
| `/api/execute-stream` | POST | Execute sequence with SSE streaming (Flow Runner) |
| `/api/execute-node` | POST | Execute single node (Try it Out feature) |
| `/api/provide-input` | POST | Provide user input during execution |
| `/api/save-log` | POST | Save execution log to disk |
| `/api/validate` | POST | Validate config without executing |
| `/api/templates/nodes` | GET | List all node templates |
| `/api/templates/nodes/:category/:id` | GET | Get specific template |

**Static Files:**
- Serves `studio/` directory for HTML/CSS/JS files

#### Studio State Management (studio/js/state.js)
**Global Variables:**
- `config` - The loaded configuration object (shared across all Studio modules)
  - Initially `null`
  - Loaded from file upload, localStorage, or templates
  - Modified directly by all editor actions
- `fileName` - Current config filename
- `openStepIndices` - Set of expanded step indices in editor
- Autocomplete state variables (dropdown, target, suggestions)

**Integration Points:**
- All UI modules access `config` from `state.js`
- Modifications to `config` must trigger `renderEditor()` to update UI
- Variables added to `config.variables`, rendered with `renderGlobalVariables()`
- Nodes added to `config.nodes`, rendered in editor

#### Studio UI Modules (studio/js/)
**Modular Architecture:**
- `main.js` - Initialization, core event handlers
- `config-manager.js` - Load/save/reset config operations
- `modals.js` - Modal dialog management (add node, edit defaults, etc.)
- `flow-runner.js` - Live execution engine with SSE streaming (also contains global modal config)
- `try-it-out.js` - Single node testing feature
- `autocomplete.js` - Variable substitution autocomplete
- `bootstrap-modal-bridge.js` - Bridge between vanilla JS and Bootstrap 5 modals

**Modal System:**
All Bootstrap modals use a centralized configuration system for consistent behavior. See **[Modal System Architecture](./modal-system.md)** for details.

**Data Flow:**
1. User interacts with UI (button click, form submit)
2. Event handler modifies global `config` object
3. Handler calls `renderEditor()` to update UI
4. UI re-renders from `config` state

---

## Execution Flow

### CLI Execution Flow

```
User runs: flowsphere config.json

1. bin/flowsphere.js:main()
   ↓
2. Read config from file: readJSONFile(configPath)
   ↓
3. Validate config: validateConfig(config)
   ↓
4. lib/executor.js:runSequence(configPath, options)
   ↓
5. Load defaults, variables, nodes from config
   ↓
6. FOR EACH node in config.nodes:
   a. Merge with defaults: mergeWithDefaults(node, defaults)
   b. Check if user input needed: promptUserInput(userPrompts)
   c. Evaluate conditions: evaluateConditions(conditions, context)
   d. If shouldExecute:
      i.   Execute step: executeStep(node, context)
           - Substitute variables: substituteWithTracking()
           - Execute HTTP: executeRequest()
      ii.  Validate response: validateResponse()
      iii. Store response in responses[] array
      iv.  Log to executionLog[]
   ↓
7. Return execution result (success/failure, log)
   ↓
8. Prompt to save log: promptSaveLog()
```

### Studio Execution Flow (SSE Streaming)

```
User clicks "Go with the Flow" button

1. studio/js/flow-runner.js:runSequence()
   ↓
2. POST to /api/execute-stream with config object
   ↓
3. Server (bin/flowsphere.js):
   a. Generate unique execution ID
   b. Open SSE connection
   c. Create temp config file
   d. Load config, defaults, variables, nodes
   ↓
4. FOR EACH node:
   a. Send 'step_start' event to client
   b. Check if user input needed → Send 'input_required' event → Wait for /api/provide-input
   c. Evaluate conditions
   d. Execute step (same as CLI)
   e. Validate response
   f. Send 'step' event with complete results to client
   ↓
5. Send 'end' event with executionLog
   ↓
6. Client receives events in real-time:
   - Creates step cards in modal
   - Shows validation results
   - Updates UI progressively
```

**Graceful Interruption (Stop Button):**
- Client: Close SSE connection, set `stopRequested = true`
- Server: Detect connection close → Set `executionCancelled = true`
- Current step completes naturally, then loop breaks
- Result: Last step shows complete results; next step shows "Not Run"

---

## Config Storage Locations

| Context | Storage Location | Format |
|---------|------------------|--------|
| **CLI Execution** | Local variable `config` in `runSequence()` | JavaScript object (parsed from JSON file) |
| **Studio (Browser)** | Global variable `config` in `state.js` | JavaScript object |
| **Studio (Persistence)** | `localStorage['flowsphere-config']` | JSON string (auto-save) |
| **Disk (CLI)** | JSON file passed as argument | JSON file |
| **Disk (Studio)** | Download from browser or upload to browser | JSON file |
| **Execution Log** | `logs/execution_log_YYYYMMDD_HHMMSS.json` | JSON file |

---

## Context Object

The **context** object is passed throughout execution to provide access to state:

```javascript
{
  vars: {},         // Global variables from config.variables
  responses: [],    // Array of previous step responses (indexed by position)
  input: {},        // User input collected from userPrompts (persistent across steps)
  enableDebug: false // Debug mode flag
}
```

**Usage:**
- Passed to `substituteVariables()` for variable replacement
- Passed to `evaluateConditions()` for condition evaluation
- Passed to `executeStep()` for step execution

---

## Integration Points

### CLI → Executor
- CLI calls `runSequence(configPath, options)`
- Receives execution result: `{ success, stepsExecuted, stepsSkipped, executionLog }`

### Studio → Server → Executor
- Studio POSTs config to `/api/execute-stream`
- Server creates temp config file
- Server imports and calls executor modules directly:
  - `mergeWithDefaults()`, `executeStep()`, `validateResponse()`, `evaluateConditions()`
- Server streams results back via SSE

### Try it Out → Server → Executor
- Studio POSTs single node + config to `/api/execute-node`
- Server uses executor modules to execute single step
- Returns synchronous JSON response (not streaming)

### Templates → Studio
- Studio fetches templates from `/api/templates/nodes`
- Server reads from `studio/templates/nodes/` directory
- Categories and templates loaded dynamically

---

## Defaults Merging Behavior

**Function:** `mergeWithDefaults(step, defaults)`

**Rules:**
- **baseUrl**: Prepended to relative URLs (starting with `/`)
- **timeout**: Step timeout overrides default; if not set, uses default
- **headers**: Merged (step headers override default headers with same key)
- **validations**:
  - If `step.skipDefaultValidations === true`: Use only step validations
  - Otherwise: Merge default validations + step validations (both applied)

---

## Variable Substitution Integration

**Where substitution happens:**
- `executeStep()` calls `substituteWithTracking(step, context)`
- Substitutes in: `url`, `headers`, `body`, and all nested objects/arrays
- Returns: `{ result: substitutedStep, substitutions: [...] }`

**Substitution tracking:**
Each substitution logged as:
```javascript
{
  original: "{{ .vars.apiKey }}",
  value: "abc123",
  type: "variable",
  path: "headers.Authorization"
}
```

**Used for:**
- Execution logs
- Debug output
- Try it Out results
- Flow Runner step cards

---

## Error Handling

**Validation Errors:**
- `validateResponse()` throws error with `validationResults` property
- Executor catches error, logs failure, stops execution
- Client receives validation results even on failure

**HTTP Errors:**
- Timeout: `executeRequest()` throws timeout error
- Network: Axios errors caught and thrown with message
- All errors stop execution immediately

**Config Validation Errors:**
- `validateConfig()` called before execution
- Returns `{ valid: boolean, errors: [...] }`
- If invalid, execution aborted with formatted error messages

---

## Future Architecture Considerations

> **📋 IMPORTANT**: When adding new features, always consult the **[Change Impact Guide](change-impact-guide.md)** for complete "chain of events" showing all files that need updating.

**Quick Guidelines**:
- **New validation types**: See [Chain 3](change-impact-guide.md#chain-3-adding-a-new-validation-type) in Change Impact Guide
- **New substitution sources**: See [Chain 5](change-impact-guide.md#chain-5-adding-a-new-substitution-syntax) in Change Impact Guide
- **New condition types**: See [Chain 4](change-impact-guide.md#chain-4-adding-a-new-condition-source-type) in Change Impact Guide
- **New Studio features**: See [Chain 7](change-impact-guide.md#chain-7-adding-a-new-studio-ui-componentfeature) in Change Impact Guide
- **New API endpoints**: See [Chain 6](change-impact-guide.md#chain-6-adding-a-new-server-api-endpoint) in Change Impact Guide
- **New config fields**: See [Chain 1](change-impact-guide.md#chain-1-adding-a-new-top-level-config-field) (root-level) or [Chain 2](change-impact-guide.md#chain-2-adding-a-new-node-level-field) (node-level) in Change Impact Guide

**State management rules:**
- CLI: Keep execution state in local variables (no global state)
- Studio: Use global `config` variable, always call `renderEditor()` after mutations
- Server: Use execution-scoped state (execution ID, pending requests map)

---

## File Organization

```
flowsphere/
├── bin/
│   └── flowsphere.js           CLI entry point, Express server
├── lib/
│   ├── executor.js             Execution orchestration
│   ├── substitution.js         Variable substitution
│   ├── http-client.js          HTTP requests
│   ├── validator.js            Response validation
│   ├── conditions.js           Conditional execution
│   ├── logger.js               Execution logging
│   ├── config-validator.js     Config validation
│   └── utils.js                Utilities
├── studio/
│   ├── index.html              Studio entry page
│   ├── js/
│   │   ├── state.js            Global config state
│   │   ├── main.js             Core initialization
│   │   ├── config-manager.js   Config load/save
│   │   ├── modals.js           Modal dialogs
│   │   ├── flow-runner.js      Live execution (SSE)
│   │   ├── try-it-out.js       Single node testing
│   │   └── autocomplete.js     Variable autocomplete
│   └── templates/              Node templates
├── examples/                   Example config files
├── tests/                      Test config files
└── logs/                       Execution logs (generated)
```

---

## Summary

FlowSphere uses a **modular architecture** with clear separation between:
- **Execution logic** (lib/executor.js, lib/http-client.js, lib/validator.js)
- **State management** (local variables in CLI, global `config` in Studio)
- **Client-server communication** (SSE streaming for Flow Runner, REST for Try it Out)
- **Variable substitution** (lib/substitution.js with context-aware replacement)

**Key architectural decisions:**
- Config stored as in-memory JavaScript object (loaded from JSON file)
- Responses array maintains step order with empty entries for skipped steps
- User input persists across all steps (merged from each step's prompts)
- SSE streaming enables real-time UI updates during execution
- Server reuses CLI executor modules for consistency

This architecture enables both **CLI automation** and **interactive browser-based editing/execution** using the same core engine.
