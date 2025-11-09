# FlowSphere Roadmap

This document outlines the planned features and enhancements for FlowSphere.

## Priority Overview

### Planned Features

Features listed in priority order (highest to lowest):

| Priority | Feature | Status | Details |
|----------|---------|--------|---------|
| 1 | JSON Beautify for Request Bodies | Planned | See below |
| 2 | Enhanced Launch Browser with Expressions | Planned | See below |
| 3 | Execution Log Visualizer | Planned | [View Details](docs/features/execution-log-visualizer.md) |
| 4 | Swagger/OpenAPI Import | Planned | [View Details](docs/features/swagger-openapi-import.md) |
| 5 | Enhanced Postman Import | Planned | [View Details](docs/features/enhanced-postman-import.md) |
| 6 | Export to Postman Collection/Environment | Planned | [View Details](docs/features/export-to-postman.md) |
| 7 | Visual Workflow Storytelling & Export | Planned | [View Details](docs/features/visual-workflow-storytelling-export.md) |

### Completed & External Features

| Feature | Status |
|---------|--------|
| Flow Runner - Execution Controls | ✅ Completed (All Phases) |
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

### 1. JSON Beautify for Request Bodies

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

### 2. Enhanced Launch Browser with Expressions

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

### 3. Execution Log Visualizer

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

### 4. Swagger/OpenAPI Import

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

### 5. Enhanced Postman Import

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

### 6. Export to Postman Collection/Environment

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

### 7. Visual Workflow Storytelling & Export

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
