# FlowSphere Roadmap

This document outlines the planned features and enhancements for FlowSphere.

## Priority Overview

### Planned Features

Features listed in priority order (highest to lowest):

| Priority | Feature | Status | Details |
|----------|---------|--------|---------|
| 1 | Flow Runner - Execution Controls | In Progress (Phase 1 ✅) | [View Details](docs/features/flow-runner-execution-controls.md) |
| 2 | Config Validation & Schema Enforcement | ✅ Complete | [Technical Design](docs/technical/config-validation-system.md) |
| 3 | JSON Beautify for Request Bodies | Planned | See below |
| 4 | Enhanced Launch Browser with Expressions | Planned | See below |
| 5 | Execution Log Visualizer | Planned | [View Details](docs/features/execution-log-visualizer.md) |
| 6 | Swagger/OpenAPI Import | Planned | [View Details](docs/features/swagger-openapi-import.md) |
| 7 | Enhanced Postman Import | Planned | [View Details](docs/features/enhanced-postman-import.md) |
| 8 | Export to Postman Collection/Environment | Planned | [View Details](docs/features/export-to-postman.md) |
| 9 | Visual Workflow Storytelling & Export | Planned | [View Details](docs/features/visual-workflow-storytelling-export.md) |

### Completed & External Features

| Feature | Status |
|---------|--------|
| Config Validation & Schema Enforcement | ✅ Completed |
| Persistent User Input Across Steps | ✅ Completed |
| Publish to NPM | ✅ Completed (v0.1.0) |
| Node Templates & Import System | ✅ Completed |
| Try it Out - Individual Node Testing (Engage Node) | ✅ Completed |
| Flow Runner - Live Execution Engine | ✅ Completed |
| JavaScript/Node.js Version & NPM Package | ✅ Completed |
| Plug-and-Play UI Architecture | ✅ Completed |
| MCP Server for Code Generation | [External Repository](https://github.com/ymoud/flowsphere-mcp) |

---

## Feature Summaries

### 1. Flow Runner - Execution Controls

**Status:** In Progress (Phase 1 ✅ Complete)

Add execution controls to the Flow Runner with **step-by-step execution modes** (replacing the original pause/resume design).

**Key Features:**
- **Stop/Cancel**: Abort execution at any point (Phase 1) ✅ **COMPLETE**
- **Step-by-Step**: Execute one step at a time with manual control (Phase 2) - Planned
- **Auto-Step**: Execute steps with configurable auto-resume delay (Phase 3) - Planned

**Why the change from pause/resume?**
The original pause/resume approach had UX issues due to signal lag between client and server. The new step-by-step approach provides clearer, more predictable behavior without timing confusion.

➡️ [Full Feature Specification](docs/features/flow-runner-execution-controls.md)

---

### 2. Config Validation & Schema Enforcement

**Status:** ✅ Complete

Comprehensive validation system that catches errors before execution with clear, actionable error messages.

**Implemented Features:**
- **Two-Tier Validation System**: Separates structure vs value validations
  - Structure: Fields that Studio UI prevents from breaking (types, required fields)
  - Value: Fields that users can break in Studio (duplicate IDs, broken references)
- **Pre-Execution Validation**: Automatic validation before running flows (CLI + Studio)
- **Manual Validation**: "Validate" button with detailed error modal
- **Auto-Validation**: Silent validation on file load with badge indicator
- **Inline JSON Validation**: Real-time feedback for invalid JSON in textareas
- **CLI Support**: `--validate` flag for standalone validation

**Validation Checks:**
- ✅ Duplicate node IDs
- ✅ Missing required fields (id, method, url)
- ✅ Invalid HTTP methods
- ✅ Invalid URLs (absolute vs relative with baseUrl)
- ✅ Malformed placeholders (missing `{{` or `}}`)
- ✅ Non-existent node references in placeholders
- ✅ Invalid condition syntax (node/variable/input sources)
- ✅ Invalid validation rules (httpStatusCode, jsonpath)
- ✅ JSON body type mismatch with Content-Type header
- ✅ Unserializable JSON bodies (circular references)

**Error Message Example:**
```
❌ Config Validation Failed (2 errors)

Error 1:
  Node: "get-premium-data" (nodes[3])
  Field: nodes[3].id
  Issue: Duplicate node ID: "get-premium-data"
  Fix: Each node must have a unique ID

Error 2:
  Node: "another-node" (nodes[4])
  Field: nodes[4].body.text
  Issue: Malformed placeholder: Found 1 opening "{{" but 0 closing "}}"
  Fix: Check: "{{ .responses.user-login.test" - all placeholders need both {{ and }}
```

➡️ [Technical Design Documentation](docs/technical/config-validation-system.md)

---

### 3. JSON Beautify for Request Bodies

**Status:** Planned

Add a "Beautify" button next to JSON request body textareas in Studio to format/prettify malformed or minified JSON with one click.

**Problem:**
- Users paste minified JSON from APIs or other sources
- Manual formatting is tedious and error-prone
- Ugly JSON is hard to read and edit

**Solution:**
- Add "Beautify JSON" button next to body textarea
- One-click formatting with proper indentation (2 spaces)
- Preserves existing valid JSON structure
- Shows error if JSON is invalid (doesn't corrupt textarea)

**Benefits:**
- Better developer experience with helpful error messages
- Prevent app freezes from invalid configs
- Guide users to correct syntax

**Implementation:**
- Create `lib/validator-config.js` module
- Add validation step before execution in `runSequence()`
- Integrate with Studio for real-time validation
- Add `--validate` CLI flag for config validation without execution

---

### 4. Enhanced Launch Browser with Expressions

**Status:** Planned

Enhance the `launchBrowser` field to support string expressions with variable substitution, not just simple JSONPath extraction.

**Current Behavior:**
- `launchBrowser` accepts a JSONPath (e.g., `.authorizationUrl`)
- Extracts the full URL from the response
- Opens the extracted URL in the browser

**Problem:**
- Cannot build URLs dynamically by combining static parts with response data
- Cannot append query parameters or path segments from response
- Limited to URLs that exist complete in the response

**Enhancement:**
Allow `launchBrowser` to accept expressions with variable substitution:
- Static URL with dynamic parts: `https://example.com/verify/{{ .responses.current.verificationId }}`
- Append query parameters: `{{ .responses.auth.baseUrl }}?token={{ .responses.auth.token }}`
- Mix global variables: `{{ .vars.dashboardUrl }}/users/{{ .responses.createUser.id }}`

**Example:**
```json
{
  "id": "create-verification",
  "name": "Create verification code",
  "method": "POST",
  "url": "/verify",
  "launchBrowser": "https://myapp.com/verify?code={{ .responses.create-verification.code }}&userId={{ .responses.login.userId }}"
}
```

**Benefits:**
- More flexible URL construction for OAuth flows
- Support dynamic verification/activation links
- Combine multiple response fields into URL
- Better support for multi-step authentication flows

**Implementation Notes:**
- Reuse existing `lib/substitution.js` logic
- Backwards compatible: If no `{{` found, treat as JSONPath (current behavior)
- Apply same substitution rules as other fields (variables, responses, user input)
- Validate resulting URL before launching browser

---

### 5. Execution Log Visualizer

**Status:** Planned

A visual interface for exploring, analyzing, and comparing execution logs with rich filtering, search, and export capabilities.

**Key Features:**
- Timeline/waterfall view of execution flow
- Performance metrics and bottleneck detection
- Compare multiple executions side-by-side
- Filter and search through large logs
- Export as HTML/PDF
- Standalone CLI and Studio integration

➡️ [Full Feature Specification](docs/features/execution-log-visualizer.md)

---

### 6. Swagger/OpenAPI Import

**Status:** Planned

Import API specifications directly into FlowSphere Studio for automatic config generation.

**Key Features:**
- Support Swagger 2.0 and OpenAPI 3.0+
- Preview endpoints before import
- Auto-generate nodes with validations
- Extract authentication schemes
- Variable detection and mapping

➡️ [Full Feature Specification](docs/features/swagger-openapi-import.md)

---

### 7. Enhanced Postman Import

**Status:** Planned

Improve the existing Postman import with multi-environment support and better variable resolution.

**Key Features:**
- Multiple environment file support
- Import preview with customization
- Better variable resolution and mapping
- Multiple collection merging
- Batch editing before import

➡️ [Full Feature Specification](docs/features/enhanced-postman-import.md)

---

### 8. Export to Postman Collection/Environment

**Status:** Planned

Convert FlowSphere configs back into Postman collection and environment files for team collaboration.

**Key Features:**
- Export to Postman Collection v2.1 format
- Generate environment files from variables
- Convert validations to test scripts
- Convert conditions to pre-request scripts
- ZIP download with README

➡️ [Full Feature Specification](docs/features/export-to-postman.md)

---

### 9. Visual Workflow Storytelling & Export

**Status:** Planned

An **animated workflow storytelling tool** that turns API integrations into beautiful, shareable visual presentations. Create engaging flowchart diagrams with data flow animations and auto-generated narratives that anyone can understand.

**Purpose:** Help teams **explain and share** API workflows through visual storytelling, not just document execution results.

**Key Features:**
- 🌊 **Animated Data Flow**: Watch variables flow between nodes with particle effects
- 📖 **Story Mode**: Clean narrative view explaining "what it does" (non-technical friendly)
- 🔍 **Debug Mode**: Toggle to see technical details (methods, headers, responses)
- 🎬 **Interactive Timeline**: Scrubber with play/pause controls and auto-narration
- 🔄 **Variable Substitution Visualization**: See `{{ .responses.login.token }}` → actual values
- ✨ **Fun but Professional**: Smooth animations, delightful micro-interactions
- 📦 **Self-Contained HTML**: Export single file that works offline, anywhere

**Complements Execution Log Visualizer:**
- Log Visualizer = Analysis tool for developers (filtering, metrics, debugging)
- Visual Storytelling = Presentation tool for everyone (demos, onboarding, sharing)

**Use Cases:**
- Product demos and stakeholder presentations
- Onboarding new team members
- Documenting API integrations visually
- Sharing workflows with non-technical people

➡️ [Full Feature Specification](docs/features/visual-workflow-storytelling-export.md)

---

## How to Contribute

See individual feature documents in the `/docs/features` directory for detailed specifications, implementation phases, and acceptance criteria.

Each feature document includes:
- Overview and benefits
- Detailed specifications
- Implementation phases
- Success criteria
- Technical details

---

## Feature Request Process

1. Check existing feature documents in `/docs/features` directory
2. If feature doesn't exist, create a new issue on GitHub
3. Discuss scope and approach before implementation
4. Create feature document if approved
5. Implement in phases as specified

---

## Notes

- Feature documents are living documents and may be updated as requirements evolve
- Completed features are moved from "Planned" to "Completed" status
- External features are maintained in separate repositories
