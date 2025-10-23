# Postman to Config Parser

This folder contains a tool to convert Postman collections into optimized configuration files for the HTTP sequence runner.

## Files

- **parse-postman.js** - Unified parser that generates optimized configs with defaults section

## Usage

```bash
node postman-tools/parse-postman.js
```

This generates a compact configuration with a `defaults` section to reduce duplication and file size.

## What the Parser Does

1. Reads the Postman collection from `Postman/Onboarding Chatbot 2025.postman_collection.json`
2. Reads environment variables from `Postman/OnboardingApi.postman_environment.json`
3. Extracts all requests in order (based on numeric prefixes: `1.`, `2.`, etc.)
4. Auto-generates unique `id` fields for each step (camelCase from step name)
5. Substitutes environment variables (`{{variable}}`)
6. Detects dependencies between requests
7. Auto-wires dependencies using named references `{{ .responses.stepId.field }}`
8. Extracts common patterns into defaults section (baseUrl, headers, validations)
9. Generates optimized `config-onboarding.json` in the root directory

## Features

- **Order Handling**: Automatically sorts requests by folder and request numeric prefixes
- **ID Generation**: Auto-generates unique camelCase IDs from step names
- **Environment Resolution**: Replaces `{{variable}}` with actual values from environment file
- **Dependency Detection**: Analyzes request bodies and headers to detect when a request uses data from a previous response
- **Named References**: Automatically converts dependencies to the format `{{ .responses.stepId.field }}`
- **Postman Dynamic Variables**: Handles `{{$guid}}`, `{{$timestamp}}`, etc.
- **Defaults Extraction**: Extracts common baseUrl, headers, timeout, and validations to reduce file size
- **Size Optimization**: Typically achieves 30-40% size reduction compared to full configs

## Output Structure

The parser generates an optimized config with defaults:

```json
{
  "enableDebug": false,
  "defaults": {
    "baseUrl": "https://api.example.com",
    "timeout": 10,
    "headers": {
      "Content-Type": "application/json"
    },
    "validations": [
      { "status": 200 }
    ]
  },
  "steps": [
    {
      "id": "requestName",
      "name": "Request name",
      "method": "POST",
      "url": "/endpoint",
      "headers": {
        "X-Custom-Header": "value"
      },
      "body": {
        "userId": "{{ .responses.getToken.access_token }}"
      },
      "validations": [
        { "jsonpath": ".fieldName", "exists": true }
      ]
    }
  ]
}
```

Benefits:
- Each step has a unique `id` for named references
- URLs are relative to baseUrl (shorter, cleaner)
- Common headers only specified once (in defaults)
- Default timeout and validations omitted from steps (cleaner)
- Named references make dependencies easier to understand
- Typically 30-40% size reduction on large configs
