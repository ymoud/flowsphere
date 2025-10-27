# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is an HTTP sequence runner tool that executes sequential HTTP requests defined in JSON configuration files. The core script is written in Bash and uses `curl` and `jq` for HTTP operations and JSON processing.

## Running the Tool

**Execute a sequence:**
```bash
./flowsphere examples/config-simple.json
```

**Available config examples (in `examples/` folder):**
- `config-simple.json` - Basic example using JSONPlaceholder API
- `config.json` - Full-featured example with authentication flow
- `config-oauth-example.json` - OAuth flow example with browser launch and user input
- `config-test-features.json` - Demonstrates user input prompts and variable substitution
- `config-user-input.json` - User input demonstration

**Test configs (in `tests/` folder):**
- `config-test-variables.json` - Demonstrates global variables feature
- `config-test-multiple-validations.json` - Demonstrates multiple JSON path validations feature
- `config-test-defaults.json` - Tests defaults merging behavior
- `config-test-comparisons.json` - Tests numeric comparison validations

**Production scenarios (in `scenarios/` folder):**
- `config-onboarding.json` - NBG onboarding API sequence for QA environment (generated from Postman)
- `config-onboarding-sbx.json` - NBG onboarding sandbox environment

**Prerequisites:**
- bash (4.0+)
- curl
- jq

**Note:** The script includes automatic dependency installation. If curl or jq are missing, users will be prompted to auto-install them. The script detects the OS and package manager (apt, yum, dnf, brew, winget, choco, scoop) and attempts installation automatically.

## Architecture

### Core Components

**flowsphere** (main script):
- Entry point: `main()` function parses config and orchestrates execution
- `execute_step()`: Executes individual HTTP requests with curl
- `substitute_variables()`: Template engine that replaces `{{ .responses[N].field }}` and `{{ .input.key }}` placeholders
- `prompt_user_input()`: Collects user input interactively for steps with prompts
- `launch_browser()`: Opens URLs in default browser (cross-platform support)
- `evaluate_condition()`: Conditional execution logic (executes step only if all conditions are met)
- `merge_with_defaults()`: Merges step config with global defaults for baseUrl, headers, timeout, and validations
- Response storage: Arrays `responses_json[]` and `responses_status[]` maintain state across steps
- User input storage: `USER_INPUT_JSON` stores prompted values for current step

**Config File Format:**
```json
{
  "enableDebug": false,              // Optional: enable debug logging (default: false)
  "variables": {                     // Optional: global variables accessible in all steps
    "apiKey": "my-secret-key",
    "userId": "12345"
  },
  "defaults": {
    "baseUrl": "https://api.example.com",
    "timeout": 30,                   // Request timeout in seconds
    "headers": { "Content-Type": "application/json" },
    "validations": [                 // Default validations applied to all steps
      { "httpStatusCode": 200 }
    ]
  },
  "nodes": [
    {
      "id": "step-id",               // Required unique identifier for the step
      "name": "Step description",
      "method": "GET|POST|PUT|DELETE|PATCH",
      "url": "/endpoint",            // Can be relative if baseUrl is set
      "timeout": 10,                 // Optional step-level timeout override
      "headers": {},                 // Merged with defaults
      "body": {},                    // Optional request payload
      "userPrompts": {},             // Optional user input prompts
      "conditions": [],              // Optional conditional execution (AND logic)
      "validations": [],             // Response validations (httpStatusCode + jsonpath)
      "launchBrowser": ".url"        // Optional: launch browser with URL from response
    }
  ]
}
```

### Key Features

**Dynamic Value Substitution:**
- **Dynamic variables** (Postman-style syntax):
  - `{{ $guid }}` - Generates a unique UUID v4 for each occurrence
  - `{{ $timestamp }}` - Inserts current Unix timestamp (seconds since epoch)
  - Used in: URLs, headers, request bodies
  - Each `{{ $guid }}` occurrence generates a new unique UUID
  - All `{{ $timestamp }}` occurrences in the same step get the same timestamp value
  - Example: `"requestId": "{{ $guid }}"` or `"timestamp": {{ $timestamp }}`
  - **Note**: This is NOT backwards compatible - the old `GENERATED_GUID` and `TIMESTAMP` syntax no longer works
- Global variables syntax: `{{ .vars.key }}`
  - References values defined in the `variables` section at config level
  - Useful for API keys, user IDs, common values used across multiple steps
  - Used in: URLs, headers, request bodies
  - Example: `{{ .vars.apiKey }}`
- Response syntax: `{{ .responses.stepId.field.subfield }}`
  - Named references: responses.stepId references step by its `id` field
  - Used in: URLs, headers, request bodies
  - Example: `{{ .responses.authenticate.token }}`
- User input syntax: `{{ .input.variableName }}`
  - References values collected from `userPrompts` in the same step
  - Used in: URLs, headers, request bodies
- Implementation: `substitute_variables()` uses regex matching to find and replace placeholders
- Substitution order: Dynamic Variables ($guid, $timestamp) → Global Variables → User Input → Response References

**Conditional Execution:**
- Steps execute only if ALL conditions are met (AND logic)
- Each step can have multiple conditions in the `conditions` array
- **Condition sources**:
  - `step`: Check response from a previous node (by node ID) - **use `"node"` field**
  - `variable`: Check a global variable value
  - `input`: Check a user input value
- **Condition types**:
  - `statusCode`: Check HTTP status of previous response (step source only)
  - `equals`/`notEquals`: Check for equality/inequality
  - `exists`: Check if field exists
  - `greaterThan`/`lessThan`: Numeric comparisons (supports integers and floats)
  - `greaterThanOrEqual`/`lessThanOrEqual`: Numeric comparisons with equality
- **Variable substitution in conditions**: All condition values support variable substitution
  - Global variables: `{{ .vars.key }}`
  - User input: `{{ .input.key }}`
  - Response references: `{{ .responses.nodeId.field }}`
  - Dynamic placeholders: `{{ $timestamp }}`, `{{ $guid }}`
  - Example: `"equals": "{{ .vars.expectedValue }}"`
- **Example**: Execute step only if user ID equals 1 AND user is active:
  ```json
  "conditions": [
    {"node": "get-user", "field": ".id", "equals": "1"},
    {"node": "get-user", "field": ".active", "equals": "true"}
  ]
  ```
- Skipped steps maintain array indexing (stored as empty responses)

**Validation:**
- **Unified validations array** - All validations (httpStatusCode + jsonpath) in one array
- **HTTP Status Code validation**: `{"httpStatusCode": 200}`
  - Validates HTTP response status code
  - If no httpStatusCode validation defined, defaults to 200
  - Can be set globally in `defaults.validations`
  - Example: `{"httpStatusCode": 201}`
- **JSON path validations**: Validate response body fields
  - Each validation must have `jsonpath` field
  - Optional criteria:
    - `exists`: true/false - check if field exists
    - `equals`: expected value - check for equality
    - `notEquals`: unwanted value - check for inequality
    - `greaterThan`: number - check if value is greater than threshold
    - `lessThan`: number - check if value is less than threshold
    - `greaterThanOrEqual`: number - check if value is >= threshold
    - `lessThanOrEqual`: number - check if value is <= threshold
  - Multiple validation criteria can be combined on the same path
  - If no criteria specified, defaults to checking that field exists
  - Numeric comparisons support integers and floats
- **Default validations**: Define in `defaults.validations` to apply to all steps
  - Steps without validations inherit default validations
  - Steps with validations override defaults completely
- **Example:**
    ```json
    {
      "defaults": {
        "validations": [
          { "httpStatusCode": 200 }
        ]
      },
      "nodes": [
        {
          "id": "create-user",
          "name": "Create user",
          "method": "POST",
          "url": "/users",
          "validations": [
            { "httpStatusCode": 201 },
            { "jsonpath": ".id", "exists": true, "greaterThan": 0 },
            { "jsonpath": ".email", "notEquals": "" },
            { "jsonpath": ".age", "greaterThanOrEqual": 18, "lessThanOrEqual": 120 }
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
- Step property: `userPrompts` - object with key-value pairs (variable name: prompt message)
- Values accessible via `{{ .input.variableName }}` syntax
- Example:
  ```json
  {
    "name": "Login with credentials",
    "method": "POST",
    "url": "/login",
    "userPrompts": {
      "username": "Enter your username:",
      "password": "Enter your password:"
    },
    "body": {
      "user": "{{ .input.username }}",
      "pass": "{{ .input.password }}"
    }
  }
  ```
- User input is reset for each step that uses userPrompts
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

**Performance Timing Logs:**
- Optional performance profiling to identify bottlenecks
- Enable by setting `ENABLE_TIMING=true` at the top of `flowsphere` (line 165)
- Disabled by default for clean output
- Shows millisecond-level timing for each operation:
  - `merge_with_defaults` - Merging step config with defaults
  - `extract step details` - Parsing step configuration
  - `replace_dynamic_placeholders` - Replacing {{$guid}} and {{$timestamp}}
  - `substitute_variables` - Variable substitution
  - `process headers` - Header processing and substitution
  - `process body` - Body processing and substitution
  - `build log entry` - Building execution log entry
  - `validations` - Running all validations
  - `TOTAL step time` - Complete step execution time with API vs overhead breakdown
- Timing output goes to stderr, can be filtered with `grep TIMING`
- Useful for optimization work and understanding where time is spent
- Example: `ENABLE_TIMING=true ./flowsphere config.json 2>&1 | grep TIMING`

## Visual Config Editor

**config-editor/** provides a browser-based GUI for creating and editing configuration files without manually writing JSON.

The editor has a modular structure with separate HTML, CSS, and JavaScript files organized by functionality. See `config-editor/README.md` for detailed module documentation.

**IMPORTANT - Backup File:**
- **config-editor-backup/config-editor.html** contains the old monolithic version
- **DO NOT update the backup file with new features**
- The backup exists only for reference/recovery purposes
- All new development should be done in the modular `config-editor/` folder

**Key Features:**
- Form-based editing with validation
- Auto-save to browser localStorage (never lose work)
- Live JSON preview with copy-to-clipboard
- Template-based config creation (Empty, Simple, OAuth, User Input)
- Download configs as JSON files
- Modular architecture for maintainability

**Intelligent Autocomplete:**
The editor includes context-aware autocomplete for the `{{ }}` variable substitution syntax:

- **Trigger**: Type `{{` in any text input or textarea
- **Suggestions shown**:
  - **Basic Syntax** (when you first type `{{`):
    - `$guid` - Generate unique UUID
    - `$timestamp` - Current Unix timestamp
    - `.responses.` - Access response by step ID
    - `.vars.` - Access global variables
    - `.input.` - Access user input prompts
  - **Global Variables**: Shows all variables defined in the `variables` section with their values
  - **Response References**: Shows available responses from previous steps by step ID
  - **User Input**: Shows prompt variables defined in the current step
- **Features**:
  - Positions dropdown at text caret for accurate placement
  - Filters suggestions as you type
  - Keyboard navigation: Arrow keys, Enter/Tab to select, Escape to close
  - Mouse selection: Click any suggestion
  - Works in all text fields: URLs, headers, body, conditions array, validations, modals

**Implementation details:**
- Uses mirror div technique for accurate caret positioning in textareas
- Handles horizontal/vertical scrolling correctly
- Accounts for all CSS properties affecting text layout
- Browser-specific handling (Firefox, Chrome, Safari)

**When to use:**
- Creating new configs without writing JSON manually
- Editing existing configs with visual feedback
- Learning the config format through form-based UI
- Quick testing of different configurations

## Postman Integration

**Convert Postman collections to config files:**
```bash
node postman-tools/parse-postman.js
```

**Parser capabilities:**
- Reads from `Postman/Onboarding Chatbot 2025.postman_collection.json`
- Resolves environment variables from `Postman/OnboardingApi.postman_environment.json`
- Sorts requests by numeric prefixes (1., 2., 3., etc.)
- Auto-detects dependencies between requests
- Auto-wires dependencies using `{{ .responses.stepId.field }}` syntax
- Handles Postman dynamic variables (`{{$guid}}`, `{{$timestamp}}`)
- Generates optimized config with defaults section
- Outputs to `scenarios/config-onboarding.json`

## Development Guidelines

**IMPORTANT - Git Workflow:**
- **NEVER commit changes without explicit user approval**
- **NEVER commit if the user has not tested the changes**
- Always wait for the user to test and verify changes before committing
- Only create commits when the user explicitly asks (e.g., "commit it", "commit this", "commit the changes")

**When modifying the script:**
- Maintain POSIX compliance for cross-platform compatibility (Windows/macOS/Linux)
- Always quote variables to handle spaces and special characters
- Use `set -euo pipefail` for strict error handling
- Temp files are stored in `$TEMP_DIR` (cleaned up automatically via trap)

**Testing changes:**
- Test with `examples/config-simple.json` (uses public JSONPlaceholder API)
- Verify conditional execution with steps that have conditions arrays
- Test variable substitution across multiple steps
- Check error handling by introducing invalid expectations

**Config file design:**
- Use `defaults` section to reduce duplication (baseUrl, timeout, common headers, default validations)
- Relative URLs (starting with `/`) are automatically prepended with baseUrl
- Step-level configs override defaults (headers are merged, timeout/validations override)
- Default validations apply to steps without validations; steps with validations override defaults completely
- Conditional steps reference only completed steps (step 3 can check responses 0, 1, or 2)
- All steps must have a unique `id` field for named references
- each time you implement a feature/bug fix dont automatically update documentation. Ask me first
- you should not create documentation files for bug fixes u make, unless i tell to do so.
- dont open a browser each time you make a change to the ui, instruct the user to refresh the page and provide them with a lclickable link
- when i ask you to commit, only commit changes you have made (even in a file) as files might be edited externally. Always be cautious not to commit something you havent written.