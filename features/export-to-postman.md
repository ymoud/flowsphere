# Export to Postman Collection/Environment

**Status:** Planned

**Priority:** 5

## Overview

Add export capability to convert FlowSphere configs back into Postman collection and environment files for sharing with team members or using in Postman/Newman.

## Benefits

- Share FlowSphere configs with team members who use Postman
- Run FlowSphere sequences in Postman GUI for debugging
- Execute configs in CI/CD using Newman (Postman CLI)
- Collaborate with teams using different tools
- Preserve work when migrating between tools

## Proposed UI

```
Export Config ▼
├── Download JSON (existing)
├── Copy to Clipboard (existing)
└── Export to Postman (NEW)
    ├── Collection + Environment
    ├── Collection Only
    └── Environment Only
```

## Export Dialog Features

- Convert all nodes to Postman requests with proper structure
- Generate environment file from `variables` section
- Preserve request order and folder structure
- Map validations to Postman test scripts
- Convert conditions to pre-request scripts
- Handle variable substitution syntax translation
- Generate meaningful collection name and description

## Variable Conversion

### FlowSphere → Postman

| FlowSphere | Postman |
|------------|---------|
| `{{ .vars.apiKey }}` | `{{apiKey}}` (environment variable) |
| `{{ $guid }}` | `{{$guid}}` |
| `{{ $timestamp }}` | `{{$timestamp}}` |
| `{{ .responses.step1.token }}` | `{{step1_token}}` (set by test script) |
| `{{ .input.username }}` | `{{username}}` (environment variable) |

## Validation to Test Script Conversion

**FlowSphere validation:**
```json
{
  "validations": [
    { "httpStatusCode": 200 },
    { "jsonpath": ".token", "exists": true },
    { "jsonpath": ".userId", "greaterThan": 0 }
  ]
}
```

**Postman test script:**
```javascript
// HTTP Status validation
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

// Field existence validation
pm.test("Response has token field", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.token).to.exist;
});

// Numeric comparison validation
pm.test("userId is greater than 0", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.userId).to.be.above(0);
});

// Save response fields for next request
pm.environment.set("currentStep_token", pm.response.json().token);
pm.environment.set("currentStep_userId", pm.response.json().userId);
```

## Condition to Pre-request Script Conversion

**FlowSphere condition:**
```json
{
  "conditions": [
    { "node": "login", "field": ".isAdmin", "equals": "true" }
  ]
}
```

**Postman pre-request script:**
```javascript
// Check condition before executing request
if (pm.environment.get("login_isAdmin") !== "true") {
    // Skip this request by setting a flag
    pm.environment.set("skipCurrentRequest", "true");
}
```

## Export Options

- **Collection Name**: Auto-generate or custom input
- **Environment Name**: Auto-generate or custom input
- **Include Folders**: Group related nodes into folders
- **Variable Scope**: Choose between environment vs collection variables
- **Test Scripts**: Include/exclude validation test scripts
- **Download Format**: Single ZIP with both files, or separate downloads

## User Workflow

1. Click "Export Config" → "Export to Postman"
2. Choose export type (Collection + Environment, Collection Only, etc.)
3. Customize collection/environment names
4. Select export options (folders, test scripts, etc.)
5. Preview generated Postman structure
6. Click "Export" to download files
7. Import into Postman and verify

## Generated Files

### Collection File
- All requests in order
- Folder structure (if enabled)
- Test scripts for validations
- Pre-request scripts for conditions
- Proper request format

### Environment File
- All global variables from `variables` section
- Placeholder values for user inputs
- Response variable placeholders (filled by test scripts)

### README File
- Notes about variable dependencies
- Execution order instructions
- Manual steps required (if any)
- Version compatibility information

## Implementation Phases

### Phase 1 - Basic Export
- Convert nodes to Postman requests
- Generate environment file from variables
- Download collection + environment JSON files

### Phase 2 - Test Scripts
- Map validations to Postman test scripts
- Generate response variable saving logic
- Handle different validation types

### Phase 3 - Pre-request Scripts
- Convert conditions to pre-request scripts
- Handle multiple conditions with AND logic
- Skip logic implementation

### Phase 4 - Advanced Features
- Folder structure support
- Variable scope options
- Custom naming and descriptions
- ZIP download option

### Phase 5 - Preview & Customization
- Preview generated collection structure
- Edit before export
- Validation of generated scripts
- Export verification

## Success Criteria

- Exported collections work in Postman without modification
- Validations execute correctly as test scripts
- Conditions skip requests appropriately
- Variables are properly resolved
- Environment files contain all necessary variables
- Documentation is clear and helpful
