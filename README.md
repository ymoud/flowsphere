# HTTP Sequence Runner

**Automate multi-step API workflows** — Define once, run anywhere. No coding required.

## What It Does

Executes API call sequences where each step uses data from previous responses. Perfect for testing authentication flows, onboarding journeys, or any multi-step API process.

**Example:** Login → Get user profile → Create resource → Verify creation
- Each step automatically passes tokens, IDs, and data to the next
- Visual config editor included (no JSON editing needed)
- Works on Windows, macOS, and Linux

## Why It Exists

Complex API workflows require multiple requests with interdependent data. This tool eliminates manual curl commands and brittle shell scripts by providing:
- **Reusable workflows** saved as JSON configurations
- **Smart variable passing** between steps (no manual copy-paste)
- **Built-in validation** to catch failures immediately
- **Visual editing** with autocomplete for non-developers

## Quick Start

### 1. Run a Workflow

**Try a learning example:**
```bash
./apiseq.sh examples/config-simple.json
```

**Or run a production scenario:**
```bash
./apiseq.sh scenarios/config-onboarding-sbx.json
```

**That's it.** The script handles everything: making requests, extracting data, passing it forward, and validating responses.

**Prerequisites:** bash, curl, jq — all auto-install if missing

**Advanced:**
```bash
# Resume from a specific step (useful for debugging)
./apiseq.sh examples/config.json 5    # Start from step 6 (0-based index)
```

### 2. Use the Visual Editor (Recommended)

**No JSON knowledge required.** Open `config-editor/index.html` in any browser.

```bash
start config-editor/index.html        # Windows
open config-editor/index.html         # macOS
xdg-open config-editor/index.html     # Linux
```

**Key features:**
- Form-based editing with templates (OAuth flow, user input, etc.)
- **Smart autocomplete** — type `{{` to see available variables, responses, inputs
- **Import from Postman** — convert existing Postman collections automatically
- Auto-save to browser (never lose work)
- Live preview with one-click export to JSON

## Core Capabilities

| Feature | Description |
|---------|-------------|
| **Smart Data Passing** | Reference any field from previous responses: `{{ .responses.login.token }}` |
| **Conditional Logic** | Skip/execute steps based on previous results (e.g., premium vs. free user flows) |
| **User Interaction** | Prompt for input (passwords, codes) or auto-launch browser (OAuth flows) |
| **Validation** | Verify status codes and response fields; fail fast on errors |
| **Flexible Formats** | JSON and form-urlencoded bodies supported |
| **Visual Feedback** | Clear status indicators: ✅ success / ❌ failed / ⊘ skipped |

## Examples

See the [`examples/`](examples/) folder for complete, ready-to-run configurations:

| File | Description |
|------|-------------|
| [`config-simple.json`](examples/config-simple.json) | **Start here** — Basic workflow with public JSONPlaceholder API |
| [`config-oauth-example.json`](examples/config-oauth-example.json) | OAuth authentication flow with browser launch |
| [`config-test-features.json`](examples/config-test-features.json) | User input prompts and interactive workflows |
| [`config.json`](examples/config.json) | Full-featured example with authentication and validation |
| [`config-ids-token.json`](examples/config-ids-token.json) | NBG token acquisition with form-urlencoded body |

**Run any example:**
```bash
./apiseq.sh examples/config-simple.json
```

---

## Technical Reference

### Configuration Format

```json
{
  "defaults": {
    "baseUrl": "https://api.example.com",
    "headers": { "Content-Type": "application/json" },
    "timeout": 30,
    "validations": [
      { "status": 200 }
    ]
  },
  "steps": [
    {
      "id": "login",
      "name": "Authenticate",
      "method": "POST",
      "url": "/login",
      "body": { "username": "user", "password": "pass" },
      "validations": [
        { "jsonpath": ".token", "exists": true }
      ]
    },
    {
      "id": "getProfile",
      "name": "Get Profile",
      "method": "GET",
      "url": "/profile",
      "headers": { "Authorization": "Bearer {{ .responses.login.token }}" }
    }
  ]
}
```

## Step Fields

| Field | Required | Description |
|-------|----------|-------------|
| `id` | ✓ | Unique identifier (letters, numbers, underscore, hyphen) |
| `name` | ✓ | Human-readable description |
| `method` | ✓ | HTTP method (GET, POST, PUT, DELETE, PATCH) |
| `url` | ✓ | Full URL or relative path (with baseUrl) |
| `headers` | | HTTP headers (merged with defaults) |
| `body` | | Request body (JSON or form-urlencoded) |
| `bodyFormat` | | `"json"` (default) or `"form-urlencoded"` |
| `timeout` | | Request timeout in seconds (overrides defaults) |
| `prompts` | | User input prompts: `{"key": "Prompt text"}` |
| `condition` | | Conditional execution rules |
| `validations` | | Array of validation rules (overrides defaults) |
| `launchBrowser` | | JSONPath to URL for browser launch |

## Response References

### Named References
```
{{ .responses.stepId.field.subfield }}
```

Reference responses from previous steps using their step ID.

### User Input
```
{{ .input.variableName }}
```

## Conditional Execution

Execute steps conditionally based on previous responses:

```json
{
  "condition": {
    "step": "login",              // Step ID (or "response": 0 for index)
    "statusCode": 200,            // Check status code
    "field": ".isPremium",        // Check field value
    "equals": "true",             // Must equal (or "notEquals", "exists")
  }
}
```

## Validation

Validations are specified as an array. Each validation can check status code or JSON path criteria:

```json
{
  "validations": [
    { "status": 201 },                                    // HTTP status code
    { "jsonpath": ".id", "exists": true },               // Field must exist
    { "jsonpath": ".name", "equals": "John" },           // Field value equals
    { "jsonpath": ".error", "notEquals": "failed" },     // Field value not equals
    { "jsonpath": ".count", "greaterThan": 0 },          // Numeric comparison
    { "jsonpath": ".age", "lessThanOrEqual": 120 }       // Multiple criteria supported
  ]
}
```

**Default validations:** Set in `defaults.validations` to apply to all steps. Steps with their own validations override defaults completely.

## Form-Urlencoded Bodies

**Auto-detect via Content-Type:**
```json
{
  "headers": { "Content-Type": "application/x-www-form-urlencoded" },
  "body": { "username": "john", "password": "secret" }
}
```

**Explicit format:**
```json
{
  "bodyFormat": "form-urlencoded",
  "body": { "grant_type": "client_credentials", "client_id": "xyz" }
}
```

Automatically URL-encodes values. Does not support nested objects/arrays.

## User Input

```json
{
  "prompts": {
    "username": "Enter username:",
    "password": "Enter password:"
  },
  "body": {
    "user": "{{ .input.username }}",
    "pass": "{{ .input.password }}"
  }
}
```

## Debug Mode

Enable detailed logging:
```json
{
  "enableDebug": true,
  "steps": [...]
}
```

Shows variable substitution, curl commands, and internal state.

---

## Installation

### Automatic (Recommended)
Run the script - missing dependencies trigger auto-install prompt.

### Manual
**macOS:** `brew install curl jq`
**Ubuntu/Debian:** `sudo apt-get install curl jq`
**RHEL/CentOS:** `sudo yum install curl jq`
**Windows:** Install Git Bash, then `choco install jq` or `winget install jqlang.jq`

## Best Practices

- **Use the visual editor** to avoid JSON syntax errors
- **Set global defaults** (baseUrl, headers) to reduce duplication across steps
- **Use named step IDs** instead of numeric indexes for maintainability
- **Enable debug mode** when troubleshooting: add `"enableDebug": true` to your config
- **Test incrementally** — use the resume feature to start from any step: `./apiseq.sh examples/config.json 5`
