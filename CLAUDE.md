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

**Prerequisites:**
- bash (4.0+)
- curl
- jq

## Architecture

### Core Components

**apiseq.sh** (main script):
- Entry point: `main()` function parses config and orchestrates execution
- `execute_step()`: Executes individual HTTP requests with curl
- `substitute_variables()`: Template engine that replaces `{{ .responses[N].field }}` placeholders with values from previous responses
- `evaluate_condition()`: Conditional execution logic (skip steps based on previous response status/fields)
- `merge_with_defaults()`: Merges step config with global defaults for baseUrl, headers, and expect values
- Response storage: Arrays `responses_json[]` and `responses_status[]` maintain state across steps

**Config File Format:**
```json
{
  "defaults": {
    "baseUrl": "https://api.example.com",
    "headers": { "Content-Type": "application/json" },
    "expect": { "status": 200 }
  },
  "steps": [
    {
      "name": "Step description",
      "method": "GET|POST|PUT|DELETE|PATCH",
      "url": "/endpoint",           // Can be relative if baseUrl is set
      "headers": {},                 // Merged with defaults
      "body": {},                    // Optional request payload
      "condition": {},               // Optional conditional execution
      "expect": {}                   // Validation rules
    }
  ]
}
```

### Key Features

**Dynamic Value Substitution:**
- Syntax: `{{ .responses[N].field.subfield }}`
- Zero-based indexing: responses[0] = first step, responses[1] = second step
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
- Status code validation (`expect.status`, defaults to 200)
- JSON path extraction (`expect.jsonpath`)
- Value equality checks (`expect.equals`)
- Value inequality checks (`expect.notEquals`)
- Field existence checks (`expect.exists` - true/false)
- Multiple expect options can be combined in a single step
- Stops execution immediately on validation failure

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
- Use `defaults` section to reduce duplication (baseUrl, common headers, default status)
- Relative URLs (starting with `/`) are automatically prepended with baseUrl
- Step-level configs override defaults (headers are merged, expect values override)
- Conditional steps reference only completed steps (step 3 can check responses 0, 1, or 2)
