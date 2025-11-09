# FlowSphere Change Impact Guide

> **🔗 Chain of Events Reference**
> This document maps what needs to be updated when making different types of changes to FlowSphere.

## Quick Navigation

- [Codebase Structure](#i-codebase-structure)
- [Config Schema & Properties](#ii-config-schema--properties)
- [Change Type Chains](#iii-change-type-chains) ⭐ **Most Important**
- [File Relationships](#iv-file-relationships)
- [Documentation Structure](#v-documentation-structure)
- [Examples & Tests](#vi-examples--tests)
- [Common Scenarios](#vii-common-scenarios)
- [Quick Reference](#viii-quick-reference)
- [Important Invariants](#ix-important-invariants)
- [Testing Checklist](#x-testing-checklist)

---

## I. CODEBASE STRUCTURE

### A. Backend/Execution Engine (Node.js)

**Location**: `lib/`

| File | Responsibilities | Config Properties Processed |
|------|------------------|----------------------------|
| **config-validator.js** | Schema validation, structural checks, value checks | ALL config properties (validates entire structure) |
| **executor.js** | Main orchestration, sequence execution, user prompts | `enableDebug`, `variables`, `defaults`, `nodes`, `userPrompts` |
| **http-client.js** | HTTP request execution, timeout handling | `method`, `url`, `headers`, `body`, `timeout` |
| **substitution.js** | Variable substitution (dynamic, global, response, input) | `variables`, `responses`, `userInput`, dynamic placeholders |
| **validator.js** | Response validation (status codes, jsonpath) | `validations` (httpStatusCode, jsonpath) |
| **conditions.js** | Conditional execution logic (AND logic) | `conditions` (node, variable, input sources) |
| **logger.js** | Execution logging, log file generation | Logs entire execution state |
| **utils.js** | UUID generation, timestamp, JSON path extraction, file I/O | Utility functions used across all modules |
| **index.js** | Module exports | N/A (aggregator) |

### B. CLI Entry Point

**Location**: `bin/flowsphere.js`

**Responsibilities**:
- Command parsing (--start-step, --version, --help, --validate, studio)
- Studio server setup (Express)
- API endpoints for Studio

**Server API Endpoints**:

| Endpoint | Method | Purpose | Dependencies |
|----------|--------|---------|--------------|
| `POST /api/execute` | POST | Full sequence execution | `executor.runSequence()` |
| `POST /api/execute-step` | POST | Single step execution (step-by-step mode) | `executor.executeStep()`, `validator.validateResponse()`, `conditions.evaluateConditions()` |
| `POST /api/execute-stream` | POST | SSE streaming execution | `executor.executeStep()`, `validator.validateResponse()`, `conditions.evaluateConditions()` |
| `POST /api/execute-node` | POST | Single node test (Try It Out) | `executor.executeStep()`, `executor.mergeWithDefaults()`, `validator.validateResponse()` |
| `POST /api/validate` | POST | Config validation only | `config-validator.validateConfig()` |
| `POST /api/save-log` | POST | Save execution log | `logger.saveLog()` |
| `POST /api/provide-input` | POST | Provide user input during execution | N/A (state management) |
| `GET /api/templates/nodes` | GET | List node templates | File system (studio/templates/nodes/) |
| `GET /api/templates/nodes/:category/:id` | GET | Get specific template | File system (studio/templates/nodes/:category/:id.json) |

### C. Studio UI (Browser-based Editor)

**Location**: `studio/`

#### Studio JavaScript Modules

| File | Responsibilities | Config Properties Handled |
|------|------------------|---------------------------|
| **state.js** | Global state management (`config`, `fileName`, `openStepIndices`) | N/A (state container) |
| **ui-renderer.js** | Main editor rendering, forms, sections | `enableDebug`, `variables`, `defaults.baseUrl`, `defaults.timeout`, `defaults.headers`, `defaults.validations`, `nodes` |
| **modals.js** | Modal dialogs (conditions, validations, prompts, headers) | `nodes[].conditions`, `nodes[].validations`, `nodes[].userPrompts`, `nodes[].headers`, `defaults.validations` |
| **form-handlers.js** | Form input handlers, updates config state | All node properties, default properties, variables |
| **autocomplete.js** | Variable substitution autocomplete ({{ }}) | All config properties (reads for suggestions) |
| **config-manager.js** | File operations (load, save, import, export) | Entire config object |
| **config-validator-ui.js** | UI for validation results | Calls `/api/validate` |
| **flow-runner.js** | Flow execution from Studio UI | Calls `/api/execute-stream`, handles SSE events |
| **try-it-out.js** | Single node testing | Calls `/api/execute-node` |
| **templates.js** | Template loading and application | N/A (reads from `/api/templates/nodes`) |
| **import-nodes.js** | Import nodes from templates or Postman | Modifies `config.nodes` |
| **postman-parser.js** | Parse Postman collections | Creates `config` from Postman data |
| **theme-switcher.js** | Light/dark theme toggle | N/A (UI only) |
| **drag-drop-handler.js** | Drag-and-drop node reordering | Modifies `config.nodes` array order |
| **bootstrap-modal-bridge.js** | Bootstrap 5 modal compatibility | N/A (UI bridge) |
| **ui-renderer-bootstrap.js** | Bootstrap 5 UI rendering | All config properties (renders entire editor) |
| **main.js** | Initialization, event handlers | N/A (orchestrator) |

### D. Node Templates

**Location**: `studio/templates/nodes/`

**Structure**:
```
templates/nodes/
├── auth/
│   ├── api-key.json
│   ├── bearer-token.json
│   └── oauth-flow.json
├── user-input/
│   ├── custom-input.json
│   ├── username-password.json
│   └── verification-code.json
├── validation/
│   ├── multi-field.json
│   ├── paginated-response.json
│   └── status-token-extract.json
└── conditional/
    ├── premium-user.json
    └── skip-on-error.json
```

**Each template** contains a complete node configuration with:
- `name`, `description`
- Complete node structure (method, url, headers, body, etc.)
- Example values and placeholders

---

## II. CONFIG SCHEMA & PROPERTIES

### Root-Level Properties

| Property | Type | Validated By | Executed By | Rendered By (Studio) |
|----------|------|--------------|-------------|---------------------|
| `enableDebug` | boolean | config-validator.js | executor.js | ui-renderer.js (General Settings) |
| `variables` | object | config-validator.js | executor.js, substitution.js | ui-renderer.js (Global Variables section), autocomplete.js |
| `defaults` | object | config-validator.js | executor.js (mergeWithDefaults) | ui-renderer.js (Default Settings section) |
| `defaults.baseUrl` | string | config-validator.js | executor.js | ui-renderer.js, autocomplete.js |
| `defaults.timeout` | number | config-validator.js | executor.js, http-client.js | ui-renderer.js |
| `defaults.headers` | object | config-validator.js | executor.js, http-client.js | ui-renderer.js, modals.js |
| `defaults.validations` | array | config-validator.js | validator.js | ui-renderer.js, modals.js |
| `nodes` | array | config-validator.js | executor.js | ui-renderer.js, ui-renderer-bootstrap.js |

### Node-Level Properties (each item in `nodes[]`)

| Property | Type | Validated By | Executed By | Rendered By (Studio) |
|----------|------|--------------|-------------|---------------------|
| `id` | string | config-validator.js | executor.js, substitution.js | ui-renderer.js (step header), autocomplete.js |
| `name` | string | config-validator.js | executor.js (logging) | ui-renderer.js (step header) |
| `method` | string | config-validator.js | http-client.js | modals.js (step form) |
| `url` | string | config-validator.js | executor.js, http-client.js, substitution.js | modals.js (step form), autocomplete.js |
| `timeout` | number | config-validator.js | http-client.js | modals.js (step form) |
| `headers` | object | config-validator.js | http-client.js, substitution.js | modals.js (headers builder) |
| `body` | object/any | config-validator.js | http-client.js, substitution.js | modals.js (request body textarea) |
| `userPrompts` | object | config-validator.js | executor.js (promptUserInput) | modals.js (prompts builder) |
| `conditions` | array | config-validator.js | conditions.js | modals.js (conditions builder) |
| `validations` | array | config-validator.js | validator.js | modals.js (validations builder) |
| `launchBrowser` | string | config-validator.js | executor.js | modals.js (step form) |
| `skipDefaultValidations` | boolean | config-validator.js | executor.js (mergeWithDefaults) | modals.js |
| `skipDefaultHeaders` | boolean | config-validator.js | executor.js (mergeWithDefaults) | modals.js |

### Condition Object Properties

| Property | Type | Validated By | Evaluated By | Rendered By |
|----------|------|--------------|--------------|-------------|
| `source` | string ('node', 'variable', 'input') | config-validator.js | conditions.js | modals.js (condition modal) |
| `node` | string (node ID) | config-validator.js | conditions.js | modals.js, autocomplete.js |
| `variable` | string (variable name) | config-validator.js | conditions.js | modals.js, autocomplete.js |
| `input` | string (input name) | config-validator.js | conditions.js | modals.js, autocomplete.js |
| `field` | string (jsonpath) | config-validator.js | conditions.js, utils.extractValue | modals.js, autocomplete.js |
| `httpStatusCode` | number | config-validator.js | conditions.js | modals.js |
| `equals` | any | config-validator.js | conditions.js | modals.js |
| `notEquals` | any | config-validator.js | conditions.js | modals.js |
| `greaterThan` | number | config-validator.js | conditions.js | modals.js |
| `lessThan` | number | config-validator.js | conditions.js | modals.js |
| `greaterThanOrEqual` | number | config-validator.js | conditions.js | modals.js |
| `lessThanOrEqual` | number | config-validator.js | conditions.js | modals.js |
| `exists` | boolean | config-validator.js | conditions.js | modals.js |

### Validation Object Properties

| Property | Type | Validated By | Evaluated By | Rendered By |
|----------|------|--------------|--------------|-------------|
| `httpStatusCode` | number | config-validator.js | validator.js | modals.js (validation modal) |
| `jsonpath` | string | config-validator.js | validator.js, utils.extractValue | modals.js, autocomplete.js |
| `exists` | boolean | config-validator.js | validator.js | modals.js |
| `equals` | any | config-validator.js | validator.js | modals.js |
| `notEquals` | any | config-validator.js | validator.js | modals.js |
| `greaterThan` | number | config-validator.js | validator.js | modals.js |
| `lessThan` | number | config-validator.js | validator.js | modals.js |
| `greaterThanOrEqual` | number | config-validator.js | validator.js | modals.js |
| `lessThanOrEqual` | number | config-validator.js | validator.js | modals.js |

---

## III. CHANGE TYPE CHAINS

### Chain 1: Adding a New Top-Level Config Field

**Example**: Adding `retryConfig` to enable automatic retries

**Required Updates**:

1. ✅ **lib/config-validator.js**
   - Add validation rules for the new field
   - Define allowed values, types, constraints
   - Add to validation error messages

2. ✅ **lib/executor.js** (if field affects execution)
   - Read the field value from config
   - Implement the execution logic
   - Pass to appropriate modules

3. ✅ **studio/js/ui-renderer.js**
   - Add form field to render the UI
   - Add to appropriate section (General Settings, Defaults, etc.)
   - Wire up onChange handlers

4. ✅ **studio/js/form-handlers.js**
   - Add update function for the field
   - Ensure it saves to `config` state
   - Trigger localStorage save and preview update

5. ✅ **CLAUDE.md**
   - Document the new field in "Config File Format" section
   - Add examples showing how to use it
   - Update feature description

6. ✅ **docs/technical/config-validation-system.md**
   - Document validation rules for the field
   - Add to schema documentation

7. ✅ **examples/config-comprehensive-demo.json**
   - Add example usage of the new field
   - Show realistic values

8. ✅ **tests/** (create new test config)
   - Create `config-test-retry.json` to test the feature
   - Include edge cases

---

### Chain 2: Adding a New Node-Level Field

**Example**: Adding `retryAttempts` to individual nodes

**Required Updates**:

1. ✅ **lib/config-validator.js**
   - Add validation in `validateNode()` function
   - Check type, constraints, allowed values

2. ✅ **lib/executor.js** OR **lib/http-client.js**
   - Implement the retry logic
   - Read `node.retryAttempts` value
   - Execute accordingly

3. ✅ **studio/js/modals.js** OR **studio/js/ui-renderer.js**
   - Add form field in `renderStepForm()` function
   - Place in appropriate section (Request Details, Response Handling, etc.)
   - Wire up `updateStep()` handler

4. ✅ **studio/js/autocomplete.js** (if field accepts variable substitution)
   - No changes needed (handles all text inputs automatically)

5. ✅ **CLAUDE.md**
   - Add to "Node-Level Properties" table
   - Document in config format section
   - Add usage examples

6. ✅ **studio/templates/nodes/** (if creating a template for this pattern)
   - Create template in appropriate category
   - Example: `templates/nodes/resilience/retry-on-failure.json`

7. ✅ **examples/config-comprehensive-demo.json**
   - Add example node using the new field

8. ✅ **tests/**
   - Create `config-test-retry-attempts.json`

---

### Chain 3: Adding a New Validation Type

**Example**: Adding `contains` validation to check if a string contains a substring

**Required Updates**:

1. ✅ **lib/config-validator.js**
   - Add `'contains'` to `VALID_COMPARISON_OPERATORS` array (line ~22)
   - Add validation logic in `validateValidationRule()` if needed

2. ✅ **lib/validator.js**
   - Add validation logic in `validateResponse()` function
   - Handle the new `contains` criterion
   - Return validation results with `passed` boolean

3. ✅ **studio/js/modals.js**
   - Add checkbox and input field in `showValidationModal()` function (around line 600-715)
   - Add to `saveValidation()` function to read the value (around line 783-893)
   - Add to `renderValidationsList()` to display (around line 537-590)

4. ✅ **CLAUDE.md**
   - Add to "Validation" section
   - Document the new validation type
   - Show examples

5. ✅ **docs/technical/config-validation-system.md**
   - Document the new validation type
   - Add to validation rules reference

6. ✅ **examples/config-comprehensive-demo.json**
   - Add example validation using `contains`

7. ✅ **tests/**
   - Create `config-test-validation-contains.json`

---

### Chain 4: Adding a New Condition Source Type

**Example**: Adding `environment` as a condition source to check environment variables

**Required Updates**:

1. ✅ **lib/config-validator.js**
   - Update `validateCondition()` to handle new source type
   - Add validation for `environment` field

2. ✅ **lib/conditions.js**
   - Add case for `sourceType === 'environment'` in `evaluateCondition()`
   - Implement logic to read environment variables
   - Return evaluation result with reason

3. ✅ **studio/js/modals.js**
   - Add option to `<select id="conditionSource">` (around line 134)
   - Add to `renderConditionSourceFields()` to show environment-specific fields
   - Add to `saveCondition()` to read environment field
   - Update `renderConditionsList()` to display environment conditions

4. ✅ **studio/js/autocomplete.js**
   - Update `buildAutocompleteSuggestions()` if environment variables should appear
   - Add `.env.` category if needed

5. ✅ **CLAUDE.md**
   - Document new condition source
   - Add examples

6. ✅ **examples/config-comprehensive-demo.json**
   - Add example using environment condition

7. ✅ **tests/**
   - Create `config-test-condition-environment.json`

---

### Chain 5: Adding a New Substitution Syntax

**Example**: Adding `{{ $randomInt(min, max) }}` for random number generation

**Required Updates**:

1. ✅ **lib/substitution.js**
   - Add regex pattern for new syntax
   - Add function to generate random int
   - Add substitution logic in `substituteVariables()` or `replaceDynamicPlaceholders()`
   - Add to substitution tracking

2. ✅ **studio/js/autocomplete.js**
   - Add to `buildAutocompleteSuggestions()` in "Basic Syntax" category
   - Show as `$randomInt(min, max)`

3. ✅ **lib/config-validator.js**
   - Update `validatePlaceholders()` to recognize new syntax
   - Allow `$randomInt` in placeholder validation

4. ✅ **CLAUDE.md**
   - Add to "Dynamic Value Substitution" section
   - Document syntax and examples

5. ✅ **examples/config-comprehensive-demo.json**
   - Add example using `{{ $randomInt(1, 100) }}`

6. ✅ **tests/**
   - Create `config-test-random-int.json`

---

### Chain 6: Adding a New Server API Endpoint

**Example**: Adding `/api/execute-parallel` for parallel execution

**Required Updates**:

1. ✅ **bin/flowsphere.js**
   - Add route handler: `app.post('/api/execute-parallel', async (req, res) => { ... })`
   - Implement logic or call executor functions
   - Return appropriate response

2. ✅ **studio/js/flow-runner.js** (if Studio needs to call it)
   - Add function to call the endpoint
   - Handle response/errors
   - Update UI based on results

3. ✅ **CLAUDE.md** (Server API section)
   - Document the new endpoint
   - Parameters, request body, response format

4. ✅ **docs/technical/flow-execution-architecture.md**
   - Document how parallel execution works
   - Sequence diagrams if needed

---

### Chain 7: Adding a New Studio UI Component/Feature

**Example**: Adding "Export to Swagger" feature

**Required Updates**:

1. ✅ **studio/js/** (create new file)
   - Create `swagger-exporter.js`
   - Implement export logic
   - Convert config to Swagger/OpenAPI format

2. ✅ **studio/index.html**
   - Add `<script>` tag to load `swagger-exporter.js`
   - Add button/menu item to trigger export

3. ✅ **studio/js/main.js**
   - Wire up event handler for export button
   - Call export function

4. ✅ **CLAUDE.md** (FlowSphere Studio section)
   - Document the new export feature
   - Usage instructions

5. ✅ **docs/features/**
   - Create `export-to-swagger.md` if significant feature

---

### Chain 8: Adding a New Node Template

**Example**: Adding "Webhook Receiver" template

**Required Updates**:

1. ✅ **studio/templates/nodes/** (create new file)
   - Create appropriate category folder (e.g., `integration/`)
   - Create `webhook-receiver.json` with:
     ```json
     {
       "name": "Webhook Receiver",
       "description": "Simulate receiving a webhook",
       "node": {
         "name": "POST Webhook",
         "id": "receive-webhook",
         "method": "POST",
         "url": "/webhooks/incoming",
         "headers": { "Content-Type": "application/json" },
         "body": { "event": "user.created", "data": {} }
       }
     }
     ```

2. ✅ **No code changes needed** - Templates are loaded dynamically via `/api/templates/nodes`

3. ✅ **studio/js/import-nodes.js** (if template requires special handling)
   - May need updates if template structure is non-standard

4. ✅ **docs/features/node-templates-import-system.md**
   - Document the new template
   - Add to template catalog

---

### Chain 9: Modifying Validation Logic

**Example**: Changing how `greaterThan` validation works (support strings too)

**Required Updates**:

1. ✅ **lib/validator.js**
   - Update `validateResponse()` function
   - Modify `greaterThan` comparison logic
   - Handle string comparisons

2. ✅ **lib/config-validator.js** (if changing what's allowed)
   - Update validation rules
   - Allow string values for `greaterThan`

3. ✅ **tests/**
   - Update `config-test-comparisons.json`
   - Add test cases for string comparisons

4. ✅ **CLAUDE.md**
   - Update documentation to reflect new behavior
   - Add examples

---

### Chain 10: Adding Documentation

**New Feature Documentation**:

1. ✅ **CLAUDE.md** (always)
   - Update appropriate section
   - Add examples

2. ✅ **docs/features/** (for user-facing features)
   - Create `feature-name.md`
   - Include: Overview, Problem Statement, Solution, Key Features, Examples, Benefits

3. ✅ **docs/technical/** (for architectural changes)
   - Create `technical-design-name.md`
   - Include: Architecture, Integration Points, Data Flow, Dependencies

4. ✅ **docs/implementation/** (for tracking)
   - Create `feature-implementation-status.md`
   - Track progress, issues, testing

5. ✅ **ROADMAP.md** (if planning ahead)
   - Add to appropriate phase/milestone

---

## IV. FILE RELATIONSHIPS

### Config → Backend Flow

```
config.json
  ↓ (loaded by)
lib/executor.js
  ↓ (validates with)
lib/config-validator.js
  ↓ (executes nodes using)
lib/http-client.js + lib/substitution.js + lib/conditions.js + lib/validator.js
  ↓ (logs results with)
lib/logger.js
```

### Config → Studio Flow

```
config.json
  ↓ (loaded into)
studio/js/config-manager.js
  ↓ (stored in)
studio/js/state.js (global `config` variable)
  ↓ (rendered by)
studio/js/ui-renderer.js + studio/js/ui-renderer-bootstrap.js
  ↓ (edited via)
studio/js/modals.js + studio/js/form-handlers.js
  ↓ (enhanced by)
studio/js/autocomplete.js
  ↓ (validated by)
studio/js/config-validator-ui.js → bin/flowsphere.js (/api/validate)
  ↓ (executed by)
studio/js/flow-runner.js → bin/flowsphere.js (/api/execute-stream)
```

### Substitution Flow

```
User types: {{ .responses.login.token }}
  ↓
studio/js/autocomplete.js (suggests completions)
  ↓ (saved to config)
config.nodes[N].headers.Authorization = "Bearer {{ .responses.login.token }}"
  ↓ (during execution)
lib/executor.js → lib/substitution.js
  ↓ (looks up)
responses[findIndex(r => r.id === 'login')].body.token
  ↓ (replaces with)
"Bearer abc123..."
  ↓ (sent in request)
lib/http-client.js
```

### Validation Flow

```
config.nodes[N].validations = [
  { "httpStatusCode": 200 },
  { "jsonpath": ".token", "exists": true }
]
  ↓ (validated for structure by)
lib/config-validator.js
  ↓ (during execution)
lib/executor.js → lib/http-client.js (gets response)
  ↓ (validates response against rules)
lib/validator.js
  ↓ (uses)
lib/utils.js (extractValue for jsonpath)
  ↓ (returns)
validationResults[] (passed/failed for each rule)
```

---

## V. DOCUMENTATION STRUCTURE

### Root Level
- **ROADMAP.md** - High-level feature roadmap, user-facing

### docs/
- **INTERNAL-TASKS.md** - Internal improvements, infrastructure

### docs/features/
- User-facing feature specifications
- Examples: `swagger-openapi-import.md`, `execution-log-visualizer.md`, `node-templates-import-system.md`

### docs/technical/
- Technical architecture documents
- Examples: `flow-execution-architecture.md`, `config-validation-system.md`, `core-architecture.md`, `change-impact-guide.md`

### docs/implementation/
- Implementation tracking, status updates
- Examples: `phase1-stop-implementation-status.md`

### docs/prompts/
- AI prompts and branding guidelines used during development
- Examples: API prompts, theme guidelines, execution mode branding

---

## VI. EXAMPLES & TESTS

### examples/
- **config-simple.json** - Basic example
- **config.json** - Full-featured example
- **config-oauth-example.json** - OAuth flow
- **config-user-input.json** - User input
- **config-comprehensive-demo.json** - **ALL features** (12 nodes)
- **config-test-features.json** - Feature demos

**Purpose**: Show users how to use features

### tests/
- **config-test-variables.json** - Global variables
- **config-test-multiple-validations.json** - Multiple validations
- **config-test-defaults.json** - Defaults merging
- **config-test-comparisons.json** - Numeric comparisons
- **config-test-condition-variables.json** - Condition variables
- **config-test-skip-defaults.json** - Skip defaults
- **config-test-persistent-input.json** - Persistent user input
- **config-test-validation-errors.json** - Validation error handling
- **config-test-duplicate-ids.json** - Duplicate ID detection

**Purpose**: Automated testing, edge cases, error scenarios

---

## VII. COMMON SCENARIOS

### Scenario A: User Reports "Variable Substitution Not Working"

**Investigation Chain**:
1. Check `lib/substitution.js` - Is the syntax being matched?
2. Check `lib/config-validator.js` - Is the placeholder being validated?
3. Check `studio/js/autocomplete.js` - Is it showing up in suggestions?
4. Check `CLAUDE.md` - Is the syntax documented correctly?
5. Create test config in `tests/` to reproduce

### Scenario B: Adding New HTTP Method (e.g., TRACE)

**Update Chain**:
1. **lib/config-validator.js**: Add `'TRACE'` to `VALID_HTTP_METHODS` array
2. **lib/http-client.js**: Ensure axios handles TRACE (usually automatic)
3. **studio/js/modals.js**: Add `<option value="TRACE">` to method dropdown
4. **CLAUDE.md**: Document TRACE method support
5. **examples/**: Add example if TRACE has unique use case

### Scenario C: Changing Default Timeout from 30s to 60s

**Update Chain**:
1. **lib/executor.js**: Update default in `mergeWithDefaults()` (if not from config)
2. **studio/js/ui-renderer.js**: Update default in UI render
3. **CLAUDE.md**: Update default in documentation
4. **examples/config-comprehensive-demo.json**: Update if present

### Scenario D: Breaking Change to Config Schema

**Example**: Renaming `validations` to `assertions`

**⚠️ FIRST STEP: ASK THE USER** if backwards compatibility is required for this change.

**Path A: Backwards Compatibility Required**
1. **lib/config-validator.js**: Support BOTH old and new names with deprecation warning
2. **lib/validator.js**: Read from both `validations` and `assertions`
3. **studio/js/modals.js**: Update to use new name, but support reading old configs
4. **CLAUDE.md**: Document migration path and deprecation timeline
5. **Create migration script** in `scripts/` to auto-convert old configs (optional helper)
6. **Update ALL examples/** and **tests/** to use new format

**Path B: Breaking Change Accepted (No Backwards Compatibility)**
1. **lib/config-validator.js**: Update to only accept new name `assertions`
2. **lib/validator.js**: Update to only read from `assertions`
3. **studio/js/modals.js**: Update all references to new name
4. **CLAUDE.md**: Document the breaking change clearly with migration instructions
5. **Update ALL examples/** and **tests/** files to use new format
6. **Update version** in package.json following semver (0.x.x → 0.y.0 for breaking change)

---

## VIII. QUICK REFERENCE

### "I need to add a new config field, what do I update?"

1. Determine level: Root-level, defaults, or node-level?
2. Follow appropriate chain from Section III
3. At minimum: validator → executor/module → UI → docs → examples → tests

### "I need to change how validation works"

1. `lib/validator.js` - Update logic
2. `lib/config-validator.js` - Update schema validation if needed
3. `studio/js/modals.js` - Update UI if adding new options
4. `tests/` - Add test cases
5. `CLAUDE.md` - Update documentation

### "I need to add a new Studio feature"

1. Create `studio/js/new-feature.js`
2. Update `studio/index.html` to load it
3. Wire up in `studio/js/main.js`
4. Update `CLAUDE.md` Studio section
5. Consider adding to `docs/features/`

### "I need to add a new API endpoint"

1. Add route in `bin/flowsphere.js`
2. Implement handler
3. Update Studio UI to call it (if needed)
4. Document in `CLAUDE.md`
5. Consider adding to `docs/technical/`

---

## IX. IMPORTANT INVARIANTS

These must ALWAYS be maintained:

1. **config.nodes** is an array - never change to object
2. **Node IDs must be unique** - enforced by validator
3. **All config changes must go through state.js** in Studio
4. **All text inputs support variable substitution** via autocomplete
5. **Substitution order**: Dynamic Vars → Global Vars → User Input → Response Refs
6. **Validation order**: Structure validation (config-validator.js) → Execution validation (validator.js)
7. **Backwards compatibility**:
   - ⚠️ **ASK THE USER** if backwards compatibility is required for your change
   - FlowSphere is in early version (0.x.x) with limited installs
   - Breaking changes may be acceptable if benefits outweigh migration costs
   - If backwards compatibility IS required, support both old and new formats with deprecation warnings
   - If breaking changes ARE acceptable, document migration path in CLAUDE.md
8. **Studio localStorage** = source of truth for unsaved changes

---

## X. TESTING CHECKLIST

When adding new features, test:

- [ ] CLI execution (`node bin/flowsphere.js`)
- [ ] Studio UI rendering
- [ ] Config validation (both valid and invalid cases)
- [ ] Variable substitution (if applicable)
- [ ] Autocomplete suggestions (if text field)
- [ ] Save/load from file
- [ ] Export JSON preview
- [ ] Backwards compatibility with old configs (if required by user)
- [ ] Error messages are clear and helpful
- [ ] Dark and light themes (Studio UI)
- [ ] Cross-platform compatibility (Windows, macOS, Linux)

---

## Summary

This guide maps the complete FlowSphere codebase and provides clear "chain of events" for any type of change. Use it as a reference when implementing features or fixing bugs to ensure you don't miss any required updates.

**Key Principle**: Every change ripples through multiple layers:
1. **Validation** (config-validator.js) - What's allowed?
2. **Execution** (lib/ modules) - How does it work?
3. **UI** (studio/js/) - How do users interact with it?
4. **Documentation** (CLAUDE.md, docs/) - How is it explained?
5. **Examples/Tests** (examples/, tests/) - How is it demonstrated/verified?
