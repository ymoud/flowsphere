# FlowSphere Roadmap

This document outlines the planned features and enhancements for FlowSphere.

## Priority Overview

### Planned Features

Features listed in priority order (highest to lowest):

| Priority | Feature | Status | Details |
|----------|---------|--------|---------|
| 1 | JSON Beautify for Request Bodies | Planned | See below |
| 2 | Response Header Access | Planned | [View Details](docs/features/response-header-access.md) |
| 3 | Enhanced Launch Browser with Expressions | Planned | See below |
| 4 | Execution Log Visualizer | Planned | [View Details](docs/features/execution-log-visualizer.md) |
| 5 | Swagger/OpenAPI Import | Planned | [View Details](docs/features/swagger-openapi-import.md) |
| 6 | Export to Postman Collection/Environment | Planned | [View Details](docs/features/export-to-postman.md) |
| 7 | Visual Workflow Storytelling & Export | Planned | [View Details](docs/features/visual-workflow-storytelling-export.md) |
| 8 | OAuth Callback Capture (Studio) | Planned | [View Details](docs/features/oauth-callback-capture.md) |
| 9 | Multi-Environment Variable Groups | Planned | [View Details](docs/features/multi-environment-variable-groups.md) |

### Completed & External Features

| Feature | Status |
|---------|--------|
| Enhanced Postman Import | ✅ Completed (with known issues) - [Details](docs/features/enhanced-postman-import.md) |
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

### 2. Response Header Access

**Status:** Planned

Access HTTP response headers in variable substitution, validations, and conditions with a new structured response syntax.

**Problem:**
- Cannot access response headers (auth tokens, rate limits, pagination, etc.)
- Only response body fields are accessible
- Many APIs return critical data in headers, not body
- Forces manual token extraction or external scripts

**Solution:**
Introduce structured response access pattern:
- `.responses.<id>.body.<field>` - Response body (explicit)
- `.responses.<id>.headers.<headerName>` - Response headers (NEW)
- `.responses.<id>.status` - HTTP status code (NEW)
- `.responses.<id>.statusText` - Status text (NEW)

**Breaking Change:**
- Old: `.responses.<id>.<field>` (implicit body access)
- New: `.responses.<id>.body.<field>` (explicit body access)
- No backwards compatibility (pre-release v0.x)

**Example - Extract auth token from header:**
```json
{
  "id": "login",
  "method": "POST",
  "url": "/auth/login"
},
{
  "id": "get-profile",
  "method": "GET",
  "url": "/profile",
  "headers": {
    "Authorization": "Bearer {{ .responses.login.headers.x-auth-token }}"
  }
}
```

**Example - Validate rate limit:**
```json
{
  "validations": [
    {
      "header": "x-ratelimit-remaining",
      "greaterThan": 0
    }
  ]
}
```

**Example - Conditional execution based on header:**
```json
{
  "conditions": [
    {
      "node": "check-api",
      "header": "x-feature-enabled",
      "equals": "true"
    }
  ]
}
```

**Key Features:**
- Access headers: `{{ .responses.step.headers.x-auth-token }}`
- Header validations (exists, equals, comparisons)
- Header conditions for conditional execution
- Case-insensitive header names (auto-normalized to lowercase)
- Studio autocomplete for header paths
- Headers displayed in Flow Runner and Try it Out

**Benefits:**
- Support header-based authentication flows
- Check rate limits before making requests
- Use pagination headers for multi-page requests
- Extract correlation IDs for tracing
- Validate API versioning headers
- More realistic API testing workflows

➡️ [Full Feature Specification](docs/features/response-header-access.md)

---

### 3. Enhanced Launch Browser with Expressions

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

### 4. Execution Log Visualizer

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

### 5. Swagger/OpenAPI Import

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

### 6. Enhanced Postman Import

**Status:** Completed (with known issues)

Improve the existing Postman import with environment file support, auth conversion, test script mining, and import preview.

**Completed:**
- ✅ Phase 1: Order-of-appearance import (works without numeric prefixes)
- ✅ Phase 1: Auth conversion (Basic, Bearer, API Key)
- ✅ Phase 1: Test script mining (pm.response.to.have.status, pm.expect patterns)
- ✅ Phase 1: Query parameter handling and disabled items filtering
- ✅ Phase 2: Environment file support with variable resolution
- ✅ Phase 3: Import preview with variable resolution display

**Known Issues:**
- ⚠️ Request-level "No Auth" not detected (doesn't set skipDefaultHeaders)
- ⚠️ Basic auth with response-based variables not supported (requires new FlowSphere feature)

**Key Features:**
- Import any Postman collection (numbered or non-numbered)
- Environment file support with variable resolution
- Auth conversion to FlowSphere headers
- Test script mining to extract validations
- Import preview before finalizing

➡️ [Full Feature Specification](docs/features/enhanced-postman-import.md)
➡️ [Implementation Status & Known Issues](docs/implementation/enhanced-postman-import-status.md)

---

### 7. Export to Postman Collection/Environment

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

### 8. Visual Workflow Storytelling & Export

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

### 9. OAuth Callback Capture (Studio)

**Status:** Planned

Automatically capture OAuth authorization codes and state parameters when OAuth providers redirect to FlowSphere Studio, eliminating manual copy-paste steps in OAuth flows.

**Current Pain Points:**
- Users must manually copy authorization codes from browser URL
- Manual intervention breaks automation flow
- Error-prone and tedious during development
- Cannot run OAuth flows in automated tests

**Solution:**
- FlowSphere Studio backend acts as OAuth callback URL receiver
- Automatically captures `code` and `state` parameters
- Validates state for CSRF protection
- Flow continues automatically after callback received
- Zero manual intervention after browser authentication

**Key Features:**
- `{{ $studioCallbackUrl }}` dynamic variable for callback URL
- `captureOAuthCallback` node configuration
- Real-time SSE communication between server and client
- State parameter validation for security
- Timeout handling with clear error messages
- Multi-session support for concurrent OAuth flows
- Works with all major OAuth providers (Google, GitHub, Microsoft, etc.)

**Example Flow:**
1. Node 1: Get auth URL, configure callback to Studio
2. Browser opens for user authentication
3. Provider redirects to Studio: `http://localhost:PORT/oauth/callback?code=...&state=...`
4. Studio captures parameters, validates state
5. Flow continues automatically to token exchange node

**Benefits:**
- Fully automated OAuth flows
- Better developer experience
- Enables automated testing
- Reduces errors from manual steps
- Supports complex multi-step OAuth patterns

➡️ [Full Feature Specification](docs/features/oauth-callback-capture.md)

---

### 10. Multi-Environment Variable Groups

**Status:** Planned

Support multiple named variable groups (environments) in configs, allowing users to switch between dev, staging, and production variables without editing the config file.

**Current Problem:**
- Single `variables` section forces manual editing to switch environments
- Must maintain duplicate config files for each environment
- Risk of accidentally running against wrong environment
- Tedious and error-prone for frequent environment switches

**Solution:**
- Define multiple named variable groups in config (`dev`, `staging`, `production`)
- Select environment at runtime via CLI flag or Studio dropdown
- Zero config editing when switching environments

**Key Features:**
- `variableGroups` config section with named environments
- CLI: `flowsphere config.json --env=staging`
- Studio: Dropdown to select environment before execution
- `_common` group for shared variables across all environments
- Variable inheritance: environment → common → legacy `variables`
- Environment-specific execution logs
- Production confirmation prompts for safety
- Sensitive variable redaction (apiKey, secret, password, token)

**Example Config:**
```json
{
  "variableGroups": {
    "_common": {
      "apiVersion": "v2",
      "timeout": 30
    },
    "dev": {
      "baseUrl": "https://api.dev.example.com",
      "apiKey": "dev-key"
    },
    "staging": {
      "baseUrl": "https://api.staging.example.com",
      "apiKey": "staging-key"
    },
    "production": {
      "baseUrl": "https://api.example.com",
      "apiKey": "prod-key",
      "timeout": 120
    }
  },
  "defaultEnvironment": "dev"
}
```

**Benefits:**
- One config for all environments
- Safer execution (visual environment indicators)
- Faster workflow development
- Better git hygiene (no credential commits)
- Backwards compatible with existing `variables` configs

➡️ [Full Feature Specification](docs/features/multi-environment-variable-groups.md)

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
