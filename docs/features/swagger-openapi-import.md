# Swagger/OpenAPI Import

**Status:** Planned

**Priority:** 3

## Overview

Add Swagger/OpenAPI file import capability to FlowSphere Studio for automatic config generation from API specifications.

## Benefits

- Import API specifications directly in the browser
- Automatically generate nodes from endpoints
- Extract request/response schemas and validation rules
- Reduce manual config creation time
- Keep configs in sync with API documentation

## Proposed UI

```
Import Config ▼
├── From Template (existing)
├── From Postman Collection (existing)
└── From Swagger/OpenAPI (NEW)
```

## Import Dialog Features

- File upload for Swagger/OpenAPI JSON/YAML files
- Preview discovered endpoints before import
- Checkbox selection for which endpoints to include
- Auto-generate node IDs from operation IDs or paths
- Extract base URL from server definitions
- Detect authentication schemes (Bearer, API Key, OAuth)
- Generate validations from response schemas

## User Workflow

1. Click "Import Config" → "From Swagger/OpenAPI"
2. Upload swagger.json or openapi.yaml file
3. Preview list of discovered endpoints with checkboxes
4. Select which endpoints to import
5. Click "Import Selected" to add nodes to config
6. Edit/customize generated nodes as needed

## Supported Formats

- Swagger 2.0 (JSON/YAML)
- OpenAPI 3.0+ (JSON/YAML)

## Key Features

### Endpoint Discovery
- Parse spec file and extract all endpoints
- Show operation ID, method, path, and description
- Group by tags (if available)

### Smart Config Generation
- Generate meaningful node IDs from operation IDs or paths
- Extract base URL from server definitions
- Detect authentication requirements
- Generate request bodies from schemas
- Generate validations from response schemas

### Validation Generation
- Extract status codes from responses
- Generate jsonpath validations from response schemas
- Map required fields to existence checks
- Map field types to appropriate validations

### Variable Extraction
- Detect path parameters
- Detect query parameters
- Detect authentication headers
- Convert to FlowSphere global variables syntax

## Implementation Phases

### Phase 1 - Basic Import
- Parse Swagger 2.0 JSON files
- Extract endpoints with method/path/description
- Generate basic nodes with request structure
- Preview before import

### Phase 2 - OpenAPI 3.0 Support
- Add OpenAPI 3.0+ parser
- Handle YAML format (requires YAML parser library)
- Support multiple servers/base URLs

### Phase 3 - Advanced Features
- Generate validations from response schemas
- Extract authentication schemes
- Handle path/query parameters as variables
- Request body generation from schemas

### Phase 4 - Smart Detection
- Detect common patterns (CRUD operations)
- Suggest node ordering based on dependencies
- Auto-generate meaningful node names
- Tag-based grouping

## Success Criteria

- Import common Swagger/OpenAPI specs successfully
- Generated configs are immediately usable
- Validation rules match API specification
- Variables are properly extracted and named
- User can customize before finalizing import
