# Postman to Config Parser

This folder contains tools to convert Postman collections into configuration files for the HTTP sequence runner.

## Files

- **parse-postman-minified.js** - ⭐ Recommended: Generates minified configs with defaults section
- **parse-postman-enhanced.js** - Legacy: Generates full configs without minification

## Usage

### Recommended: Minified Parser

```bash
node postman-tools/parse-postman-minified.js
```

This generates a compact configuration with a `defaults` section to reduce duplication.

### Legacy: Enhanced Parser

```bash
node postman-tools/parse-postman-enhanced.js
```

This generates a traditional full configuration without defaults.

## What the Parser Does

1. Reads the Postman collection from `Postman/Onboarding Chatbot 2025.postman_collection.json`
2. Reads environment variables from `Postman/OnboardingApi.postman_environment.json`
3. Extracts all requests in order (based on numeric prefixes: `1.`, `2.`, etc.)
4. Substitutes environment variables (`{{variable}}`)
5. Detects dependencies between requests
6. Auto-wires dependencies using `{{ .responses[N].field }}` syntax
7. Extracts common patterns into defaults section (minified parser only)
8. Generates `config-onboarding.json` in the root directory

## Features

- **Order Handling**: Automatically sorts requests by folder and request numeric prefixes
- **Environment Resolution**: Replaces `{{variable}}` with actual values from environment file
- **Dependency Detection**: Analyzes request bodies and headers to detect when a request uses data from a previous response
- **Auto-wiring**: Automatically converts dependencies to the format `{{ .responses[N].field }}`
- **Postman Dynamic Variables**: Handles `{{$guid}}`, `{{$timestamp}}`, etc.
- **Defaults Extraction** (minified only): Extracts common baseUrl, headers, and expect values to reduce file size

## Output Structure

The minified parser generates a config with defaults:

```json
{
  "defaults": {
    "baseUrl": "https://api.example.com",
    "headers": {
      "Content-Type": "application/json"
    },
    "expect": {
      "status": 200
    }
  },
  "steps": [
    {
      "name": "Request name",
      "method": "POST",
      "url": "/endpoint",
      "headers": {
        "X-Custom-Header": "value"
      },
      "body": { ... },
      "expect": {
        "jsonpath": ".fieldName"
      }
    }
  ]
}
```

Benefits:
- URLs are relative to baseUrl (shorter)
- Common headers only specified once (in defaults)
- Default status 200 omitted from steps (cleaner)
- ~0.2% size reduction on large configs
