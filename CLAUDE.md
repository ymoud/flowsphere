# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is an HTTP sequence runner tool that executes sequential HTTP requests defined in JSON configuration files. The core script is written in Bash and uses `curl` and `jq` for HTTP operations and JSON processing.

## Running the Tool

**Execute a sequence:**
```bash
./apiseq.sh config.json
```

**Available config examples:**
- `config-simple.json` - Basic example using JSONPlaceholder API
- `config.json` - Full-featured example with authentication flow
- `config-onboarding.json` - NBG onboarding API sequence (generated from Postman)
- `config-test-features.json` - Demonstrates user input prompts and variable substitution
- `config-oauth-example.json` - OAuth flow example with browser launch and user input
- `config-test-multiple-validations.json` - Demonstrates multiple JSON path validations feature

**Prerequisites:**
- bash (4.0+)
- curl
- jq

**Note:** The script includes automatic dependency installation. If curl or jq are missing, users will be prompted to auto-install them. The script detects the OS and package manager (apt, yum, dnf, brew, winget, choco, scoop) and attempts installation automatically.

## Architecture

### Core Components

**apiseq.sh** (main script):
- Entry point: `main()` function parses config and orchestrates execution
- `execute_step()`: Executes individual HTTP requests with curl
- `substitute_variables()`: Template engine that replaces `{{ .responses[N].field }}` and `{{ .input.key }}` placeholders
- `prompt_user_input()`: Collects user input interactively for steps with prompts
- `launch_browser()`: Opens URLs in default browser (cross-platform support)
- `evaluate_condition()`: Conditional execution logic (skip steps based on previous response status/fields)
- `merge_with_defaults()`: Merges step config with global defaults for baseUrl, headers, timeout, and validations
- Response storage: Arrays `responses_json[]` and `responses_status[]` maintain state across steps
- User input storage: `USER_INPUT_JSON` stores prompted values for current step

**Config File Format:**
```json
{
  "enableDebug": false,              // Optional: enable debug logging (default: false)
  "defaults": {
    "baseUrl": "https://api.example.com",
    "timeout": 30,                   // Request timeout in seconds
    "headers": { "Content-Type": "application/json" },
    "validations": [                 // Default validations applied to all steps
      { "status": 200 }
    ]
  },
  "steps": [
    {
      "id": "step-id",               // Required unique identifier for the step
      "name": "Step description",
      "method": "GET|POST|PUT|DELETE|PATCH",
      "url": "/endpoint",            // Can be relative if baseUrl is set
      "timeout": 10,                 // Optional step-level timeout override
      "headers": {},                 // Merged with defaults
      "body": {},                    // Optional request payload
      "prompts": {},                 // Optional user input prompts
      "condition": {},               // Optional conditional execution
      "validations": [],             // Response validations (status + jsonpath)
      "launchBrowser": ".url"        // Optional: launch browser with URL from response
    }
  ]
}
```

### Key Features

**Dynamic Value Substitution:**
- Response syntax: `{{ .responses[N].field.subfield }}`
  - Zero-based indexing: responses[0] = first step, responses[1] = second step
  - Used in: URLs, headers, request bodies
- User input syntax: `{{ .input.variableName }}`
  - References values collected from `prompts` in the same step
  - Used in: URLs, headers, request bodies
- Implementation: `substitute_variables()` uses regex matching to find and replace placeholders

**Conditional Execution:**
- Steps can be skipped based on previous response conditions
- Condition types:
  - `statusCode`: Check HTTP status of previous response
  - `field` + `equals`/`notEquals`: Check JSON field values
  - `field` + `exists`: Check if field exists in response
- Skipped steps maintain array indexing (stored as empty responses)

**Validation:**
- **Unified validations array** - All validations (status + jsonpath) in one array
- **Status validation**: `{"status": 200}`
  - Validates HTTP response status code
  - If no status validation defined, defaults to 200
  - Can be set globally in `defaults.validations`
  - Example: `{"status": 201}`
- **JSON path validations**: Validate response body fields
  - Each validation must have `jsonpath` field
  - Optional criteria:
    - `exists`: true/false - check if field exists
    - `equals`: expected value - check for equality
    - `notEquals`: unwanted value - check for inequality
  - Multiple validation criteria can be combined on the same path
  - If no criteria specified, defaults to checking that field exists
- **Default validations**: Define in `defaults.validations` to apply to all steps
  - Steps without validations inherit default validations
  - Steps with validations override defaults completely
- **Example:**
    ```json
    {
      "defaults": {
        "validations": [
          { "status": 200 }
        ]
      },
      "steps": [
        {
          "id": "create-user",
          "name": "Create user",
          "method": "POST",
          "url": "/users",
          "validations": [
            { "status": 201 },
            { "jsonpath": ".id", "exists": true },
            { "jsonpath": ".email", "notEquals": "" }
          ]
        },
        {
          "id": "get-user",
          "name": "Get user (uses default validations)",
          "method": "GET",
          "url": "/users/1"
        }
      ]
    }
    ```
- Stops execution immediately on validation failure

**Timeout Control:**
- Request timeout in seconds (uses curl's `--max-time` option)
- Can be set globally in `defaults.timeout`
- Can be overridden per step with step-level `timeout` property
- Step-level timeout takes precedence over default timeout
- Timeout failures are clearly reported with specific error messages
- Execution stops immediately on timeout

**User Input Prompts:**
- Collect user input interactively before executing a step
- Step property: `prompts` - object with key-value pairs (variable name: prompt message)
- Values accessible via `{{ .input.variableName }}` syntax
- Example:
  ```json
  {
    "name": "Login with credentials",
    "method": "POST",
    "url": "/login",
    "prompts": {
      "username": "Enter your username:",
      "password": "Enter your password:"
    },
    "body": {
      "user": "{{ .input.username }}",
      "pass": "{{ .input.password }}"
    }
  }
  ```
- User input is reset for each step that uses prompts
- Can be combined with response substitution in the same step

**Browser Launch:**
- Automatically open URLs in the default browser after successful step execution
- Step property: `launchBrowser` - jsonpath to extract URL from response
- Supports Windows (start), macOS (open), and Linux (xdg-open)
- Example:
  ```json
  {
    "name": "Get authorization URL",
    "method": "POST",
    "url": "/oauth/authorize",
    "launchBrowser": ".authorizationUrl"
  }
  ```
- Browser launches only if the jsonpath successfully extracts a URL
- Runs in background, doesn't block execution
- Useful for OAuth flows and interactive authentication

**Debug Logging:**
- Optional detailed execution logging for troubleshooting
- Config property: `enableDebug: true` (defaults to false)
- Shows variable substitution, step execution flow, and internal state
- Debug output goes to stderr, normal output to stdout

## Postman Integration

**Convert Postman collections to config files:**
```bash
# Recommended: Generates minified config with defaults section
node postman-tools/parse-postman-minified.js

# Legacy: Generates full config without defaults
node postman-tools/parse-postman-enhanced.js
```

**Parser capabilities:**
- Reads from `Postman/Onboarding Chatbot 2025.postman_collection.json`
- Resolves environment variables from `Postman/OnboardingApi.postman_environment.json`
- Sorts requests by numeric prefixes (1., 2., 3., etc.)
- Auto-detects dependencies between requests
- Auto-wires dependencies using `{{ .responses[N].field }}` syntax
- Handles Postman dynamic variables (`{{$guid}}`, `{{$timestamp}}`)
- Outputs to `config-onboarding.json`

## Development Guidelines

**When modifying the script:**
- Maintain POSIX compliance for cross-platform compatibility (Windows/macOS/Linux)
- Always quote variables to handle spaces and special characters
- Use `set -euo pipefail` for strict error handling
- Temp files are stored in `$TEMP_DIR` (cleaned up automatically via trap)

**Testing changes:**
- Test with `config-simple.json` (uses public JSONPlaceholder API)
- Verify conditional execution with steps that have condition blocks
- Test variable substitution across multiple steps
- Check error handling by introducing invalid expectations

**Config file design:**
- Use `defaults` section to reduce duplication (baseUrl, timeout, common headers, default validations)
- Relative URLs (starting with `/`) are automatically prepended with baseUrl
- Step-level configs override defaults (headers are merged, timeout/validations override)
- Default validations apply to steps without validations; steps with validations override defaults completely
- Conditional steps reference only completed steps (step 3 can check responses 0, 1, or 2)
- All steps must have a unique `id` field for named references
