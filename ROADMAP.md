# FlowSphere Roadmap

This document outlines the planned features and enhancements for FlowSphere.

## Priority Overview

### Planned Features

Features listed in priority order (highest to lowest):

| Priority | Feature | Status |
|----------|---------|--------|
| 1 | Test Execution with Proxy (Bypass CORS) | Planned |
| 2 | Try it Out - Individual Node Testing | Planned |
| 3 | Execution Log Visualizer | Planned |
| 4 | Swagger/OpenAPI Import | Planned |
| 5 | Enhanced Postman Import | Planned |
| 6 | Export to Postman Collection/Environment | Planned |

### Completed & External Features

| Feature | Status |
|---------|--------|
| JavaScript/Node.js Version & NPM Package | ✅ Completed |
| Plug-and-Play UI Architecture | ✅ Completed |
| MCP Server for Code Generation | [External Repository](https://github.com/ymoud/flowsphere-mcp) |

---

## Detailed Feature Specifications

## FlowSphere Studio Enhancements

### Test Execution with Proxy (Bypass CORS)

Add a proxy endpoint to the FlowSphere Studio Express server to enable direct API testing from the browser without CORS restrictions.

**Current Problem:**
- Studio runs in browser (client-side only)
- Direct API calls from browser hit CORS restrictions
- Can't test sequences live without running CLI separately

**Solution:**
Now that Studio is served via Express (Node.js), add an `/api/execute` endpoint that:
1. Receives config from browser
2. Uses the **existing `lib/executor.js`** module (same code as CLI)
3. Returns execution results with full logs
4. **Zero code duplication** - same logic for CLI and Studio

**Benefits:**
- ✅ **Zero code duplication** - Studio uses the exact same execution engine as CLI
- ✅ Test API sequences directly in Studio UI without leaving browser
- ✅ Bypass CORS restrictions (browser → localhost → external API)
- ✅ See real responses while building configs
- ✅ Validate configs immediately without running CLI
- ✅ Debug API issues faster with live feedback
- ✅ No need to switch between Studio and terminal
- ✅ Changes to executor/validator/conditions automatically work in both CLI and Studio
- ✅ Identical output format for CLI and Studio (execution logs)

**Proposed UI:**
```
[Config Editor]
  Node 1: Login
  Node 2: Get Profile
  Node 3: Create Resource

[▶ Run Sequence] [⏸ Pause] [⏹ Stop] [Clear Results]

[Live Results Panel]
Step 1: Login ✅ (200 OK) - 234ms
  Response: { "token": "eyJ..." }

Step 2: Get Profile ✅ (200 OK) - 156ms
  Response: { "id": 123, "name": "John" }

Step 3: Create Resource ⏳ Running...
```

**Express API Implementation (Reuses Existing Code):**

```javascript
// In bin/flowsphere.js - launchStudio() function
const { runSequence } = require('../lib/executor'); // REUSE existing executor

app.use(express.json()); // Parse JSON bodies

// Execute endpoint - runs config using the SAME code as CLI
app.post('/api/execute', async (req, res) => {
  const { config, options } = req.body;

  try {
    // Write config to temp file (executor expects file path)
    const tempConfigPath = path.join(os.tmpdir(), `flowsphere-${Date.now()}.json`);
    fs.writeFileSync(tempConfigPath, JSON.stringify(config));

    // Use the EXACT SAME executor as CLI
    const result = await runSequence(tempConfigPath, {
      startStep: options?.startStep || 0,
      enableDebug: options?.enableDebug || false
    });

    // Clean up temp file
    fs.unlinkSync(tempConfigPath);

    // Return execution log (same format as CLI log files)
    res.json({
      success: result.success,
      stepsExecuted: result.stepsExecuted,
      stepsSkipped: result.stepsSkipped,
      executionLog: result.executionLog,
      error: result.error
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// Optional: Stream results step-by-step using Server-Sent Events (SSE)
app.get('/api/execute-stream', (req, res) => {
  const configPath = req.query.configPath; // Or receive via POST body

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Executor enhancement needed: Add event emitter support
  // executor.on('step:start', (step) => res.write(`data: ${JSON.stringify({event: 'start', step})}\n\n`));
  // executor.on('step:complete', (result) => res.write(`data: ${JSON.stringify({event: 'complete', result})}\n\n`));
  // executor.on('step:error', (error) => res.write(`data: ${JSON.stringify({event: 'error', error})}\n\n`));

  // For now, fallback to batch execution
  // Future: Add EventEmitter to lib/executor.js for streaming
});
```

**Note:** Current `lib/executor.js` returns results after full sequence completion. For real-time streaming, we'd need to add event emitters to the executor. This is optional - the basic `/api/execute` endpoint works perfectly fine for most use cases.

**Key Advantage:** Any changes to `lib/executor.js`, `lib/validator.js`, `lib/conditions.js`, etc. automatically work in both CLI and Studio. No duplicate code!

**Studio Client-Side Usage (Simple API Call):**

```javascript
// In studio/js/test-runner.js (NEW MODULE)

async function runSequence(config, options = {}) {
  // Show loading indicator
  showLoadingIndicator();

  try {
    // Call the API endpoint (uses existing executor)
    const response = await fetch('/api/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config, options })
    });

    const result = await response.json();

    // Display results
    displayExecutionResults(result);

    return result;
  } catch (error) {
    displayError(error);
  } finally {
    hideLoadingIndicator();
  }
}

function displayExecutionResults(result) {
  const resultsPanel = document.getElementById('results-panel');
  resultsPanel.innerHTML = '';

  // Show summary
  const summary = `
    <div class="execution-summary">
      <span class="${result.success ? 'success' : 'error'}">
        ${result.success ? '✅' : '❌'}
        ${result.stepsExecuted} executed, ${result.stepsSkipped} skipped
      </span>
    </div>
  `;
  resultsPanel.innerHTML += summary;

  // Show each step from execution log (same format as CLI logs)
  result.executionLog.steps.forEach(step => {
    const stepHtml = `
      <div class="step-result ${step.status}">
        <h4>${step.name}</h4>
        <div class="step-details">
          <span>Status: ${step.status}</span>
          <span>Duration: ${step.duration}s</span>
          <pre>${JSON.stringify(step.response?.body, null, 2)}</pre>
        </div>
      </div>
    `;
    resultsPanel.innerHTML += stepHtml;
  });
}

// Button handler
document.getElementById('run-sequence-btn').addEventListener('click', async () => {
  const config = getCurrentConfig(); // Get config from editor
  await runSequence(config);
});
```

**That's it!** No need to reimplement:
- ❌ Variable substitution
- ❌ Condition evaluation
- ❌ Validation logic
- ❌ HTTP request handling
- ❌ Timeout management
- ❌ User input prompts
- ❌ Browser launching

Everything is handled by the existing `lib/executor.js` module.

**UI Controls:**

1. **Run Button:**
   - Executes entire sequence from start
   - Shows progress with status indicators
   - Displays results in collapsible panels

2. **Step-by-Step Mode:**
   - Execute one step at a time
   - Inspect response before continuing
   - Useful for debugging

3. **Results Panel:**
   - Shows request/response for each step
   - Highlights validation failures
   - Displays timing information
   - Collapsible/expandable sections

4. **User Input Prompts:**
   - Modal dialogs for `userPrompts`
   - Pre-filled with values from config
   - Save input for re-runs

**Security Considerations:**

- ⚠️ Only allow proxy when running localhost (not production)
- Rate limiting on proxy endpoint (prevent abuse)
- Timeout limits (max 120 seconds)
- URL validation (no file:// or internal network access)
- Optional: Whitelist allowed domains in config

**Example Security Implementation:**

```javascript
// Proxy middleware with security
app.post('/api/proxy', async (req, res) => {
  const { url, method } = req.body;

  // Security checks
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return res.status(400).json({ error: 'Invalid URL scheme' });
  }

  // Block internal network access
  const hostname = new URL(url).hostname;
  if (hostname === 'localhost' || hostname.startsWith('127.') || hostname.startsWith('192.168.')) {
    return res.status(403).json({ error: 'Access to internal networks not allowed' });
  }

  // Continue with proxy...
});
```

**User Workflow:**

1. Open Studio: `flowsphere studio`
2. Create or load config
3. Click **"Run Sequence"** button
4. Watch steps execute in real-time
5. View responses and validations
6. Fix any issues and re-run
7. Download final config when satisfied

**Advanced Features:**

- **Save Execution Results:** Export results as JSON for sharing/debugging
- **Compare Runs:** Side-by-side comparison of multiple runs
- **Request History:** Keep history of last N executions
- **Variable Inspector:** See all available variables at each step
- **Breakpoints:** Pause execution at specific steps

**Implementation Phases:**

**Phase 1 - API Endpoint (Backend):**
- Add `/api/execute` endpoint to `bin/flowsphere.js`
- Wire up existing `lib/executor.js` module
- Handle temp file creation/cleanup
- Return execution log in JSON format
- Test with curl/Postman

**Phase 2 - Studio Integration (Frontend):**
- Add "Run Sequence" button to Studio UI
- Create `studio/js/test-runner.js` module
- Call `/api/execute` API
- Display results in simple alert/console
- Test end-to-end

**Phase 3 - Results UI:**
- Build collapsible results panel
- Show request/response for each step
- Highlight validations and errors
- Display timing information
- Match CLI output format

**Phase 4 - Advanced Execution:**
- Add step-by-step execution mode (--start-step option)
- Real-time progress updates (SSE/WebSockets)
- Handle user input prompts (modals)
- Support browser launch callback
- Save/export results

**Phase 5 - Polish & Features:**
- Execution history browser
- Variable inspector panel
- Comparison view (multiple runs)
- Security hardening (if exposing publicly)
- Performance metrics

### Try it Out - Individual Node Testing

**Depends on:** Test Execution with Proxy (Bypass CORS)

Add the ability to test individual nodes in isolation without running the entire sequence, with intelligent mocking of dependencies and optional response schema storage for enhanced autocomplete.

**Benefits:**
- ✅ Test single nodes in isolation without running entire sequence
- ✅ Rapid iteration and debugging workflow
- ✅ Immediate validation feedback (success/failure)
- ✅ Inspect actual API responses before building the full flow
- ✅ Enhanced autocomplete with real response field names and types
- ✅ No sensitive data stored (schemas only, not full responses)
- ✅ Portable schemas shared with team via config file

**Core Features:**

**1. Try it Out Button**
- Each node in Studio gets a "Try it Out" button
- Executes the node using the proxy endpoint
- Applies full execution logic: variable substitution, conditions, validations
- Shows real-time success/failure based on validation results
- Displays the actual response in a modal or panel

**2. Intelligent Dependency Mocking**
When a node references previous responses (e.g., `{{ .responses.authenticate.token }}`), show a field-by-field modal:

```
This node needs values from previous responses:

{{ .responses.authenticate.token }}
[Enter mock value: _______________]

{{ .responses.getProfile.userId }}
[Enter mock value: _______________]

[Run] [Cancel]
```

**Why field-by-field instead of JSON editor:**
- Clear and simple - users see exactly what's needed
- No JSON syntax errors
- Guides users to provide minimal required data
- Better UX for non-technical users

**3. Store Response Schema (Optional)**

After successful execution, offer to save the response structure:

```
✅ Request successful!

Would you like to store the response schema for enhanced autocomplete?
- Only the structure is saved (field names and types)
- No sensitive data is stored
- Enables smart autocomplete for this node's response

[Store Schema] [Skip]
```

**Storage Format:**
Separate `responseSchemas` section in config file (keeps `nodes` array clean and readable):

```json
{
  "variables": { ... },
  "defaults": { ... },
  "nodes": [
    {
      "id": "authenticate",
      "name": "Login",
      "method": "POST",
      "url": "/auth/login"
    }
  ],
  "responseSchemas": {
    "authenticate": {
      "type": "object",
      "properties": {
        "token": { "type": "string" },
        "expiresAt": { "type": "number" },
        "user": {
          "type": "object",
          "properties": {
            "id": { "type": "number" },
            "email": { "type": "string" }
          }
        },
        "roles": {
          "type": "array",
          "items": { "type": "string" }
        },
        "active": { "type": "boolean" }
      }
    }
  }
}
```

**Why separate section:**
- Keeps `nodes` array human-readable and understandable
- Easy to delete entire section if needed
- Portable - shared with team, version controlled
- Compact - schemas are 10-50x smaller than full responses
- CLI can safely ignore this section (metadata only)

**4. Enhanced Autocomplete with Types**

When schemas are stored, autocomplete shows field names **with types**:

```
Type {{ to see suggestions:

{{ .responses.authenticate.
  ├─ token            (string)
  ├─ expiresAt        (number)
  ├─ user             (object) → expand
  ├─ roles            (array)  → expand
  └─ active           (boolean)
```

**Why show types:**
- Helps choose correct operators (equals vs greaterThan)
- Guides array access syntax (.[0] or .| length)
- Understands nested objects (drill deeper with dot notation)
- Better validation rule creation (know what comparisons are valid)

**Type-based suggestions:**
- `string` → suggests `equals`, `notEquals`, `exists`
- `number` → suggests `greaterThan`, `lessThan`, `greaterThanOrEqual`, `lessThanOrEqual`, `equals`
- `array` → suggests `.[0]`, `.[1]`, `.| length`
- `object` → suggests drilling deeper with `.fieldName`
- `boolean` → suggests `equals` with `true`/`false`

**Visual Treatment:**
Types could be color-coded or styled differently (grayed out, or green for string, blue for number, etc.)

**Proposed UI Flow:**

**Step 1 - User clicks "Try it Out" on a node:**
```
[Config Editor]
  Node 2: Get Profile
  [Edit] [Try it Out] [Delete]
```

**Step 2 - If node has dependencies, show mocking modal:**
```
┌─────────────────────────────────────────────┐
│ Mock Required Values                        │
├─────────────────────────────────────────────┤
│ This node references previous responses:   │
│                                             │
│ {{ .responses.authenticate.token }}        │
│ [mock-token-abc123___________________]     │
│                                             │
│ {{ .responses.authenticate.userId }}       │
│ [12345_______________________________]     │
│                                             │
│         [Run Request] [Cancel]              │
└─────────────────────────────────────────────┘
```

**Step 3 - Execute request and show results:**
```
┌─────────────────────────────────────────────┐
│ ✅ Request Successful - Get Profile         │
├─────────────────────────────────────────────┤
│ Status: 200 OK                              │
│ Duration: 234ms                             │
│                                             │
│ Validations:                                │
│ ✅ HTTP status code is 200                  │
│ ✅ Field .id exists                         │
│ ✅ Field .email exists                      │
│                                             │
│ Response Body:                              │
│ {                                           │
│   "id": 12345,                              │
│   "email": "user@example.com",              │
│   "name": "John Doe",                       │
│   "active": true                            │
│ }                                           │
│                                             │
│ [Store Response Schema] [Close]             │
└─────────────────────────────────────────────┘
```

**Step 4 - If validation fails:**
```
┌─────────────────────────────────────────────┐
│ ❌ Request Failed - Get Profile             │
├─────────────────────────────────────────────┤
│ Status: 401 Unauthorized                    │
│ Duration: 187ms                             │
│                                             │
│ Validations:                                │
│ ❌ Expected status 200, got 401             │
│                                             │
│ Response Body:                              │
│ {                                           │
│   "error": "Invalid token"                  │
│ }                                           │
│                                             │
│ [Close]                                     │
└─────────────────────────────────────────────┘
```

**Implementation Details:**

**1. Dependency Detection:**
```javascript
// In studio/js/try-it-out.js
function detectDependencies(node) {
  const dependencies = new Set();
  const config = getCurrentConfig();

  // Scan URL, headers, body for {{ .responses.nodeId.field }}
  const stringifiedNode = JSON.stringify(node);
  const regex = /\{\{\s*\.responses\.(\w+)\.([^\}]+)\s*\}\}/g;

  let match;
  while ((match = regex.exec(stringifiedNode)) !== null) {
    dependencies.add({
      nodeId: match[1],
      field: match[2],
      placeholder: match[0]
    });
  }

  return Array.from(dependencies);
}
```

**2. Mocking Modal:**
```javascript
function showMockingModal(dependencies, onSubmit) {
  const modal = createModal('Mock Required Values');

  modal.body.innerHTML = `
    <p>This node references previous responses:</p>
    ${dependencies.map(dep => `
      <div class="form-group">
        <label>${dep.placeholder}</label>
        <input type="text" class="form-control" data-node="${dep.nodeId}" data-field="${dep.field}">
      </div>
    `).join('')}
  `;

  modal.onConfirm = () => {
    const mockData = {};
    dependencies.forEach(dep => {
      if (!mockData[dep.nodeId]) mockData[dep.nodeId] = {};
      const value = modal.querySelector(`[data-node="${dep.nodeId}"][data-field="${dep.field}"]`).value;
      setNestedValue(mockData[dep.nodeId], dep.field, value);
    });
    onSubmit(mockData);
  };

  modal.show();
}
```

**3. Execute with Mocked Data:**
```javascript
async function tryItOut(node) {
  const dependencies = detectDependencies(node);

  if (dependencies.length > 0) {
    showMockingModal(dependencies, async (mockData) => {
      await executeNodeWithMocks(node, mockData);
    });
  } else {
    await executeNodeWithMocks(node, {});
  }
}

async function executeNodeWithMocks(node, mockResponses) {
  // Prepare config with mocked responses
  const tempConfig = {
    ...getCurrentConfig(),
    _mockResponses: mockResponses
  };

  // Call proxy endpoint
  const response = await fetch('/api/execute-node', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ node, config: tempConfig })
  });

  const result = await response.json();
  showResultsModal(result, node);
}
```

**4. Schema Extraction:**
```javascript
function extractSchema(responseBody) {
  function getType(value) {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }

  function buildSchema(obj) {
    const type = getType(obj);

    if (type === 'object') {
      const properties = {};
      for (const key in obj) {
        properties[key] = buildSchema(obj[key]);
      }
      return { type: 'object', properties };
    }

    if (type === 'array' && obj.length > 0) {
      return { type: 'array', items: buildSchema(obj[0]) };
    }

    return { type };
  }

  return buildSchema(responseBody);
}
```

**5. Store Schema:**
```javascript
function offerToStoreSchema(nodeId, responseBody) {
  const schema = extractSchema(responseBody);

  const modal = createModal('Store Response Schema');
  modal.body.innerHTML = `
    <p>✅ Request successful!</p>
    <p>Would you like to store the response schema for enhanced autocomplete?</p>
    <ul>
      <li>Only the structure is saved (field names and types)</li>
      <li>No sensitive data is stored</li>
      <li>Enables smart autocomplete for this node's response</li>
    </ul>
    <details>
      <summary>Preview schema</summary>
      <pre>${JSON.stringify(schema, null, 2)}</pre>
    </details>
  `;

  modal.onConfirm = () => {
    const config = getCurrentConfig();
    if (!config.responseSchemas) config.responseSchemas = {};
    config.responseSchemas[nodeId] = schema;
    updateConfig(config);
    showToast('Schema stored! Autocomplete enhanced for this node.');
  };

  modal.show();
}
```

**6. Enhanced Autocomplete with Types:**
```javascript
// Modify existing autocomplete.js
function getResponseSuggestions(nodeId) {
  const config = getCurrentConfig();
  const schema = config.responseSchemas?.[nodeId];

  if (!schema) {
    // Fallback to basic suggestions
    return [{ label: `${nodeId} (no schema available)`, value: `.responses.${nodeId}.` }];
  }

  // Generate suggestions from schema with types
  return buildSuggestionsFromSchema(schema, `.responses.${nodeId}`);
}

function buildSuggestionsFromSchema(schema, prefix = '') {
  const suggestions = [];

  if (schema.type === 'object' && schema.properties) {
    for (const [key, value] of Object.entries(schema.properties)) {
      suggestions.push({
        label: `${key}`,
        value: `${prefix}.${key}`,
        type: value.type,
        description: getTypeDescription(value.type)
      });

      // Recursively add nested properties
      if (value.type === 'object') {
        suggestions.push(...buildSuggestionsFromSchema(value, `${prefix}.${key}`));
      }
    }
  }

  return suggestions;
}

function getTypeDescription(type) {
  const descriptions = {
    'string': 'Use: equals, notEquals, exists',
    'number': 'Use: greaterThan, lessThan, equals',
    'boolean': 'Use: equals with true/false',
    'array': 'Use: .[0], .| length',
    'object': 'Drill deeper with dot notation'
  };
  return descriptions[type] || '';
}

// Render suggestion with type
function renderSuggestion(suggestion) {
  return `
    <div class="autocomplete-item">
      <span class="field-name">${suggestion.label}</span>
      <span class="field-type type-${suggestion.type}">(${suggestion.type})</span>
      <span class="field-hint">${suggestion.description}</span>
    </div>
  `;
}
```

**UI Enhancements:**

**1. Add "Try it Out" button to each node:**
```html
<!-- In studio/index.html node rendering -->
<div class="node-card">
  <h5>Node: Get Profile</h5>
  <div class="node-actions">
    <button class="btn btn-sm btn-primary" onclick="editNode(nodeId)">Edit</button>
    <button class="btn btn-sm btn-success" onclick="tryItOut(nodeId)">🧪 Try it Out</button>
    <button class="btn btn-sm btn-danger" onclick="deleteNode(nodeId)">Delete</button>
  </div>
</div>
```

**2. Add CSS for type styling:**
```css
/* In studio/css/styles.css */
.autocomplete-item {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 6px 12px;
}

.field-name {
  font-weight: 500;
  flex: 1;
}

.field-type {
  font-size: 0.85em;
  opacity: 0.7;
  font-family: monospace;
}

.type-string { color: #28a745; }
.type-number { color: #007bff; }
.type-boolean { color: #ffc107; }
.type-array { color: #6f42c1; }
.type-object { color: #17a2b8; }

.field-hint {
  font-size: 0.75em;
  opacity: 0.6;
  font-style: italic;
}
```

**Backend Support (Express Endpoint):**

```javascript
// In bin/flowsphere.js - Add new endpoint for single node execution
app.post('/api/execute-node', async (req, res) => {
  const { node, config } = req.body;

  try {
    // Create temporary responses object with mocked data
    const responses = config._mockResponses || {};

    // Execute single node using existing executor logic
    const { executeStep } = require('../lib/executor');
    const result = await executeStep(node, config, responses);

    res.json({
      success: true,
      response: result.response,
      validations: result.validations,
      duration: result.duration,
      statusCode: result.statusCode
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      validations: error.validations || []
    });
  }
});
```

**Implementation Phases:**

**Phase 1 - Basic Try it Out:**
- Add "Try it Out" button to each node in Studio
- Implement dependency detection (scan for {{ .responses.* }})
- Create mocking modal with field-by-field inputs
- Execute node via `/api/execute-node` endpoint
- Display success/failure results with validation output

**Phase 2 - Response Schema Storage:**
- Implement schema extraction from response bodies
- Add "Store Schema" prompt after successful execution
- Save schemas to `responseSchemas` section in config
- Add UI to view/delete stored schemas
- Studio option to "Clear all stored schemas"

**Phase 3 - Enhanced Autocomplete:**
- Modify autocomplete to read from `responseSchemas`
- Generate suggestions with types from stored schemas
- Add type styling (colors, descriptions)
- Show operator suggestions based on type
- Support nested object navigation

**Phase 4 - Polish & Advanced Features:**
- Preview stored schema before saving
- Edit/update existing schemas manually
- Diff view when response schema changes
- Import schemas from OpenAPI/Swagger definitions
- Export schemas separately for documentation

**CLI Compatibility:**
- CLI **ignores** the `responseSchemas` section (metadata only)
- Schemas are purely for Studio enhancement
- No breaking changes to existing configs
- Can revisit later if CLI use case emerges (e.g., enhanced error messages)

### Execution Log Visualizer

A visual interface for exploring, analyzing, and comparing execution logs with rich filtering, search, and export capabilities.

**Benefits:**
- ✅ Visual understanding of execution flow and timing
- ✅ Quick identification of failures and bottlenecks
- ✅ Compare multiple executions to spot differences
- ✅ Filter and search through large execution logs
- ✅ Performance analysis with metrics and insights
- ✅ Export visualizations for documentation and sharing
- ✅ Works standalone (CLI) and integrated (Studio)
- ✅ Plug-and-play Studio module (optional feature)

**Three Integration Points:**

**1. Standalone CLI Command:**
```bash
# Visualize a specific log file
flowsphere visualize logs/execution_log_20250128_143022.json

# Output:
# 📊 Log Visualizer starting...
# 🌐 Server: http://localhost:54321
# Opening browser...
```

Launches Express server with visualization UI and automatically opens browser.

**2. Studio Plug-and-Play Module:**
- Optional feature toggle in Studio settings
- When enabled, adds "Log Visualizer" tab to Studio interface
- Load and visualize any log file from `logs/` directory
- Browse historical logs with file picker

**UI Structure:**
```
[Config Editor] [Execution Results] [Log Visualizer]
                                     ↑ New tab when enabled
```

**3. Post-Execution Prompt:**
After running a sequence (CLI or Studio), offer immediate visualization:

**CLI:**
```
✅ Sequence completed successfully!
   5 steps executed, 1 skipped
   Total duration: 2.4s
📝 Log saved to: logs/execution_log_20250128_143022.json

Would you like to visualize the execution log? (y/n)
> y

📊 Launching visualizer...
🌐 Server: http://localhost:54321
```

**Studio:**
```
┌────────────────────────────────────────┐
│ ✅ Sequence Completed Successfully     │
├────────────────────────────────────────┤
│ 5 steps executed, 1 skipped            │
│ Total duration: 2.4s                   │
│                                        │
│ Log saved to:                          │
│ logs/execution_log_20250128_143022.json│
│                                        │
│ [Visualize Log] [Close]                │
└────────────────────────────────────────┘
```

**Core Visualization Features:**

**1. Summary Panel:**
```
┌─────────────────────────────────────────────────────────┐
│ Execution Summary                                       │
├─────────────────────────────────────────────────────────┤
│ Status: ✅ Success                                      │
│ Steps: 5 executed, 1 skipped, 0 failed                 │
│ Duration: 2.4s (2400ms)                                 │
│ Started: 2025-01-28 14:30:22                           │
│ Config: examples/config-simple.json                     │
├─────────────────────────────────────────────────────────┤
│ Performance:                                            │
│ - Fastest: Step 1 (120ms)                              │
│ - Slowest: Step 3 (1200ms)                             │
│ - Average: 480ms per step                               │
└─────────────────────────────────────────────────────────┘
```

**2. Timeline/Waterfall View:**
Visual representation of execution flow with duration bars:

```
┌─────────────────────────────────────────────────────────┐
│ Timeline                                   Total: 2.4s  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 0s    0.5s   1.0s   1.5s   2.0s   2.5s                 │
│ ├─────┼──────┼──────┼──────┼──────┼                    │
│ █████ Step 1: Login (120ms)                            │
│      ████ Step 2: Get Profile (200ms)                   │
│          ⊘ Step 3: Create Post (skipped)               │
│             █████████████ Step 4: Fetch Posts (1200ms) │
│                          ████████ Step 5: Logout (300ms)│
└─────────────────────────────────────────────────────────┘
```

**3. Step Cards (Expandable):**
```
┌─────────────────────────────────────────────────────────┐
│ ✅ Step 1: Login                             120ms  [▼] │
├─────────────────────────────────────────────────────────┤
│ Request:                                                │
│   POST https://api.example.com/auth/login               │
│   Headers: { "Content-Type": "application/json" }      │
│   Body: { "username": "user", "password": "***" }      │
│                                                         │
│ Response:                                               │
│   Status: 200 OK                                        │
│   Body: {                                               │
│     "token": "eyJhbGc...",                              │
│     "userId": 12345                                     │
│   }                                                     │
│                                                         │
│ Validations:                                            │
│   ✅ HTTP status code is 200                            │
│   ✅ Field .token exists                                │
│   ✅ Field .userId exists                               │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ ⊘ Step 3: Create Post                      skipped [▼] │
├─────────────────────────────────────────────────────────┤
│ Skip Reason:                                            │
│   Condition not met: .responses.getProfile.isAdmin     │
│   Expected: true                                        │
│   Actual: false                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ ❌ Step 5: Logout                            300ms  [▼] │
├─────────────────────────────────────────────────────────┤
│ Request:                                                │
│   POST https://api.example.com/auth/logout              │
│                                                         │
│ Response:                                               │
│   Status: 401 Unauthorized                              │
│   Body: { "error": "Invalid token" }                   │
│                                                         │
│ Validations:                                            │
│   ❌ Expected status 200, got 401                       │
└─────────────────────────────────────────────────────────┘
```

**4. Filter & Search:**
```
┌─────────────────────────────────────────────────────────┐
│ [🔍 Search steps...]                                    │
│                                                         │
│ Status: [✅ Success] [❌ Failed] [⊘ Skipped] [All]     │
│ Duration: [< 100ms] [100-500ms] [> 500ms] [All]       │
│ Method: [GET] [POST] [PUT] [DELETE] [All]              │
└─────────────────────────────────────────────────────────┘
```

**5. Performance Metrics:**
```
┌─────────────────────────────────────────────────────────┐
│ Performance Insights                                    │
├─────────────────────────────────────────────────────────┤
│ Bottlenecks:                                            │
│ • Step 4 took 50% of total execution time (1200ms)     │
│ • Consider adding timeout or optimization               │
│                                                         │
│ Step Duration Distribution:                             │
│ [████████████████        ] 0-500ms:   3 steps          │
│ [████                    ] 500-1000ms: 1 step          │
│ [████                    ] 1000ms+:    1 step          │
│                                                         │
│ Success Rate: 80% (4/5 steps)                          │
└─────────────────────────────────────────────────────────┘
```

**Advanced Features:**

**1. Compare Logs (Side-by-Side Diff View):**

Load two log files and visualize differences:

```
┌─────────────────────────────────────────────────────────┐
│ Compare Executions                                      │
├─────────────────────────────────────────────────────────┤
│ Log A: execution_log_20250128_143022.json              │
│ Log B: execution_log_20250128_144500.json              │
│                                                         │
│ [Load Log A] [Load Log B] [Compare]                    │
└─────────────────────────────────────────────────────────┘

┌──────────────────────────────┬──────────────────────────────┐
│ Log A (14:30:22)            │ Log B (14:45:00)             │
├──────────────────────────────┼──────────────────────────────┤
│ Duration: 2.4s              │ Duration: 3.1s ⚠️ +0.7s      │
│ Success: 4/5 steps          │ Success: 5/5 steps ✅         │
│                             │                              │
│ ✅ Step 1: Login (120ms)    │ ✅ Step 1: Login (150ms) +30 │
│ ✅ Step 2: Profile (200ms)  │ ✅ Step 2: Profile (180ms)-20│
│ ⊘ Step 3: Create (skipped)  │ ✅ Step 3: Create (400ms) ℹ️  │
│ ✅ Step 4: Fetch (1200ms)   │ ✅ Step 4: Fetch (1300ms)+100│
│ ❌ Step 5: Logout (300ms)   │ ✅ Step 5: Logout (280ms) ✅  │
└──────────────────────────────┴──────────────────────────────┘

Differences Detected:
• Step 3 was skipped in Log A but executed in Log B
  Reason: Condition .responses.getProfile.isAdmin changed (false → true)
• Step 5 failed in Log A (401) but succeeded in Log B (200)
• Total execution time increased by 700ms (+29%)
```

**Use cases:**
- Compare before/after changes to API
- Identify performance regressions
- Debug conditional execution differences
- Verify fixes resolved issues

**2. Export Options:**

**HTML Export:**
```bash
# Self-contained HTML file with inline CSS/JS
export-log-visualization.html (can be opened in any browser)
```

**PDF Export:**
```bash
# Static PDF report with all visualizations
execution-report-20250128.pdf
```

**Share Link:**
```bash
# Generate shareable URL (if hosted)
https://flowsphere.app/view/abc123xyz
(expires in 7 days, password protected)
```

**Export UI:**
```
┌─────────────────────────────────────────────────────────┐
│ Export Visualization                                    │
├─────────────────────────────────────────────────────────┤
│ Format:                                                 │
│ ( ) HTML - Self-contained, opens in browser            │
│ ( ) PDF  - Static report with screenshots              │
│ ( ) JSON - Raw log data (original format)              │
│                                                         │
│ Options:                                                │
│ [x] Include request/response bodies                     │
│ [x] Include performance metrics                         │
│ [x] Include timeline visualization                      │
│ [ ] Redact sensitive data (tokens, passwords)          │
│                                                         │
│ [Export] [Cancel]                                       │
└─────────────────────────────────────────────────────────┘
```

**3. Filter & Search:**

**Search capabilities:**
- Search by step name (fuzzy matching)
- Search by URL pattern
- Search in request/response bodies
- Search by validation message

**Filter options:**
- Status: Success ✅ / Failed ❌ / Skipped ⊘
- Duration: < 100ms / 100-500ms / 500-1000ms / 1000ms+
- HTTP Method: GET / POST / PUT / DELETE / PATCH
- Status Code: 2xx / 4xx / 5xx
- Custom date/time range

**UI:**
```
┌─────────────────────────────────────────────────────────┐
│ [🔍 Search: "auth"_______________] [Clear]             │
├─────────────────────────────────────────────────────────┤
│ Filters Active: 2                                       │
│ • Status: ✅ Success, ❌ Failed                          │
│ • Duration: > 500ms                                     │
│ [Clear All Filters]                                     │
├─────────────────────────────────────────────────────────┤
│ Showing 2 of 5 steps                                    │
│                                                         │
│ ✅ Step 1: Login (120ms)                                │
│ ❌ Step 5: Logout (300ms)                               │
└─────────────────────────────────────────────────────────┘
```

**4. Performance Metrics:**

**Bottleneck Detection:**
- Identify steps taking > 30% of total time
- Flag steps with timeouts
- Highlight duplicate/redundant requests

**Duration Analysis:**
- Min/max/average/median step duration
- Percentile breakdown (p50, p90, p95, p99)
- Duration distribution histogram

**Success Rate Tracking:**
- Overall success rate percentage
- Per-step success rate (if multiple logs)
- Validation pass/fail breakdown

**Trend Analysis (if comparing multiple logs):**
- Performance trend over time
- Failure rate trends
- Step duration changes

**UI:**
```
┌─────────────────────────────────────────────────────────┐
│ Performance Metrics                                     │
├─────────────────────────────────────────────────────────┤
│ Duration Statistics:                                    │
│ • Min:     120ms (Step 1)                              │
│ • Max:    1200ms (Step 4) ⚠️ BOTTLENECK                 │
│ • Average: 480ms                                        │
│ • Median:  300ms                                        │
│ • P95:     1100ms                                       │
│                                                         │
│ Duration Distribution:                                  │
│ 0-200ms   ██████████████ (40%)                         │
│ 200-500ms ███████       (20%)                          │
│ 500-1s    ███████       (20%)                          │
│ 1s+       ███████       (20%)                          │
│                                                         │
│ Recommendations:                                        │
│ • Step 4 (Fetch Posts) is slow - consider:            │
│   - Adding pagination to reduce response size          │
│   - Increasing timeout threshold                       │
│   - Checking server-side performance                   │
└─────────────────────────────────────────────────────────┘
```

**Visual Design: Simple & Fast (Bootstrap)**

**Technology Stack:**
- Bootstrap 5 for UI components
- Vanilla JavaScript (no heavy frameworks)
- Responsive design (works on mobile/tablet)
- Minimal dependencies for fast loading

**Key UI Components:**
- Bootstrap cards for step details
- Bootstrap collapse for expandable sections
- Bootstrap badges for status indicators
- Bootstrap progress bars for timeline
- Bootstrap tables for structured data
- Bootstrap alerts for warnings/errors

**Color Scheme:**
- Success (✅): Green (#28a745)
- Failed (❌): Red (#dc3545)
- Skipped (⊘): Gray (#6c757d)
- Warning (⚠️): Yellow (#ffc107)
- Info (ℹ️): Blue (#17a2b8)

**Implementation Details:**

**1. Visualizer HTML Structure:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <title>FlowSphere Log Visualizer</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <style>
    /* Custom styles for timeline, step cards, etc. */
  </style>
</head>
<body>
  <nav class="navbar navbar-dark bg-dark">
    <div class="container-fluid">
      <span class="navbar-brand">📊 FlowSphere Log Visualizer</span>
      <div>
        <button class="btn btn-outline-light btn-sm" id="load-log">Load Log</button>
        <button class="btn btn-outline-light btn-sm" id="compare-logs">Compare</button>
        <button class="btn btn-outline-light btn-sm" id="export">Export</button>
      </div>
    </div>
  </nav>

  <div class="container-fluid mt-3">
    <!-- Summary Panel -->
    <div class="card mb-3" id="summary-panel">
      <div class="card-header">Execution Summary</div>
      <div class="card-body" id="summary-content"></div>
    </div>

    <!-- Timeline Visualization -->
    <div class="card mb-3" id="timeline-panel">
      <div class="card-header">Timeline</div>
      <div class="card-body" id="timeline-content"></div>
    </div>

    <!-- Filter & Search -->
    <div class="card mb-3">
      <div class="card-header">Filters</div>
      <div class="card-body">
        <input type="text" class="form-control mb-2" id="search" placeholder="🔍 Search steps...">
        <div class="btn-group" role="group">
          <input type="checkbox" class="btn-check" id="filter-success" checked>
          <label class="btn btn-outline-success" for="filter-success">✅ Success</label>
          <input type="checkbox" class="btn-check" id="filter-failed" checked>
          <label class="btn btn-outline-danger" for="filter-failed">❌ Failed</label>
          <input type="checkbox" class="btn-check" id="filter-skipped" checked>
          <label class="btn btn-outline-secondary" for="filter-skipped">⊘ Skipped</label>
        </div>
      </div>
    </div>

    <!-- Step Cards -->
    <div id="steps-container"></div>

    <!-- Performance Metrics -->
    <div class="card mb-3" id="metrics-panel">
      <div class="card-header">Performance Metrics</div>
      <div class="card-body" id="metrics-content"></div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
  <script src="visualizer.js"></script>
</body>
</html>
```

**2. Load and Parse Log:**
```javascript
// In visualizer.js
let currentLog = null;

async function loadLog(logPath) {
  const response = await fetch(`/api/load-log?path=${encodeURIComponent(logPath)}`);
  currentLog = await response.json();
  renderVisualization(currentLog);
}

function renderVisualization(log) {
  renderSummary(log);
  renderTimeline(log);
  renderSteps(log);
  renderMetrics(log);
}

function renderSummary(log) {
  const totalDuration = log.steps.reduce((sum, step) => sum + (step.duration || 0), 0);
  const executed = log.steps.filter(s => s.status === 'executed').length;
  const skipped = log.steps.filter(s => s.status === 'skipped').length;
  const failed = log.steps.filter(s => s.status === 'failed').length;

  document.getElementById('summary-content').innerHTML = `
    <div class="row">
      <div class="col-md-3">
        <h6>Status</h6>
        <span class="badge bg-${failed > 0 ? 'danger' : 'success'} fs-5">
          ${failed > 0 ? '❌ Failed' : '✅ Success'}
        </span>
      </div>
      <div class="col-md-3">
        <h6>Steps</h6>
        <p>${executed} executed, ${skipped} skipped, ${failed} failed</p>
      </div>
      <div class="col-md-3">
        <h6>Duration</h6>
        <p>${(totalDuration / 1000).toFixed(2)}s</p>
      </div>
      <div class="col-md-3">
        <h6>Started</h6>
        <p>${new Date(log.timestamp).toLocaleString()}</p>
      </div>
    </div>
  `;
}

function renderTimeline(log) {
  const totalDuration = log.steps.reduce((sum, step) => sum + (step.duration || 0), 0);

  let html = '<div class="timeline">';
  let currentTime = 0;

  log.steps.forEach(step => {
    const duration = step.duration || 0;
    const widthPercent = (duration / totalDuration) * 100;
    const leftPercent = (currentTime / totalDuration) * 100;

    const statusClass = step.status === 'executed' ? 'success' :
                        step.status === 'failed' ? 'danger' : 'secondary';

    html += `
      <div class="timeline-step bg-${statusClass}"
           style="left: ${leftPercent}%; width: ${widthPercent}%;"
           title="${step.name} (${duration}ms)">
      </div>
    `;

    currentTime += duration;
  });

  html += '</div>';
  document.getElementById('timeline-content').innerHTML = html;
}

function renderSteps(log) {
  const container = document.getElementById('steps-container');
  container.innerHTML = '';

  log.steps.forEach((step, index) => {
    const statusIcon = step.status === 'executed' ? '✅' :
                       step.status === 'failed' ? '❌' : '⊘';
    const statusClass = step.status === 'executed' ? 'success' :
                        step.status === 'failed' ? 'danger' : 'secondary';

    const card = document.createElement('div');
    card.className = 'card mb-2';
    card.innerHTML = `
      <div class="card-header d-flex justify-content-between align-items-center"
           data-bs-toggle="collapse" data-bs-target="#step-${index}"
           style="cursor: pointer;">
        <span>${statusIcon} Step ${index + 1}: ${step.name}</span>
        <div>
          <span class="badge bg-${statusClass}">${step.duration || 0}ms</span>
          <span class="ms-2">▼</span>
        </div>
      </div>
      <div id="step-${index}" class="collapse">
        <div class="card-body">
          ${renderStepDetails(step)}
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function renderStepDetails(step) {
  if (step.status === 'skipped') {
    return `
      <h6>Skip Reason:</h6>
      <p>${step.skipReason || 'Condition not met'}</p>
    `;
  }

  return `
    <h6>Request:</h6>
    <pre>${step.request.method} ${step.request.url}
Headers: ${JSON.stringify(step.request.headers, null, 2)}
${step.request.body ? 'Body: ' + JSON.stringify(step.request.body, null, 2) : ''}</pre>

    <h6>Response:</h6>
    <pre>Status: ${step.response.statusCode}
Body: ${JSON.stringify(step.response.body, null, 2)}</pre>

    ${step.validations ? `
      <h6>Validations:</h6>
      <ul>
        ${step.validations.map(v => `
          <li class="${v.passed ? 'text-success' : 'text-danger'}">
            ${v.passed ? '✅' : '❌'} ${v.message}
          </li>
        `).join('')}
      </ul>
    ` : ''}
  `;
}

function renderMetrics(log) {
  const durations = log.steps
    .filter(s => s.duration)
    .map(s => s.duration);

  const min = Math.min(...durations);
  const max = Math.max(...durations);
  const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
  const sorted = [...durations].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  const slowestStep = log.steps.find(s => s.duration === max);

  document.getElementById('metrics-content').innerHTML = `
    <h6>Duration Statistics:</h6>
    <ul>
      <li>Min: ${min}ms</li>
      <li>Max: ${max}ms (${slowestStep?.name}) ${max > avg * 2 ? '⚠️ BOTTLENECK' : ''}</li>
      <li>Average: ${avg.toFixed(0)}ms</li>
      <li>Median: ${median}ms</li>
    </ul>

    ${max > avg * 2 ? `
      <div class="alert alert-warning">
        <strong>⚠️ Bottleneck Detected:</strong><br>
        ${slowestStep.name} took ${((max / durations.reduce((a,b) => a+b, 0)) * 100).toFixed(1)}% of total execution time.
        Consider optimizing this step.
      </div>
    ` : ''}
  `;
}

// Filter functionality
document.getElementById('search').addEventListener('input', applyFilters);
document.getElementById('filter-success').addEventListener('change', applyFilters);
document.getElementById('filter-failed').addEventListener('change', applyFilters);
document.getElementById('filter-skipped').addEventListener('change', applyFilters);

function applyFilters() {
  const searchTerm = document.getElementById('search').value.toLowerCase();
  const showSuccess = document.getElementById('filter-success').checked;
  const showFailed = document.getElementById('filter-failed').checked;
  const showSkipped = document.getElementById('filter-skipped').checked;

  const stepCards = document.querySelectorAll('#steps-container .card');

  stepCards.forEach((card, index) => {
    const step = currentLog.steps[index];
    const matchesSearch = step.name.toLowerCase().includes(searchTerm) ||
                          step.request?.url.toLowerCase().includes(searchTerm);

    const matchesStatus = (step.status === 'executed' && showSuccess) ||
                          (step.status === 'failed' && showFailed) ||
                          (step.status === 'skipped' && showSkipped);

    card.style.display = (matchesSearch && matchesStatus) ? 'block' : 'none';
  });
}
```

**3. Backend Support (Express Endpoints):**

```javascript
// In bin/flowsphere.js - Add visualizer endpoints

// Serve visualizer UI
app.get('/visualize', (req, res) => {
  res.sendFile(path.join(__dirname, '../visualizer/index.html'));
});

app.use('/visualizer', express.static(path.join(__dirname, '../visualizer')));

// Load log file
app.get('/api/load-log', (req, res) => {
  const logPath = req.query.path;

  try {
    const logContent = fs.readFileSync(logPath, 'utf-8');
    const log = JSON.parse(logContent);
    res.json(log);
  } catch (error) {
    res.status(404).json({ error: 'Log file not found' });
  }
});

// List available logs
app.get('/api/list-logs', (req, res) => {
  const logsDir = path.join(process.cwd(), 'logs');

  if (!fs.existsSync(logsDir)) {
    return res.json([]);
  }

  const files = fs.readdirSync(logsDir)
    .filter(f => f.endsWith('.json'))
    .map(f => ({
      name: f,
      path: path.join(logsDir, f),
      size: fs.statSync(path.join(logsDir, f)).size,
      modified: fs.statSync(path.join(logsDir, f)).mtime
    }))
    .sort((a, b) => b.modified - a.modified);

  res.json(files);
});

// Export visualization as HTML
app.post('/api/export-html', (req, res) => {
  const { log } = req.body;

  // Generate self-contained HTML with inline CSS/JS
  const html = generateVisualizationHTML(log);

  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Content-Disposition', `attachment; filename="log-visualization-${Date.now()}.html"`);
  res.send(html);
});
```

**4. CLI Command:**

```javascript
// In bin/flowsphere.js - Add visualize command

if (args[0] === 'visualize') {
  const logPath = args[1];

  if (!logPath) {
    console.error('❌ Please provide a log file path');
    console.log('Usage: flowsphere visualize <log-file>');
    process.exit(1);
  }

  if (!fs.existsSync(logPath)) {
    console.error(`❌ Log file not found: ${logPath}`);
    process.exit(1);
  }

  console.log('📊 Log Visualizer starting...');

  const app = express();
  app.use(express.static(path.join(__dirname, '../visualizer')));

  // Serve the specific log file
  app.get('/api/current-log', (req, res) => {
    const logContent = fs.readFileSync(logPath, 'utf-8');
    res.json(JSON.parse(logContent));
  });

  const server = app.listen(0, () => {
    const port = server.address().port;
    const url = `http://localhost:${port}`;
    console.log(`🌐 Server: ${url}`);
    console.log('Opening browser...');
    open(url);
  });
}
```

**5. Post-Execution Prompt (CLI):**

```javascript
// In lib/logger.js - Modify promptSaveLog

async function promptSaveLog(executionLog) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('Save execution log? (y/n): ', (answer) => {
      if (answer.toLowerCase() === 'y') {
        const logPath = saveLog(executionLog);
        console.log(`📝 Log saved to: ${logPath}`);

        rl.question('\nWould you like to visualize the execution log? (y/n): ', (visualizeAnswer) => {
          rl.close();

          if (visualizeAnswer.toLowerCase() === 'y') {
            launchVisualizer(logPath);
          }

          resolve(logPath);
        });
      } else {
        rl.close();
        resolve(null);
      }
    });
  });
}

function launchVisualizer(logPath) {
  console.log('\n📊 Launching visualizer...');

  // Spawn child process to avoid blocking
  const { spawn } = require('child_process');
  const visualizer = spawn('node', [
    path.join(__dirname, '../bin/flowsphere.js'),
    'visualize',
    logPath
  ], {
    detached: true,
    stdio: 'ignore'
  });

  visualizer.unref();
}
```

**6. Studio Integration (Plug-and-Play Module):**

**Feature Toggle:**
```javascript
// In studio/js/core/settings.js
const features = {
  logVisualizer: {
    enabled: localStorage.getItem('feature_logVisualizer') === 'true',
    name: 'Execution Log Visualizer',
    description: 'Visualize and analyze execution logs with rich filtering and comparison'
  }
};

function initializeFeatures() {
  if (features.logVisualizer.enabled) {
    loadLogVisualizerModule();
  }
}

function loadLogVisualizerModule() {
  // Add tab to Studio interface
  addTab('Log Visualizer', 'visualizer-tab');

  // Load visualizer UI
  loadVisualizerUI();
}
```

**Studio Tab Structure:**
```html
<!-- In studio/index.html -->
<ul class="nav nav-tabs" id="studio-tabs">
  <li class="nav-item">
    <a class="nav-link active" data-bs-toggle="tab" href="#config-editor">Config Editor</a>
  </li>
  <li class="nav-item">
    <a class="nav-link" data-bs-toggle="tab" href="#execution-results">Execution Results</a>
  </li>
  <li class="nav-item" id="visualizer-tab" style="display: none;">
    <a class="nav-link" data-bs-toggle="tab" href="#log-visualizer">Log Visualizer</a>
  </li>
</ul>

<div class="tab-content">
  <div class="tab-pane fade show active" id="config-editor">
    <!-- Config editor content -->
  </div>
  <div class="tab-pane fade" id="execution-results">
    <!-- Execution results -->
  </div>
  <div class="tab-pane fade" id="log-visualizer">
    <div class="card">
      <div class="card-header">
        <h5>Execution Log Visualizer</h5>
        <button class="btn btn-sm btn-primary" onclick="loadLogFile()">Load Log</button>
        <button class="btn btn-sm btn-secondary" onclick="compareLogFiles()">Compare</button>
      </div>
      <div class="card-body" id="visualizer-container">
        <!-- Visualizer content loaded here -->
      </div>
    </div>
  </div>
</div>
```

**Post-Execution Modal (Studio):**
```javascript
// In studio/js/test-runner.js
async function runSequence(config, options = {}) {
  const response = await fetch('/api/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config, options, saveLog: true })
  });

  const result = await response.json();
  displayExecutionResults(result);

  if (result.logPath && features.logVisualizer.enabled) {
    showVisualizeLogPrompt(result.logPath);
  }
}

function showVisualizeLogPrompt(logPath) {
  const modal = createModal('Execution Complete');
  modal.body.innerHTML = `
    <div class="alert alert-success">
      <h5>✅ Sequence Completed Successfully</h5>
      <p>${result.stepsExecuted} steps executed, ${result.stepsSkipped} skipped</p>
      <p>Total duration: ${result.totalDuration}s</p>
    </div>
    <p>Log saved to: <code>${logPath}</code></p>
    <p>Would you like to visualize the execution log?</p>
  `;

  modal.addButton('Visualize Log', 'primary', () => {
    loadLogInVisualizer(logPath);
    switchToTab('log-visualizer');
    modal.hide();
  });

  modal.addButton('Close', 'secondary', () => modal.hide());
  modal.show();
}
```

**Implementation Phases:**

**Phase 1 - Basic Visualizer:**
- Create standalone visualizer HTML/CSS/JS (Bootstrap-based)
- Implement summary panel with basic stats
- Render step cards with expand/collapse
- Add filter by status (success/failed/skipped)
- CLI command: `flowsphere visualize <log-file>`

**Phase 2 - Timeline & Metrics:**
- Implement timeline/waterfall view with duration bars
- Add performance metrics panel (min/max/avg/median)
- Bottleneck detection and recommendations
- Duration distribution visualization

**Phase 3 - Search & Advanced Filtering:**
- Full-text search across step names and URLs
- Advanced filters (duration ranges, HTTP methods, status codes)
- Filter combination logic (AND/OR)
- Show filtered count and clear filters button

**Phase 4 - Compare Logs:**
- Side-by-side diff view for two log files
- Highlight differences (duration changes, status changes, new/removed steps)
- Condition evaluation comparison
- Performance regression detection

**Phase 5 - Export Functionality:**
- Export as self-contained HTML file
- Export as PDF report (using html2pdf or similar)
- Optional: Share link generation (if hosted service exists)
- Redact sensitive data option (tokens, passwords)

**Phase 6 - Studio Integration:**
- Add as plug-and-play module (feature toggle)
- Create "Log Visualizer" tab in Studio
- File browser for logs/ directory
- Post-execution prompt to visualize
- Load historical logs from Studio UI

**Phase 7 - Polish & Advanced Features:**
- Keyboard shortcuts (arrow keys to navigate steps, Space to expand/collapse)
- Print-friendly CSS for HTML export
- Dark mode support
- Responsive design for mobile/tablet
- Copy step details to clipboard
- Bookmark/favorite logs

**File Structure:**
```
visualizer/
├── index.html           # Main visualizer page
├── css/
│   └── visualizer.css   # Custom styles (minimal, mostly Bootstrap)
├── js/
│   ├── visualizer.js    # Core visualization logic
│   ├── compare.js       # Log comparison features
│   ├── export.js        # Export functionality
│   └── filters.js       # Search and filter logic
└── templates/
    └── export.html      # Template for HTML export
```

**Dependencies:**
- Bootstrap 5 (CSS framework)
- Bootstrap Icons (optional, for better icons)
- No heavy JavaScript frameworks (vanilla JS only)
- Optional: Chart.js for advanced metrics visualizations (Phase 7)

### Swagger/OpenAPI Import

Add Swagger/OpenAPI file import capability to FlowSphere Studio for automatic config generation from API specifications.

**Benefits:**
- Import API specifications directly in the browser
- Automatically generate nodes from endpoints
- Extract request/response schemas and validation rules
- Reduce manual config creation time
- Keep configs in sync with API documentation

**Proposed UI:**
```
Import Config ▼
├── From Template (existing)
├── From Postman Collection (existing)
└── From Swagger/OpenAPI (NEW)
```

**Import Dialog Features:**
- File upload for Swagger/OpenAPI JSON/YAML files
- Preview discovered endpoints before import
- Checkbox selection for which endpoints to include
- Auto-generate node IDs from operation IDs or paths
- Extract base URL from server definitions
- Detect authentication schemes (Bearer, API Key, OAuth)
- Generate validations from response schemas

**User Workflow:**
1. Click "Import Config" → "From Swagger/OpenAPI"
2. Upload swagger.json or openapi.yaml file
3. Preview list of discovered endpoints with checkboxes
4. Select which endpoints to import
5. Click "Import Selected" to add nodes to config
6. Edit/customize generated nodes as needed

**Supported Formats:**
- Swagger 2.0 (JSON/YAML)
- OpenAPI 3.0+ (JSON/YAML)

### Enhanced Postman Import

Improve the existing Postman import feature with multi-environment support and batch collection processing.

**Current Limitations:**
- Single collection file only
- No environment file support
- Manual variable resolution required

**Proposed Improvements:**

**1. Multiple Environment File Support:**
```
Import from Postman ▼
├── Collection File: [Browse...] collection.json
├── Environment Files: [Browse...] (multi-select)
│   ├── QA.postman_environment.json
│   ├── Staging.postman_environment.json
│   └── Production.postman_environment.json
└── [Import]
```

**Features:**
- Upload multiple environment files simultaneously
- Select which environment to use for variable resolution
- Preview variable values from each environment
- Generate separate configs for each environment
- Environment switcher dropdown to preview different configs

**2. Multiple Collection Import:**
- Support uploading multiple collection files
- Merge related collections into single config
- Detect duplicate requests across collections
- Combine request chains from different collections

**3. Better Variable Resolution:**
- Show preview of resolved vs unresolved variables
- Highlight which variables come from which environment
- Option to keep `{{ .vars.variableName }}` for runtime resolution
- Smart detection of dynamic values to preserve as `{{ $guid }}` or `{{ $timestamp }}`

**4. Import Preview & Customization:**
- Preview generated config before accepting import
- Edit node names, IDs, and order before finalizing
- Choose which requests to include/exclude
- Rearrange request sequence with drag-and-drop

**User Workflow:**
1. Click "Import Config" → "From Postman Collection"
2. Upload collection file + multiple environment files
3. Select environment for variable resolution
4. Preview discovered requests with variable values
5. Customize node order, names, and selections
6. Click "Import" to generate config
7. Review and edit generated config in Studio

### Export to Postman Collection/Environment

Add export capability to convert FlowSphere configs back into Postman collection and environment files for sharing with team members or using in Postman/Newman.

**Benefits:**
- Share FlowSphere configs with team members who use Postman
- Run FlowSphere sequences in Postman GUI for debugging
- Execute configs in CI/CD using Newman (Postman CLI)
- Collaborate with teams using different tools
- Preserve work when migrating between tools

**Proposed UI:**
```
Export Config ▼
├── Download JSON (existing)
├── Copy to Clipboard (existing)
└── Export to Postman (NEW)
    ├── Collection + Environment
    ├── Collection Only
    └── Environment Only
```

**Export Dialog Features:**
- Convert all nodes to Postman requests with proper structure
- Generate environment file from `variables` section
- Preserve request order and folder structure
- Map validations to Postman test scripts
- Convert conditions to pre-request scripts
- Handle variable substitution syntax translation
- Generate meaningful collection name and description

**Variable Conversion:**
- `{{ .vars.apiKey }}` → `{{apiKey}}` + environment file entry
- `{{ .responses.stepId.field }}` → Postman test script with `pm.environment.set()`
- `{{ $guid }}` → `{{$guid}}` (Postman dynamic variable)
- `{{ $timestamp }}` → `{{$timestamp}}` (Postman dynamic variable)

**Validation to Test Script Conversion:**
```json
// FlowSphere validation
{
  "validations": [
    { "httpStatusCode": 200 },
    { "jsonpath": ".token", "exists": true }
  ]
}
```
↓
```javascript
// Postman test script
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Token exists", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.token).to.exist;
});

// Save token for next request
pm.environment.set("authenticate_token", jsonData.token);
```

**Condition to Pre-request Script Conversion:**
```json
// FlowSphere condition
{
  "conditions": [
    { "node": "authenticate", "field": ".status", "equals": "success" }
  ]
}
```
↓
```javascript
// Postman pre-request script
const authStatus = pm.environment.get("authenticate_status");
if (authStatus !== "success") {
    console.log("Skipping request: authentication not successful");
    pm.execution.skipRequest();
}
```

**Export Options:**
- **Collection Name**: Auto-generate or custom input
- **Environment Name**: Auto-generate or custom input
- **Include Folders**: Group related nodes into folders
- **Variable Scope**: Choose between environment vs collection variables
- **Test Scripts**: Include/exclude validation test scripts
- **Download Format**: Single ZIP with both files, or separate downloads

**User Workflow:**
1. Click "Export Config" → "Export to Postman"
2. Choose export type (Collection + Environment, Collection Only, etc.)
3. Customize collection/environment names
4. Select export options (folders, test scripts, etc.)
5. Preview generated Postman structure
6. Click "Export" to download files
7. Import into Postman and verify

**Generated Files:**
- `collection-name.postman_collection.json` - All requests with tests
- `environment-name.postman_environment.json` - All variables
- `README.txt` - Notes about variable dependencies and execution order

## JavaScript/Node.js Version & NPM Package

**Status:** Planned - Complete replacement of Bash implementation

Rewrite FlowSphere in JavaScript/Node.js and publish as an npm package, completely replacing the current Bash script.

### Benefits

**Cross-Platform:**
- Pure JavaScript - truly OS-agnostic (Windows, macOS, Linux)
- No Bash/WSL dependency on Windows (native Node.js only)
- Better path handling, file operations, and system compatibility
- Easier to maintain consistent behavior across all platforms

**Developer Experience:**
- Global installation: `npm install -g flowsphere`
- Programmatic API for automated testing frameworks
- Better debugging with JavaScript tooling
- Access to npm ecosystem for future extensions

**Integrated Visual Editor:**
- Bundle FlowSphere Studio (config editor) in the npm package
- Launch with `flowsphere studio` command
- Single installation for both CLI and visual editor
- Versions always in sync (no separate deployment)

**CI/CD & Integration:**
- Native Node.js integration in modern pipelines
- Use as a library in existing test suites
- No system dependencies beyond Node.js

### Package Structure

```
flowsphere/
├── bin/
│   └── flowsphere.js          # CLI entry point
├── lib/
│   ├── executor.js            # Core execution engine (execute_step equivalent)
│   ├── validator.js           # Response validation logic
│   ├── substitution.js        # Variable substitution engine
│   ├── conditions.js          # Conditional execution evaluator
│   ├── http-client.js         # HTTP request handling (axios/fetch)
│   ├── logger.js              # Execution logging
│   └── utils.js               # Helpers (UUID, timestamp, etc.)
├── studio/                    # Bundled config editor
│   ├── index.html
│   ├── css/
│   │   └── styles.css
│   └── js/
│       ├── core/
│       ├── modals.js
│       ├── ui-renderer.js
│       └── autocomplete.js
├── examples/
│   ├── config-simple.json
│   ├── config-oauth.json
│   └── ...
├── tests/
│   ├── config-test-*.json
│   └── test-suite.js
├── package.json
└── README.md
```

### CLI Commands

```bash
# Install globally
npm install -g flowsphere

# Run a config file
flowsphere config.json
flowsphere examples/config-simple.json

# Start execution from a specific step
flowsphere config.json --start-step 5

# Launch visual config editor (opens browser)
flowsphere studio

# Display version
flowsphere --version

# Show help
flowsphere --help
```

### Programmatic API

```javascript
// Use as a library in your test suite
const FlowSphere = require('flowsphere');

// Run a config file
const result = await FlowSphere.run('config.json');
console.log(result.stepsExecuted, result.stepsSkipped);

// Run with options
await FlowSphere.run('config.json', {
  startStep: 5,
  enableDebug: true,
  onStepComplete: (step, response) => {
    console.log(`Step ${step.id} completed`);
  }
});

// Run from config object (no file)
const config = {
  defaults: { baseUrl: 'https://api.example.com' },
  nodes: [ /* ... */ ]
};
await FlowSphere.runConfig(config);
```

### Visual Editor Integration

```javascript
// bin/flowsphere.js
function launchStudio() {
  const express = require('express');
  const open = require('open');
  const path = require('path');

  const app = express();
  const studioPath = path.join(__dirname, '../studio');
  app.use(express.static(studioPath));

  const server = app.listen(0, () => {
    const port = server.address().port;
    const url = `http://localhost:${port}`;
    console.log(`🎨 FlowSphere Studio: ${url}`);
    open(url);  // Opens browser automatically
  });
}
```

### Migration Strategy

**Phase 1: Implementation (Weeks 1-3)**
- Implement core features in JavaScript
- Match exact behavior of Bash version
- Use OS-agnostic Node.js APIs only

**Phase 2: Testing & Validation (Week 4)**
- Run all existing test configs on Node.js version
- Test on Windows, macOS, and Linux
- Compare output with Bash version
- Fix any discrepancies

**Phase 3: Bundling & Publishing (Week 5)**
- Bundle config editor in npm package
- Configure package.json for global installation
- Test `flowsphere studio` command
- Publish to npm registry

**Phase 4: Cutover (Week 6)**
- Replace `flowsphere` Bash script with Node.js CLI
- Move Bash version to `legacy/` folder temporarily
- Update all documentation and README
- Announce migration to users

**Phase 5: Cleanup (Week 7+)**
- Monitor for issues, gather feedback
- Remove Bash script after validation period
- Archive Bash version in git history

### Critical Requirements

**100% Config File Compatibility:**
- All existing config files must work unchanged
- `examples/*.json` ✅
- `tests/*.json` ✅
- `scenarios/*.json` ✅
- User configs ✅

**Feature Parity:**
- Dynamic variables: `{{ $guid }}`, `{{ $timestamp }}`
- Global variables: `{{ .vars.key }}`
- Response references: `{{ .responses.nodeId.field }}`
- User input: `{{ .input.key }}`
- Conditional execution with AND logic
- HTTP status code + JSON path validations
- Numeric comparisons (>, <, >=, <=)
- Timeout control per step
- User input prompts
- Browser launch for OAuth flows
- Debug logging
- Execution logs (JSON format)
- Detailed skip reasons

**OS-Agnostic Implementation:**
- Use native Node.js modules (`fs`, `path`, `crypto`)
- Choose cross-platform npm packages only
- Test on Windows, macOS, Linux
- No shell commands (`exec`, `spawn`) unless absolutely necessary
- Handle file paths with `path.join()` everywhere

### Core Dependencies (All Cross-Platform)

```json
{
  "dependencies": {
    "axios": "^1.6.0",           // HTTP client
    "express": "^4.18.0",        // Local server for studio
    "open": "^9.0.0",            // Cross-platform browser launcher
    "commander": "^11.0.0"       // CLI argument parsing (optional)
  }
}
```

### package.json Configuration

```json
{
  "name": "flowsphere",
  "version": "1.0.0",
  "description": "HTTP sequence runner with conditional execution and variable substitution",
  "main": "lib/index.js",
  "bin": {
    "flowsphere": "./bin/flowsphere.js"
  },
  "files": [
    "bin/",
    "lib/",
    "studio/",
    "examples/",
    "README.md"
  ],
  "keywords": [
    "http",
    "api",
    "testing",
    "sequence",
    "workflow",
    "automation"
  ],
  "engines": {
    "node": ">=14.17.0"
  }
}
```

### Advantages Over Bash Version

| Feature | Bash | Node.js |
|---------|------|---------|
| Windows Support | WSL/Git Bash required | Native ✅ |
| Cross-Platform | Manual compatibility checks | Truly OS-agnostic ✅ |
| Debugging | Echo statements | Full debugging tools ✅ |
| IDE Support | Limited | Excellent (IntelliSense, etc.) ✅ |
| Testing | Manual testing | Jest/Mocha test frameworks ✅ |
| Programmatic Use | Not possible | API available ✅ |
| Visual Editor | Separate deployment | Bundled together ✅ |
| Installation | Manual (git clone) | `npm install -g` ✅ |
| Dependencies | curl, jq, bash | Node.js only ✅ |

### Success Criteria

- ✅ All existing config files run identically
- ✅ Works on Windows without WSL
- ✅ Published to npm registry
- ✅ Config editor launches with `flowsphere studio`
- ✅ Programmatic API functional
- ✅ Documentation updated
- ✅ Bash script removed from main codebase

## MCP Server for Code Generation

**Status:** Planned - Schema + Template Provider Architecture

Create a Model Context Protocol (MCP) server that provides **deep schema knowledge and code generation templates** to help AI agents generate executable code in multiple programming languages from FlowSphere config files.

### Core Concept

This is **NOT** about generating config files - it's about **transforming existing configs into standalone executable programs** in the user's preferred language. The MCP server acts as a specialized knowledge provider that ensures AI agents correctly implement ALL FlowSphere features when generating code.

### Benefits

**Language Flexibility:**
- Generate code in user's preferred language instead of requiring Bash
- No external dependencies - eliminate need for bash/curl/jq in production
- Embeddable - integrate sequences directly into existing applications

**Code Quality:**
- Type safety - strongly-typed languages get compile-time checks
- Customizable - generated code can be modified for specific needs
- Portable - works on any platform that supports the target language
- Version control friendly - code review and track API test sequences in Git

**Integration:**
- Integrate FlowSphere workflows into existing test frameworks (pytest, Jest, xUnit)
- Use generated code in CI/CD pipelines
- Maintain sequences as production code alongside main application

### MCP Server Architecture

The server follows **Option B: Schema + Code Templates** approach:

**1. Schema Documentation Provider**
Comprehensive knowledge of the FlowSphere config structure:
- All node properties (id, name, method, url, headers, body, etc.)
- Variable substitution syntax and types
- Condition evaluation logic (all operators and sources)
- Validation rules (httpStatusCode + jsonpath with all operators)
- Defaults merging behavior (skipDefaultHeaders, skipDefaultValidations)
- Special features (userPrompts, launchBrowser, dynamic placeholders)

**2. Code Template Library**
Pre-built, battle-tested code snippets for each target language:
- HTTP request execution patterns
- Variable substitution engines ({{ .responses.id.field }}, {{ .vars.key }}, etc.)
- Dynamic placeholder handlers ({{ $guid }}, {{ $timestamp }})
- Condition evaluators (statusCode, equals, notEquals, exists, greaterThan, etc.)
- Validation logic (all operators: exists, equals, notEquals, numeric comparisons)
- User prompt collectors
- Browser launcher utilities
- Timeout and error handling

**3. Validation Tools**
Ensures generated code handles all edge cases:
- Verifies all condition types are supported
- Checks nested jsonpath handling
- Validates array support in conditions
- Confirms variable substitution completeness

### Priority Target Languages

1. **Python** - pytest, unittest, behave (Cucumber), or standalone scripts
2. **JavaScript/TypeScript** - Jest, Mocha, cucumber-js (Cucumber), or standalone Node.js
3. **C# (.NET Latest)** - xUnit, NUnit, SpecFlow (Cucumber), or console applications

**BDD/Cucumber Support:**
Generate Gherkin feature files alongside step definitions for behavior-driven development:
- **Python**: Gherkin features + behave step definitions
- **JavaScript/TypeScript**: Gherkin features + cucumber-js step definitions
- **C#**: Gherkin features + SpecFlow step definitions

**Example Gherkin output:**
```gherkin
Feature: API Authentication Flow

  Scenario: User login and profile retrieval
    Given the API base URL is "https://api.example.com"
    When I POST to "/auth/login" with credentials
    Then the response status should be 200
    And the response should contain a "token" field
    When I GET "/users/me" with the authentication token
    Then the response status should be 200
    And the response should contain an "id" field
```

### Dependency Policy

- Dependencies are **allowed and encouraged** for production-quality code
- All packages must come from **trusted sources**:
  - Python: PyPI (pypi.org) - e.g., `requests`, `pytest`, `behave`
  - JavaScript/TypeScript: npm (npmjs.com) - e.g., `axios`, `jest`, `@cucumber/cucumber`
  - C#: NuGet (nuget.org) - e.g., `Newtonsoft.Json`, `xUnit`, `SpecFlow`
- Generated code must specify exact versions for reproducibility
- Prefer well-maintained, popular libraries with active communities

### Generated Code Format

All generated code should be **standalone applications** that can be:
- Run directly from command line
- Integrated into test frameworks (pytest, Jest, xUnit, Cucumber/BDD)
- Modified and customized by developers
- Version controlled and code reviewed
- Deployed to CI/CD pipelines
- Support both traditional test frameworks and BDD/Gherkin syntax

### Complete Feature Coverage

The MCP server ensures generated code handles ALL FlowSphere features:

✅ **HTTP Execution**
- All methods (GET, POST, PUT, DELETE, PATCH)
- Headers (with defaults merging or skipDefaultHeaders)
- Request bodies (JSON and form-urlencoded)
- Timeouts (global defaults + step overrides)
- baseUrl resolution for relative URLs

✅ **Variable Substitution**
- Global variables: `{{ .vars.key }}`
- Response references: `{{ .responses.nodeId.field.subfield }}`
- User input: `{{ .input.variableName }}`
- Dynamic placeholders: `{{ $guid }}` (new UUID per occurrence), `{{ $timestamp }}`
- Nested field access and array indexing

✅ **Condition Evaluation**
- All sources: step (by node ID), variable, input
- All operators: statusCode, equals, notEquals, exists, greaterThan, lessThan, greaterThanOrEqual, lessThanOrEqual
- AND logic (all conditions must be met)
- Variable substitution in condition values
- Array support in conditions
- Skip tracking (maintain response array indexing)

✅ **Validation**
- HTTP status code validation
- JSON path validations with all operators
- Multiple validations per step
- Default validations (merge or skip with skipDefaultValidations)
- Numeric comparisons (integers and floats)
- Fail-fast on validation errors

✅ **User Interaction**
- User prompts collection (userPrompts)
- Browser launching (launchBrowser with jsonpath)
- Cross-platform support (Windows, macOS, Linux)

✅ **State Management**
- Response storage by step ID
- User input storage per step
- Defaults merging logic
- Debug logging (if enableDebug is true)

### Example: Python with pytest

**Input Config:**
```json
{
  "variables": {
    "apiKey": "your-api-key"
  },
  "defaults": {
    "baseUrl": "https://api.example.com",
    "timeout": 30,
    "headers": { "Content-Type": "application/json" }
  },
  "nodes": [
    {
      "id": "authenticate",
      "name": "Login",
      "method": "POST",
      "url": "/auth/login",
      "body": { "username": "user", "password": "pass" },
      "validations": [
        { "httpStatusCode": 200 },
        { "jsonpath": ".token", "exists": true }
      ]
    },
    {
      "id": "getProfile",
      "name": "Get Profile",
      "method": "GET",
      "url": "/users/me",
      "headers": { "Authorization": "Bearer {{ .responses.authenticate.token }}" },
      "conditions": [
        { "node": "authenticate", "field": ".token", "exists": true }
      ]
    }
  ]
}
```

**Generated Python Code:**
```python
import requests
import pytest
import uuid
import time
import webbrowser
from typing import Dict, Any, Optional

class APISequence:
    """FlowSphere sequence executor - generated from config"""

    def __init__(self):
        self.responses = {}
        self.variables = {
            "apiKey": "your-api-key"
        }
        self.defaults = {
            "baseUrl": "https://api.example.com",
            "timeout": 30,
            "headers": {"Content-Type": "application/json"}
        }

    def substitute_variables(self, value: Any, user_input: Dict = None) -> Any:
        """Handle {{ }} variable substitution"""
        if not isinstance(value, str):
            return value

        # Dynamic placeholders - each {{ $guid }} gets unique UUID
        import re
        value = re.sub(r'\{\{\s*\$guid\s*\}\}', lambda m: str(uuid.uuid4()), value)

        # Timestamp - same for all occurrences in one step
        timestamp = str(int(time.time()))
        value = re.sub(r'\{\{\s*\$timestamp\s*\}\}', timestamp, value)

        # Global variables
        for key, val in self.variables.items():
            value = value.replace(f"{{{{ .vars.{key} }}}}", str(val))

        # Response references
        for node_id, response_data in self.responses.items():
            # Support nested field access like {{ .responses.nodeId.field.subfield }}
            pattern = re.compile(rf'\{{\{{\s*\.responses\.{node_id}\.([^\}}]+)\s*\}}}}')
            for match in pattern.finditer(value):
                field_path = match.group(1)
                field_value = self.extract_field(response_data, field_path)
                value = value.replace(match.group(0), str(field_value))

        # User input
        if user_input:
            for key, val in user_input.items():
                value = value.replace(f"{{{{ .input.{key} }}}}", str(val))

        return value

    def extract_field(self, data: Dict, path: str) -> Any:
        """Extract nested field using dot notation"""
        parts = path.split('.')
        result = data
        for part in parts:
            if isinstance(result, dict):
                result = result.get(part)
            else:
                return None
        return result

    def evaluate_condition(self, condition: Dict) -> bool:
        """Evaluate a single condition"""
        if "node" in condition:
            node_id = condition["node"]
            if node_id not in self.responses:
                return False

            response = self.responses[node_id]

            # Status code check
            if "statusCode" in condition:
                return response.get("_status_code") == condition["statusCode"]

            # Field-based checks
            if "field" in condition:
                field_value = self.extract_field(response, condition["field"].lstrip('.'))

                if "equals" in condition:
                    expected = self.substitute_variables(condition["equals"])
                    return str(field_value) == str(expected)
                if "notEquals" in condition:
                    expected = self.substitute_variables(condition["notEquals"])
                    return str(field_value) != str(expected)
                if "exists" in condition:
                    return (field_value is not None) == condition["exists"]
                if "greaterThan" in condition:
                    return float(field_value) > float(condition["greaterThan"])
                if "lessThan" in condition:
                    return float(field_value) < float(condition["lessThan"])
                if "greaterThanOrEqual" in condition:
                    return float(field_value) >= float(condition["greaterThanOrEqual"])
                if "lessThanOrEqual" in condition:
                    return float(field_value) <= float(condition["lessThanOrEqual"])

        return True

    def run_step(self, step_config: Dict) -> Optional[Dict]:
        """Execute a single step"""
        step_name = step_config["name"]

        # Evaluate conditions (AND logic - all must pass)
        if "conditions" in step_config:
            if not all(self.evaluate_condition(c) for c in step_config["conditions"]):
                print(f"⊘ Skipped: {step_name}")
                return None

        # Merge with defaults (unless skip flags are set)
        headers = {}
        if not step_config.get("skipDefaultHeaders", False):
            headers.update(self.defaults.get("headers", {}))
        headers.update(step_config.get("headers", {}))

        timeout = step_config.get("timeout", self.defaults.get("timeout", 30))

        url = step_config["url"]
        if not url.startswith("http"):
            url = self.defaults.get("baseUrl", "") + url

        # Substitute variables in headers and body
        headers = {k: self.substitute_variables(v) for k, v in headers.items()}

        body = step_config.get("body")
        if body:
            body = {k: self.substitute_variables(v) for k, v in body.items()}

        # Make HTTP request
        try:
            response = requests.request(
                method=step_config["method"],
                url=url,
                headers=headers,
                json=body,
                timeout=timeout
            )
        except requests.Timeout:
            raise Exception(f"Request timeout after {timeout}s: {step_name}")

        # Store response
        response_data = response.json()
        response_data["_status_code"] = response.status_code
        self.responses[step_config["id"]] = response_data

        # Run validations
        validations = step_config.get("validations", [])
        if not validations and not step_config.get("skipDefaultValidations", False):
            validations = self.defaults.get("validations", [{"httpStatusCode": 200}])

        for validation in validations:
            if "httpStatusCode" in validation:
                assert response.status_code == validation["httpStatusCode"], \
                    f"Expected status {validation['httpStatusCode']}, got {response.status_code}"

            if "jsonpath" in validation:
                value = self.extract_field(response_data, validation["jsonpath"].lstrip('.'))

                if "exists" in validation:
                    assert (value is not None) == validation["exists"], \
                        f"Field {validation['jsonpath']} existence check failed"
                if "equals" in validation:
                    assert str(value) == str(validation["equals"]), \
                        f"Field {validation['jsonpath']} expected {validation['equals']}, got {value}"
                if "notEquals" in validation:
                    assert str(value) != str(validation["notEquals"]), \
                        f"Field {validation['jsonpath']} should not equal {validation['notEquals']}"
                if "greaterThan" in validation:
                    assert float(value) > float(validation["greaterThan"]), \
                        f"Field {validation['jsonpath']} not greater than {validation['greaterThan']}"
                if "lessThan" in validation:
                    assert float(value) < float(validation["lessThan"]), \
                        f"Field {validation['jsonpath']} not less than {validation['lessThan']}"
                if "greaterThanOrEqual" in validation:
                    assert float(value) >= float(validation["greaterThanOrEqual"])
                if "lessThanOrEqual" in validation:
                    assert float(value) <= float(validation["lessThanOrEqual"])

        # Launch browser if configured
        if "launchBrowser" in step_config:
            url_to_launch = self.extract_field(response_data, step_config["launchBrowser"].lstrip('.'))
            if url_to_launch:
                webbrowser.open(url_to_launch)

        print(f"✅ Success: {step_name}")
        return response_data


def test_api_sequence():
    """Generated test from FlowSphere config"""
    sequence = APISequence()

    # Step 1: Login
    sequence.run_step({
        "id": "authenticate",
        "name": "Login",
        "method": "POST",
        "url": "/auth/login",
        "body": {"username": "user", "password": "pass"},
        "validations": [
            {"httpStatusCode": 200},
            {"jsonpath": ".token", "exists": True}
        ]
    })

    # Step 2: Get Profile
    sequence.run_step({
        "id": "getProfile",
        "name": "Get Profile",
        "method": "GET",
        "url": "/users/me",
        "headers": {"Authorization": "Bearer {{ .responses.authenticate.token }}"},
        "conditions": [
            {"node": "authenticate", "field": ".token", "exists": True}
        ]
    })


if __name__ == "__main__":
    # Run standalone
    test_api_sequence()
```

### Example: Python BDD with behave (Cucumber)

**Generated Gherkin Feature File (`features/api_sequence.feature`):**
```gherkin
Feature: API Sequence Execution
  Execute multi-step API workflows with variable substitution and validation

  Background:
    Given the API base URL is "https://api.example.com"
    And the default timeout is 30 seconds
    And the default headers are:
      | Content-Type | application/json |

  Scenario: Authenticate and retrieve user profile
    When I POST to "/auth/login" with body:
      """json
      {
        "username": "user",
        "password": "pass"
      }
      """
    Then the response status code should be 200
    And the response should have field ".token" that exists
    And I store the response as "authenticate"

    When I GET "/users/me" with headers:
      | Authorization | Bearer {{ .responses.authenticate.token }} |
    Then the response status code should be 200
    And the response should have field ".id" that exists
```

**Generated Step Definitions (`features/steps/api_steps.py`):**
```python
import requests
import uuid
import time
from behave import given, when, then
from hamcrest import assert_that, equal_to, is_not, none

class APIContext:
    """Shared context for API sequence execution"""
    def __init__(self):
        self.base_url = ""
        self.timeout = 30
        self.default_headers = {}
        self.responses = {}
        self.last_response = None

    def substitute_variables(self, value):
        """Handle {{ }} variable substitution"""
        if not isinstance(value, str):
            return value

        import re
        # Dynamic placeholders
        value = re.sub(r'\{\{\s*\$guid\s*\}\}', lambda m: str(uuid.uuid4()), value)
        timestamp = str(int(time.time()))
        value = re.sub(r'\{\{\s*\$timestamp\s*\}\}', timestamp, value)

        # Response references
        for node_id, response_data in self.responses.items():
            pattern = re.compile(rf'\{{\{{\s*\.responses\.{node_id}\.([^\}}]+)\s*\}}}}')
            for match in pattern.finditer(value):
                field_path = match.group(1)
                field_value = self.extract_field(response_data, field_path)
                value = value.replace(match.group(0), str(field_value))

        return value

    def extract_field(self, data, path):
        """Extract nested field using dot notation"""
        parts = path.split('.')
        result = data
        for part in parts:
            if isinstance(result, dict):
                result = result.get(part)
            else:
                return None
        return result


@given('the API base URL is "{base_url}"')
def step_set_base_url(context, base_url):
    if not hasattr(context, 'api'):
        context.api = APIContext()
    context.api.base_url = base_url


@given('the default timeout is {timeout:d} seconds')
def step_set_timeout(context, timeout):
    if not hasattr(context, 'api'):
        context.api = APIContext()
    context.api.timeout = timeout


@given('the default headers are')
def step_set_default_headers(context):
    if not hasattr(context, 'api'):
        context.api = APIContext()
    for row in context.table:
        context.api.default_headers[row[0]] = row[1]


@when('I {method} to "{endpoint}" with body')
def step_request_with_body(context, method, endpoint):
    if not hasattr(context, 'api'):
        context.api = APIContext()

    url = context.api.base_url + endpoint
    headers = dict(context.api.default_headers)

    # Parse JSON body from docstring
    import json
    body = json.loads(context.text)

    # Substitute variables
    body = {k: context.api.substitute_variables(v) for k, v in body.items()}
    headers = {k: context.api.substitute_variables(v) for k, v in headers.items()}

    response = requests.request(
        method=method,
        url=url,
        headers=headers,
        json=body,
        timeout=context.api.timeout
    )

    context.api.last_response = response


@when('I {method} "{endpoint}" with headers')
def step_request_with_headers(context, method, endpoint):
    if not hasattr(context, 'api'):
        context.api = APIContext()

    url = context.api.base_url + endpoint
    headers = dict(context.api.default_headers)

    # Add step-specific headers
    for row in context.table:
        header_value = context.api.substitute_variables(row[1])
        headers[row[0]] = header_value

    response = requests.request(
        method=method,
        url=url,
        headers=headers,
        timeout=context.api.timeout
    )

    context.api.last_response = response


@then('the response status code should be {status_code:d}')
def step_check_status_code(context, status_code):
    assert_that(context.api.last_response.status_code, equal_to(status_code),
                f"Expected status {status_code}, got {context.api.last_response.status_code}")


@then('the response should have field "{field_path}" that exists')
def step_check_field_exists(context, field_path):
    response_data = context.api.last_response.json()
    field_value = context.api.extract_field(response_data, field_path.lstrip('.'))
    assert_that(field_value, is_not(none()),
                f"Field {field_path} should exist in response")


@then('I store the response as "{node_id}"')
def step_store_response(context, node_id):
    response_data = context.api.last_response.json()
    response_data['_status_code'] = context.api.last_response.status_code
    context.api.responses[node_id] = response_data
```

**Run with:**
```bash
# Install dependencies
pip install behave requests pyhamcrest

# Run BDD tests
behave features/
```

### Usage Example

```bash
# AI agent uses MCP server to generate code:
User: "Generate Python pytest code from scenarios/config-onboarding.json"
AI: [Reads config via MCP server, gets schema knowledge + templates, generates complete Python code]

User: "Convert examples/config-oauth-example.json to TypeScript with Jest"
AI: [Generates TypeScript code with all features: OAuth, browser launch, validations]

User: "Create C# xUnit tests from tests/config-test-comparisons.json"
AI: [Generates C# test class with numeric comparison validations]

User: "Generate Cucumber BDD tests in Python from config.json"
AI: [Generates Gherkin feature file + behave step definitions with full FlowSphere feature support]

User: "Create SpecFlow tests in C# from scenarios/config-onboarding.json"
AI: [Generates Gherkin feature file + SpecFlow C# step definitions]
```

### Implementation Phases

**Phase 1 - Schema Provider:**
- Document all config properties and their behavior
- Provide comprehensive examples of each feature
- Explain edge cases and special handling

**Phase 2 - Template Library:**
- Create reusable code templates for Python, JS/TS, C#
- Cover all FlowSphere features (substitution, conditions, validations, etc.)
- Include error handling and logging patterns

**Phase 3 - Validation Tools:**
- Build checklist validator for generated code
- Verify all config features are implemented
- Test generated code against reference configs

**Phase 4 - Advanced Features:**
- Support custom template overrides
- Add code style customization options (linting, formatting)
- Enable plugin system for additional languages

## Plug-and-Play UI Architecture

Refactor FlowSphere Studio to have a lightweight, always-working base UI with optional plug-and-play features.

**Benefits:**
- Faster initial load time
- Better reliability (core UI never breaks from feature issues)
- Easier maintenance and testing
- Users can enable/disable features based on needs
- Simpler debugging and development

**Core Base UI (Always Works):**
- Basic config editor with form inputs
- Simple JSON preview (no fancy highlighting)
- Load/Save config files
- Add/Remove/Edit nodes manually
- No JavaScript dependencies beyond basic Bootstrap

**Plug-and-Play Features (Optional Modules):**
- **drag-drop-handler.js** - Drag-and-drop node reordering
- **autocomplete.js** - Variable substitution autocomplete
- **json-preview-toggle.js** - Collapsible JSON panel
- **theme-switcher.js** - Dark/Light theme toggle
- **postman-parser.js** - Import from Postman collections
- **json-sync-scroll.js** - Auto-scroll JSON to edited section
- **validation-mode.js** - Live config validation

**Proposed Architecture:**
```html
<!-- Base UI (required) -->
<script src="js/core/state.js"></script>
<script src="js/core/renderer.js"></script>
<script src="js/core/config-manager.js"></script>

<!-- Optional Features (load on demand) -->
<script src="js/features/drag-drop.js" data-feature="drag-drop"></script>
<script src="js/features/autocomplete.js" data-feature="autocomplete"></script>
<script src="js/features/theme-toggle.js" data-feature="theme"></script>
```

**Feature Toggle UI:**
```
Settings > Features
☑ Drag-and-Drop Reordering
☑ Variable Autocomplete
☑ JSON Preview Panel Toggle
☑ Theme Switcher
☐ Postman Import (disabled for faster load)
```

**Implementation:**
- Feature registry system with enable/disable API
- Graceful degradation (UI works even if feature fails to load)
- Each feature is self-contained with no cross-dependencies
- Features can be hot-swapped without page reload

---

**Contributing:** Feel free to propose additional features by creating an issue or pull request!
