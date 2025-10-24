# HTTP Sequence Runner

Execute sequential HTTP requests from JSON configuration files. Cross-platform Bash tool with dynamic value substitution, conditional execution, and validation.

## Quick Start

### Run a Configuration
```bash
./apiseq.sh config-onboarding.json
```

**Prerequisites:** bash, curl, jq (auto-install available)

### Visual Config Editor
Open `config-editor.html` in your browser for a visual way to create and edit configurations:

```bash
# Open in browser
start config-editor.html        # Windows
open config-editor.html         # macOS
xdg-open config-editor.html     # Linux
```

**Features:**
- Load, edit, and save JSON configs visually
- Create new configs from templates (Empty, Simple, OAuth, User Input)
- Form-based editing with validation
- **Intelligent autocomplete** for `{{ }}` variable syntax (type `{{` in any field)
  - Suggests global variables (`.vars.`)
  - Suggests response references (`.responses[N].` or `.responses.stepId.`)
  - Suggests user input variables (`.input.`)
  - Appears at your text caret with keyboard navigation
- Live JSON preview with one-click copy to clipboard
- Auto-save to browser localStorage (never lose your work)
- Download configs as JSON files

## Features

- Named response references (`{{ .responses.login.token }}`)
- Conditional execution based on previous responses
- Form-urlencoded and JSON body support
- User input prompts and browser launch
- Timeout control and comprehensive validation
- Visual feedback (✅/❌/⊘)

## Configuration Format

```json
{
  "defaults": {
    "baseUrl": "https://api.example.com",
    "headers": { "Content-Type": "application/json" },
    "timeout": 30,
    "expect": { "status": 200 }
  },
  "steps": [
    {
      "id": "login",
      "name": "Authenticate",
      "method": "POST",
      "url": "/login",
      "body": { "username": "user", "password": "pass" },
      "expect": { "jsonpath": ".token" }
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
| `timeout` | | Request timeout in seconds |
| `prompts` | | User input prompts: `{"key": "Prompt text"}` |
| `condition` | | Conditional execution rules |
| `expect` | | Validation rules (merged with defaults) |
| `launchBrowser` | | JSONPath to URL for browser launch |

## Response References

### Named (Recommended)
```
{{ .responses.stepId.field.subfield }}
```

### Index-based (Legacy)
```
{{ .responses[0].field.subfield }}
```

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

```json
{
  "expect": {
    "status": 201,                // Expected HTTP status
    "jsonpath": ".id",            // Extract and validate field
    "equals": "123",              // Value must equal
    "notEquals": "error",         // Value must not equal
    "exists": true                // Field must exist (or not exist)
  }
}
```

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

## Examples

### OAuth Flow
```json
{
  "steps": [
    {
      "id": "getAuthUrl",
      "method": "POST",
      "url": "/oauth/authorize",
      "body": { "client_id": "xyz", "scope": "read" },
      "launchBrowser": ".authorizationUrl"
    },
    {
      "id": "exchangeToken",
      "method": "POST",
      "url": "/oauth/token",
      "prompts": { "code": "Enter auth code from browser:" },
      "bodyFormat": "form-urlencoded",
      "body": {
        "code": "{{ .input.code }}",
        "client_id": "xyz",
        "grant_type": "authorization_code"
      }
    },
    {
      "id": "getProfile",
      "method": "GET",
      "url": "/user/profile",
      "headers": { "Authorization": "Bearer {{ .responses.exchangeToken.access_token }}" }
    }
  ]
}
```

### Conditional Workflow
```json
{
  "steps": [
    {
      "id": "login",
      "method": "POST",
      "url": "/login",
      "body": { "username": "user", "password": "pass" }
    },
    {
      "id": "premiumFeature",
      "method": "GET",
      "url": "/premium/dashboard",
      "condition": { "step": "login", "field": ".isPremium", "equals": "true" }
    },
    {
      "id": "regularFeature",
      "method": "GET",
      "url": "/regular/dashboard",
      "condition": { "step": "login", "field": ".isPremium", "notEquals": "true" }
    }
  ]
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

## Postman Import

Convert Postman collections:
```bash
node postman-tools/parse-postman-minified.js
```

Reads from `Postman/*.postman_collection.json`, outputs to `config-onboarding.json`.

## Installation

### Automatic (Recommended)
Run the script - missing dependencies trigger auto-install prompt.

### Manual
**macOS:** `brew install curl jq`
**Ubuntu/Debian:** `sudo apt-get install curl jq`
**RHEL/CentOS:** `sudo yum install curl jq`
**Windows:** Install Git Bash, then `choco install jq` or `winget install jqlang.jq`

## Tips

- Use named references for maintainability
- Set global defaults to reduce duplication
- Use conditions for branching workflows
- Enable debug mode for troubleshooting
- Test with `config-simple.json` (uses public JSONPlaceholder API)

## Examples Included

- `config-simple.json` - Basic usage with JSONPlaceholder API
- `config.json` - Full-featured example with authentication
- `config-oauth-example.json` - OAuth flow with browser launch
- `config-test-features.json` - User input prompts demo
- `config-onboarding.json` - NBG onboarding API sequence (generated from Postman)
