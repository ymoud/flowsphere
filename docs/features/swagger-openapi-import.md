# Swagger/OpenAPI Import

**Status:** Planned

**Priority:** 4

## Overview

Add Swagger/OpenAPI file import capability to FlowSphere Studio for automatic config generation from API specifications. Similar to the existing Postman import feature, this will allow users to upload Swagger/OpenAPI files (JSON or YAML) and preview the generated FlowSphere configuration before importing.

## Benefits

- Import API specifications directly in the browser
- Automatically generate nodes from endpoints with proper method/URL/body
- Extract request/response schemas and generate validation rules
- Convert authentication schemes to FlowSphere headers
- Detect path/query parameters and convert to variables
- Reduce manual config creation time (especially for large APIs)
- Keep configs in sync with API documentation
- Preview before import with full control over what gets imported

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

---

## Detailed Implementation Guide

### Transformation Examples

#### Example 1: Simple GET Endpoint

**Swagger 2.0 Input:**
```json
{
  "paths": {
    "/users/{userId}": {
      "get": {
        "operationId": "getUser",
        "summary": "Get user by ID",
        "parameters": [
          {
            "name": "userId",
            "in": "path",
            "required": true,
            "type": "string"
          }
        ],
        "responses": {
          "200": {
            "description": "User found",
            "schema": {
              "type": "object",
              "required": ["id", "email"],
              "properties": {
                "id": { "type": "string" },
                "email": { "type": "string" },
                "age": {
                  "type": "integer",
                  "minimum": 18,
                  "maximum": 120
                }
              }
            }
          }
        }
      }
    }
  }
}
```

**FlowSphere Output:**
```json
{
  "variables": {
    "userId": "12345"
  },
  "defaults": {
    "baseUrl": "https://api.example.com",
    "timeout": 10,
    "headers": { "Content-Type": "application/json" },
    "validations": [{ "httpStatusCode": 200 }]
  },
  "nodes": [
    {
      "id": "get-user",
      "name": "Get user by ID",
      "method": "GET",
      "url": "/users/{{ .vars.userId }}",
      "validations": [
        { "httpStatusCode": 200 },
        { "jsonpath": ".id", "exists": true },
        { "jsonpath": ".email", "exists": true },
        { "jsonpath": ".age", "greaterThanOrEqual": 18, "lessThanOrEqual": 120 }
      ]
    }
  ],
  "responseSchemas": {
    "get-user": {
      "nodeId": "get-user",
      "nodeName": "Get user by ID",
      "method": "GET",
      "url": "/users/{{ .vars.userId }}",
      "schema": {
        "type": "object",
        "required": ["id", "email"],
        "properties": {
          "id": { "type": "string" },
          "email": { "type": "string" },
          "age": {
            "type": "integer",
            "minimum": 18,
            "maximum": 120
          }
        }
      },
      "timestamp": "2025-11-12T10:30:00.000Z"
    }
  }
}
```

**Transformation Logic:**
1. **operationId** → Node ID (converted to kebab-case: `getUser` → `get-user`)
2. **Path parameter** `{userId}` → Variable `{{ .vars.userId }}` + added to `variables` section
3. **Response schema** → Two outputs:
   - **Validations** (in `nodes[].validations`):
     - `required: ["id", "email"]` → `{ "jsonpath": ".id", "exists": true }`
     - `minimum: 18, maximum: 120` → `{ "greaterThanOrEqual": 18, "lessThanOrEqual": 120 }`
   - **Schema** (in `responseSchemas["get-user"]`): Full schema stored for autocomplete

---

#### Example 2: POST Endpoint with Request Body

**Swagger 2.0 Input:**
```json
{
  "paths": {
    "/users": {
      "post": {
        "operationId": "createUser",
        "summary": "Create new user",
        "parameters": [
          {
            "name": "body",
            "in": "body",
            "required": true,
            "schema": {
              "type": "object",
              "required": ["email", "password"],
              "properties": {
                "email": { "type": "string" },
                "password": { "type": "string" },
                "name": { "type": "string" }
              }
            }
          }
        ],
        "responses": {
          "201": {
            "description": "User created",
            "schema": {
              "type": "object",
              "properties": {
                "id": { "type": "string" },
                "email": { "type": "string" }
              }
            }
          }
        }
      }
    }
  }
}
```

**FlowSphere Output (Node):**
```json
{
  "nodes": [
    {
      "id": "create-user",
      "name": "Create new user",
      "method": "POST",
      "url": "/users",
      "body": {
        "email": "user@example.com",
        "password": "changeme",
        "name": "John Doe"
      },
      "validations": [
        { "httpStatusCode": 201 },
        { "jsonpath": ".id", "exists": true },
        { "jsonpath": ".email", "exists": true }
      ]
    }
  ],
  "responseSchemas": {
    "create-user": {
      "nodeId": "create-user",
      "nodeName": "Create new user",
      "method": "POST",
      "url": "/users",
      "schema": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "email": { "type": "string" }
        }
      },
      "timestamp": "2025-11-12T10:30:00.000Z"
    }
  }
}
```

**Transformation Logic:**
1. **Request body schema** → Sample body with placeholder values:
   - `string` type → Use field name as placeholder (e.g., `"email": "user@example.com"`)
   - Required fields are included
   - Optional fields are also included with placeholders
2. **201 response** → `{ "httpStatusCode": 201 }` validation
3. **Response schema** → Two outputs:
   - **Validations**: Existence checks for `id` and `email`
   - **Schema**: Full response schema stored in `responseSchemas["create-user"]`

---

### Authentication Conversion

Swagger/OpenAPI supports multiple authentication schemes in `securityDefinitions` (Swagger 2.0) or `components.securitySchemes` (OpenAPI 3.0). Here's how to convert them to FlowSphere headers:

#### Basic Authentication

**Swagger 2.0:**
```json
{
  "securityDefinitions": {
    "basicAuth": {
      "type": "basic"
    }
  },
  "security": [{ "basicAuth": [] }]
}
```

**FlowSphere Output:**
```json
{
  "variables": {
    "username": "admin",
    "password": "password"
  },
  "defaults": {
    "headers": {
      "Authorization": "Basic {{ .vars.username }}:{{ .vars.password }}"
    }
  }
}
```

**Note:** FlowSphere doesn't currently support base64 encoding in variable substitution, so we'll need to either:
- Add `username` and `password` to variables and document manual encoding
- OR encode at import time if static values are available

#### Bearer Token

**Swagger 2.0:**
```json
{
  "securityDefinitions": {
    "bearerAuth": {
      "type": "apiKey",
      "name": "Authorization",
      "in": "header"
    }
  }
}
```

**FlowSphere Output:**
```json
{
  "variables": {
    "authToken": "your-token-here"
  },
  "defaults": {
    "headers": {
      "Authorization": "Bearer {{ .vars.authToken }}"
    }
  }
}
```

#### API Key (Header)

**Swagger 2.0:**
```json
{
  "securityDefinitions": {
    "apiKey": {
      "type": "apiKey",
      "name": "X-API-Key",
      "in": "header"
    }
  }
}
```

**FlowSphere Output:**
```json
{
  "variables": {
    "apiKey": "your-api-key"
  },
  "defaults": {
    "headers": {
      "X-API-Key": "{{ .vars.apiKey }}"
    }
  }
}
```

#### API Key (Query Parameter)

**Swagger 2.0:**
```json
{
  "securityDefinitions": {
    "apiKey": {
      "type": "apiKey",
      "name": "api_key",
      "in": "query"
    }
  }
}
```

**FlowSphere Output:**
Query parameter API keys should be appended to all URLs:
```json
{
  "variables": {
    "apiKey": "your-api-key"
  },
  "nodes": [
    {
      "url": "/users?api_key={{ .vars.apiKey }}"
    }
  ]
}
```

**Implementation Note:** Detect if API key is in query vs header and handle accordingly.

---

### Schema-to-Validation Mapping Rules

| Swagger Schema Property | FlowSphere Validation | Example |
|-------------------------|----------------------|---------|
| `required: ["field"]` | `{ "jsonpath": ".field", "exists": true }` | User must have `id` field |
| `type: "integer", minimum: 1` | `{ "jsonpath": ".field", "greaterThanOrEqual": 1 }` | Age must be ≥ 1 |
| `type: "integer", maximum: 100` | `{ "jsonpath": ".field", "lessThanOrEqual": 100 }` | Score must be ≤ 100 |
| `type: "integer", minimum: 18, maximum: 120` | `{ "jsonpath": ".field", "greaterThanOrEqual": 18, "lessThanOrEqual": 120 }` | Age between 18-120 |
| `enum: ["active", "inactive"]` | `{ "jsonpath": ".field", "exists": true }` | Status exists (enum validation not yet supported) |
| `type: "string", minLength: 3` | `{ "jsonpath": ".field", "exists": true }` | Field exists (string length not yet supported) |
| `type: "array"` | `{ "jsonpath": ".field", "exists": true }` | Array exists (array validations limited) |
| `properties: { "nested": {...} }` | `{ "jsonpath": ".field.nested", "exists": true }` | Nested field exists |

**Priority Fields for Validation:**
When generating validations, prioritize these common fields (similar to Postman import):
1. `id`, `userId`, `sessionId`, `verificationId`
2. `token`, `accessToken`, `access_token`, `authToken`
3. `email`, `username`, `name`
4. `success`, `status`, `message`
5. `data`, `result`, `payload`

**Validation Generation Strategy:**
- Always validate HTTP status code from `responses` object
- Add existence checks for all `required` fields
- Add numeric range validations for integer/number fields with `minimum`/`maximum`
- Limit to 5-7 validations per node to avoid clutter
- Focus on fields that are likely to be used in subsequent steps

---

### Response Schema Processing & Storage

**Important:** FlowSphere configs do **NOT** store original response schemas. The parser reads schemas from Swagger/OpenAPI and **converts them to validations**, then discards the schema.

#### Schema Parsing Algorithm

```javascript
/**
 * Extract validations from response schema
 * @param {Object} schema - Swagger/OpenAPI response schema
 * @param {String} basePath - JSONPath prefix (e.g., "" or ".data")
 * @param {Number} depth - Current traversal depth (limit to 2-3 levels)
 * @returns {Array} Array of validation objects
 */
function extractValidationsFromSchema(schema, basePath = '', depth = 0) {
    const validations = [];
    const MAX_DEPTH = 3; // Prevent deep nesting

    if (depth > MAX_DEPTH || !schema || typeof schema !== 'object') {
        return validations;
    }

    // Handle schema references ($ref)
    if (schema.$ref) {
        schema = resolveSchemaRef(schema.$ref);
    }

    // Handle object schemas
    if (schema.type === 'object' && schema.properties) {
        const required = schema.required || [];

        // Process required fields first (higher priority)
        required.forEach(fieldName => {
            const fieldSchema = schema.properties[fieldName];
            const fieldPath = basePath ? `${basePath}.${fieldName}` : `.${fieldName}`;

            // Add existence validation
            validations.push({
                jsonpath: fieldPath,
                exists: true
            });

            // Add type-specific validations
            const typeValidations = extractTypeValidations(fieldSchema, fieldPath);
            validations.push(...typeValidations);

            // Recurse for nested objects
            if (fieldSchema.type === 'object') {
                const nestedValidations = extractValidationsFromSchema(
                    fieldSchema,
                    fieldPath,
                    depth + 1
                );
                validations.push(...nestedValidations);
            }
        });

        // Process non-required priority fields
        const priorityFields = ['id', 'userId', 'token', 'accessToken', 'email'];
        Object.keys(schema.properties).forEach(fieldName => {
            if (!required.includes(fieldName) && priorityFields.includes(fieldName)) {
                const fieldPath = basePath ? `${basePath}.${fieldName}` : `.${fieldName}`;
                validations.push({
                    jsonpath: fieldPath,
                    exists: true
                });
            }
        });
    }

    return validations;
}

/**
 * Extract type-specific validations (min/max, enums, etc.)
 */
function extractTypeValidations(schema, fieldPath) {
    const validations = [];

    if (!schema) return validations;

    // Integer/number range validations
    if (schema.type === 'integer' || schema.type === 'number') {
        const validation = { jsonpath: fieldPath };

        if (schema.minimum !== undefined) {
            validation.greaterThanOrEqual = schema.minimum;
        }
        if (schema.maximum !== undefined) {
            validation.lessThanOrEqual = schema.maximum;
        }

        // Only add if we have min/max constraints
        if (validation.greaterThanOrEqual !== undefined ||
            validation.lessThanOrEqual !== undefined) {
            validations.push(validation);
        }
    }

    // String validations (limited support)
    if (schema.type === 'string') {
        // We could add pattern/format validations in the future
        // For now, existence check is added by parent function
    }

    // Enum validations (not yet supported in FlowSphere)
    if (schema.enum) {
        // Log or warn that enum validation is not supported
        console.warn(`Enum validation not yet supported for ${fieldPath}`);
    }

    return validations;
}

/**
 * Resolve $ref references to actual schema objects
 * Handles Swagger 2.0 (#/definitions/Model) and OpenAPI 3.0 (#/components/schemas/Model)
 */
function resolveSchemaRef(ref) {
    // ref format: "#/definitions/User" or "#/components/schemas/User"
    const parts = ref.split('/');
    let schema = swaggerSpec; // Reference to the full spec

    // Traverse the reference path
    for (let i = 1; i < parts.length; i++) {
        schema = schema[parts[i]];
        if (!schema) {
            console.warn(`Could not resolve schema reference: ${ref}`);
            return {};
        }
    }

    return schema;
}

/**
 * Build responseSchemas object for autocomplete enhancement
 * @param {Array} nodes - Parsed nodes array
 * @param {Object} swaggerSpec - Original Swagger/OpenAPI spec
 * @returns {Object} responseSchemas object keyed by nodeId
 */
function buildResponseSchemas(nodes, swaggerSpec) {
    const responseSchemas = {};

    nodes.forEach(node => {
        // Find the endpoint in Swagger spec
        const endpoint = findEndpointInSpec(swaggerSpec, node.method, node.url);
        if (!endpoint || !endpoint.responses) return;

        // Get the success response schema (200, 201, etc.)
        const successResponse = endpoint.responses['200'] ||
                                endpoint.responses['201'] ||
                                endpoint.responses['202'];

        if (!successResponse) return;

        // Extract schema (different structure for Swagger 2.0 vs OpenAPI 3.0)
        let schema;
        if (successResponse.schema) {
            // Swagger 2.0
            schema = successResponse.schema;
        } else if (successResponse.content && successResponse.content['application/json']) {
            // OpenAPI 3.0
            schema = successResponse.content['application/json'].schema;
        }

        if (!schema) return;

        // Resolve $ref if present
        if (schema.$ref) {
            schema = resolveSchemaRef(schema.$ref);
        }

        // Store in responseSchemas
        responseSchemas[node.id] = {
            nodeId: node.id,
            nodeName: node.name,
            method: node.method,
            url: node.url,
            schema: schema,
            timestamp: new Date().toISOString()
        };
    });

    return responseSchemas;
}

/**
 * Find endpoint definition in Swagger spec by method and URL
 */
function findEndpointInSpec(spec, method, url) {
    // Convert FlowSphere URL back to Swagger path format
    // "/users/{{ .vars.userId }}" -> "/users/{userId}"
    const swaggerPath = url.replace(/\{\{\s*\.vars\.(\w+)\s*\}\}/g, '{$1}');

    if (spec.paths && spec.paths[swaggerPath]) {
        return spec.paths[swaggerPath][method.toLowerCase()];
    }

    return null;
}
```

#### Schema Storage Decision: STORE IN `responseSchemas`

**Important:** FlowSphere configs **DO** support storing response schemas in a dedicated `responseSchemas` section at the root level for **autocomplete enhancement**.

**Storage Structure:**
```json
{
  "nodes": [ /* ... */ ],
  "responseSchemas": {
    "node-id": {
      "nodeId": "node-id",
      "nodeName": "Get User",
      "method": "GET",
      "url": "/users/{userId}",
      "schema": {
        "type": "object",
        "properties": {
          "id": { "type": "number" },
          "email": { "type": "string" },
          "name": { "type": "string" }
        }
      },
      "timestamp": "2025-11-11T22:47:17.652Z"
    }
  }
}
```

**Rationale for Storing Schemas:**
1. **Autocomplete Enhancement** - Studio can suggest available fields when typing `{{ .responses.node-id.`
2. **Documentation** - Provides inline reference for response structure
3. **Validation** - Helps users understand what fields are available for conditions/substitutions
4. **Timestamp Tracking** - Metadata helps track when schema was captured/imported

**What we DO store:**
- ✅ **Validations** derived from schema (in `node.validations` array)
- ✅ **Response schemas** in `responseSchemas` object (for autocomplete)
- ✅ HTTP status codes from responses (in validations)
- ✅ Node metadata (nodeId, nodeName, method, url)
- ✅ Import timestamp

**What we DON'T store:**
- ❌ Schema `$ref` mappings (resolved before storage)
- ❌ Swagger `definitions` or `components.schemas` sections (only per-endpoint schemas)
- ❌ Request body schemas (only response schemas)

#### Example: Schema Processing Flow

**Swagger Response Schema:**
```json
{
  "responses": {
    "200": {
      "description": "Success",
      "schema": {
        "type": "object",
        "required": ["id", "email"],
        "properties": {
          "id": {
            "type": "integer",
            "minimum": 1
          },
          "email": {
            "type": "string",
            "format": "email"
          },
          "profile": {
            "type": "object",
            "properties": {
              "age": {
                "type": "integer",
                "minimum": 18,
                "maximum": 120
              }
            }
          }
        }
      }
    }
  }
}
```

**Processing Steps:**
1. Parser calls `extractValidationsFromSchema(schema, '', 0)`
2. Detects `type: object`, processes `required: ["id", "email"]`
3. For `id` field:
   - Adds `{ jsonpath: ".id", exists: true }`
   - Detects `type: integer, minimum: 1`
   - Adds `{ jsonpath: ".id", greaterThanOrEqual: 1 }`
4. For `email` field:
   - Adds `{ jsonpath: ".email", exists: true }`
   - Note: `format: "email"` is ignored (not supported)
5. For `profile.age` nested field:
   - Recurses into nested object (depth = 1)
   - Adds `{ jsonpath: ".profile.age", greaterThanOrEqual: 18, lessThanOrEqual: 120 }`
6. Returns array of 4 validations

**Generated FlowSphere Config:**
```json
{
  "nodes": [
    {
      "id": "get-user",
      "name": "Get User",
      "method": "GET",
      "url": "/users/{userId}",
      "validations": [
        { "httpStatusCode": 200 },
        { "jsonpath": ".id", "exists": true },
        { "jsonpath": ".id", "greaterThanOrEqual": 1 },
        { "jsonpath": ".email", "exists": true },
        { "jsonpath": ".profile.age", "greaterThanOrEqual": 18, "lessThanOrEqual": 120 }
      ]
    }
  ],
  "responseSchemas": {
    "get-user": {
      "nodeId": "get-user",
      "nodeName": "Get User",
      "method": "GET",
      "url": "/users/{userId}",
      "schema": {
        "type": "object",
        "required": ["id", "email"],
        "properties": {
          "id": {
            "type": "integer",
            "minimum": 1
          },
          "email": {
            "type": "string",
            "format": "email"
          },
          "profile": {
            "type": "object",
            "properties": {
              "age": {
                "type": "integer",
                "minimum": 18,
                "maximum": 120
              }
            }
          }
        }
      },
      "timestamp": "2025-11-12T10:30:00.000Z"
    }
  }
}
```

**Note:** Schema is stored in TWO places:
1. **As validations** in `nodes[].validations` array (executable checks)
2. **As schema** in `responseSchemas[nodeId]` object (for autocomplete/documentation)

#### Handling Schema References ($ref)

Swagger/OpenAPI specs use `$ref` to reference shared schema definitions:

**Swagger 2.0:**
```json
{
  "paths": {
    "/users/{id}": {
      "get": {
        "responses": {
          "200": {
            "schema": { "$ref": "#/definitions/User" }
          }
        }
      }
    }
  },
  "definitions": {
    "User": {
      "type": "object",
      "properties": {
        "id": { "type": "integer" },
        "name": { "type": "string" }
      }
    }
  }
}
```

**OpenAPI 3.0:**
```json
{
  "paths": {
    "/users/{id}": {
      "get": {
        "responses": {
          "200": {
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/User" }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "User": {
        "type": "object",
        "properties": {
          "id": { "type": "integer" },
          "name": { "type": "string" }
        }
      }
    }
  }
}
```

**Resolution Algorithm:**
1. Detect `$ref` in schema
2. Parse reference path: `#/definitions/User` → `["definitions", "User"]`
3. Traverse spec object: `spec.definitions.User`
4. Replace `$ref` with resolved schema
5. Continue processing

**Circular Reference Prevention:**
```javascript
const visitedRefs = new Set();

function resolveSchemaRef(ref) {
    if (visitedRefs.has(ref)) {
        console.warn(`Circular reference detected: ${ref}`);
        return {}; // Return empty schema to break cycle
    }

    visitedRefs.add(ref);

    // ... resolve logic ...

    return schema;
}
```

---

### Reusable Patterns from Postman Import

The Swagger import should follow the same architecture as the Postman import:

#### File Structure

```
studio/
├── js/
│   ├── swagger-parser.js      (NEW - parses Swagger/OpenAPI to config)
│   ├── swagger-preview.js     (NEW - preview modal UI logic)
│   ├── postman-parser.js      (EXISTING - reference implementation)
│   └── postman-preview.js     (EXISTING - reference implementation)
└── index.html                 (UPDATE - add Swagger import option)
```

#### Reusable Code Modules

1. **Node ID Generation** (from `postman-parser.js`):
```javascript
// Reuse this function - converts operationId to kebab-case
function generateNodeId(name, existingIds = []) {
    let id = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    if (id.length === 0) id = 'node';

    // Handle duplicates
    if (existingIds.includes(id)) {
        let counter = 2;
        while (existingIds.includes(`${id}-${counter}`)) {
            counter++;
        }
        id = `${id}-${counter}`;
    }

    return id;
}
```

2. **Preview Modal Pattern** (from `postman-preview.js`):
```javascript
// Reuse this pattern - create swaggerPreviewModal.html similar to postmanPreviewModal
function showSwaggerPreview(parsedConfig) {
    pendingSwaggerConfig = parsedConfig;

    populatePreviewSummary(parsedConfig);
    populatePreviewEndpoints(parsedConfig.nodes || []);
    populatePreviewVariables(parsedConfig.variables || {});
    populatePreviewAuth(parsedConfig.defaults?.headers || {});
    populatePreviewValidations(parsedConfig.nodes || []);

    const modalElement = document.getElementById('swaggerPreviewModal');
    previewModalInstance = new bootstrap.Modal(modalElement, {
        backdrop: 'static',
        keyboard: false
    });
    previewModalInstance.show();
}
```

3. **Modal HTML Structure** (similar to Postman preview):
```html
<!-- Add to studio/index.html -->
<div class="modal fade" id="swaggerPreviewModal">
  <div class="modal-dialog modal-lg">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Swagger/OpenAPI Import Preview</h5>
      </div>
      <div class="modal-body">
        <!-- Summary section -->
        <!-- Endpoints section (with checkboxes for selective import) -->
        <!-- Variables section -->
        <!-- Auth section -->
        <!-- Validations section -->
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="cancelSwaggerPreview()">Cancel</button>
        <button class="btn btn-primary" onclick="confirmSwaggerImport()">Import Configuration</button>
      </div>
    </div>
  </div>
</div>
```

4. **Import Dropdown Integration** (update in `studio/index.html`):
```html
<div class="dropdown-menu">
  <button class="dropdown-item" onclick="showNewConfigFromTemplate()">
    <i class="bi bi-file-earmark-plus"></i> From Template
  </button>
  <button class="dropdown-item" onclick="showImportFromPostman()">
    <i class="bi bi-upload"></i> From Postman Collection
  </button>
  <button class="dropdown-item" onclick="showImportFromSwagger()">
    <i class="bi bi-file-code"></i> From Swagger/OpenAPI
  </button>
</div>
```

---

### Path Parameter Handling

Path parameters in Swagger need special conversion:

**Swagger Path:**
```
/users/{userId}/posts/{postId}
```

**Conversion Steps:**
1. Extract parameter names: `userId`, `postId`
2. Add to `variables` section with placeholder values
3. Convert path to FlowSphere format: `/users/{{ .vars.userId }}/posts/{{ .vars.postId }}`

**Implementation:**
```javascript
function convertPathParameters(path, parameters) {
    const variables = {};
    let convertedPath = path;

    // Extract path parameters
    const pathParams = parameters.filter(p => p.in === 'path');

    pathParams.forEach(param => {
        const paramName = param.name;
        const placeholder = generatePlaceholder(param);

        // Add to variables
        variables[paramName] = placeholder;

        // Replace in path
        convertedPath = convertedPath.replace(
            `{${paramName}}`,
            `{{ .vars.${paramName} }}`
        );
    });

    return { path: convertedPath, variables };
}

function generatePlaceholder(parameter) {
    // Generate sensible placeholder based on parameter name
    if (parameter.name.includes('Id')) return '12345';
    if (parameter.type === 'integer') return 1;
    if (parameter.type === 'boolean') return true;
    return 'value';
}
```

---

### Query Parameter Handling

Query parameters can be handled in two ways:

**Option 1: Add to variables (recommended)**
```json
{
  "variables": {
    "limit": "10",
    "offset": "0"
  },
  "nodes": [{
    "url": "/users?limit={{ .vars.limit }}&offset={{ .vars.offset }}"
  }]
}
```

**Option 2: Use static values**
```json
{
  "nodes": [{
    "url": "/users?limit=10&offset=0"
  }]
}
```

**Implementation:** Use Option 1 for `required` query parameters, Option 2 for optional ones.

---

### Edge Cases & Limitations

#### Multiple Servers

**OpenAPI 3.0:**
```json
{
  "servers": [
    { "url": "https://api.dev.example.com", "description": "Development" },
    { "url": "https://api.example.com", "description": "Production" }
  ]
}
```

**Handling:**
- Use the first server URL as `baseUrl`
- OR prompt user to select which server to use
- OR add all servers to `variables` for easy switching

#### Complex Nested Schemas

For deeply nested objects, limit validation depth to 2-3 levels:

```json
{
  "response": {
    "data": {
      "user": {
        "profile": {
          "address": {
            "street": "..."
          }
        }
      }
    }
  }
}
```

**Validation:** Only validate up to `.data.user.profile` level, not deeper.

#### Circular References

Swagger specs can have circular references via `$ref`. Handle this by:
- Tracking visited schemas during traversal
- Stopping recursion when circular reference detected
- Logging warning for user

#### Unsupported Features

Document these limitations:
- OAuth2 flows: Detect but cannot auto-generate (requires manual flow setup)
- File uploads: Detect `multipart/form-data` but cannot auto-generate
- Webhooks/callbacks: OpenAPI 3.0 callbacks not supported
- Complex content types: Only support `application/json`

---

### YAML Support

For YAML file support, use `js-yaml` library:

```javascript
// Add to swagger-parser.js
function parseSwaggerFile(fileContent, fileType) {
    let spec;

    if (fileType === 'json' || fileType === 'application/json') {
        spec = JSON.parse(fileContent);
    } else if (fileType === 'yaml' || fileType === 'application/yaml') {
        // Use js-yaml library (add via CDN or npm)
        spec = jsyaml.load(fileContent);
    } else {
        throw new Error('Unsupported file type. Please upload JSON or YAML file.');
    }

    return spec;
}
```

**CDN Include (add to studio/index.html):**
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/js-yaml/4.1.0/js-yaml.min.js"></script>
```

---

## Comparison: Postman vs Swagger Import

| Feature | Postman Import | Swagger Import |
|---------|---------------|----------------|
| **Input Format** | Collection JSON (+ optional environment JSON) | Swagger 2.0 / OpenAPI 3.0 (JSON/YAML) |
| **Node Ordering** | Order of appearance or numeric prefixes | Document order or tags |
| **Auth Conversion** | ✅ Basic, Bearer, API Key | ✅ Basic, Bearer, API Key, OAuth (detected, not auto-generated) |
| **Validation Extraction** | ✅ From test scripts (`pm.expect`, `pm.response.to.have.status`) | ✅ From response schemas (required fields, min/max, types) |
| **Variable Detection** | ✅ From environment file | ✅ From path/query parameters, security schemes |
| **Request Body** | ✅ Exact body from request | ✅ Generated from schema with placeholders |
| **Dependency Detection** | ❌ Not implemented | ❌ Not planned for Phase 1-3 (future Phase 4) |
| **Preview Before Import** | ✅ Phase 3 | ✅ Planned for Phase 1 |

**When to use Swagger vs Postman:**
- **Use Swagger** when: You have API documentation and want to quickly scaffold a workflow
- **Use Postman** when: You have existing Postman collections with test scripts and examples
- **Use Both** when: Import Swagger for structure, then enhance with Postman test scripts

---

## Implementation Phases (Updated)

### Phase 1 - Basic Swagger 2.0 Import + Preview
**Goal:** Parse Swagger 2.0 JSON files and generate basic FlowSphere configs with preview

**Deliverables:**
- `swagger-parser.js` - Parse Swagger 2.0 JSON
- `swagger-preview.js` - Preview modal UI
- Extract endpoints with method/path/summary
- Generate node IDs from operationId (kebab-case)
- Extract baseUrl from `host` + `basePath`
- Convert path parameters to variables
- Generate basic validations from response status codes
- **Generate `responseSchemas` object** for autocomplete enhancement
- **Preview modal** before importing (reuse Postman preview pattern)
- Selective endpoint import (checkboxes)

**Parser Flow:**
1. Parse Swagger 2.0 JSON → Extract `paths`, `definitions`, `host`, `basePath`
2. For each endpoint → Generate node with id, name, method, url, validations
3. Extract response schemas → Build `responseSchemas` object (keyed by nodeId)
4. Show preview modal → User confirms/cancels import
5. On confirm → Load config into editor with nodes + responseSchemas

**Test Cases:**
- Petstore API (official Swagger example)
- Simple REST API with CRUD operations
- API with path parameters

---

### Phase 2 - OpenAPI 3.0 + YAML Support
**Goal:** Support modern OpenAPI 3.0 specs and YAML format

**Deliverables:**
- OpenAPI 3.0 parser (different structure than Swagger 2.0)
- YAML file support (js-yaml library)
- Multiple servers handling (user selection or first server)
- `requestBody` parsing (OpenAPI 3.0 uses different body structure)
- `components.schemas` reference resolution

**Test Cases:**
- OpenAPI 3.0 petstore
- YAML-formatted specs
- API with multiple servers defined

---

### Phase 3 - Advanced Features (Validations, Auth, Request Bodies)
**Goal:** Generate rich validations and handle authentication

**Deliverables:**
- Schema-to-validation conversion (required fields, min/max, types)
- Request body generation from schemas with smart placeholders
- Authentication scheme conversion (Basic, Bearer, API Key)
- Security variables extraction
- Nested schema handling (limit depth to 2-3 levels)
- Query parameter handling

**Test Cases:**
- API with complex response schemas
- API with authentication (Bearer, Basic, API Key)
- API with request bodies and validations
- API with nested objects

---

### Phase 4 - Smart Detection (Future)
**Goal:** Intelligent ordering and dependency detection

**Deliverables:**
- Detect CRUD patterns (POST before GET before PUT before DELETE)
- Tag-based grouping and ordering
- Dependency detection (endpoint B uses response from endpoint A)
- Auto-generate meaningful node names from descriptions
- Suggest execution order based on path analysis

**Test Cases:**
- Large API with 50+ endpoints
- API with clear CRUD patterns
- API with dependent endpoints

---

## File Modifications Required

### New Files
- `studio/js/swagger-parser.js` - Swagger/OpenAPI parser
- `studio/js/swagger-preview.js` - Preview modal logic

### Modified Files
- `studio/index.html`:
  - Add "From Swagger/OpenAPI" option to Import dropdown
  - Add Swagger preview modal HTML
  - Include js-yaml CDN script
  - Include swagger-parser.js and swagger-preview.js scripts
- `studio/js/core/feature-registry.js`:
  - Register `swagger-parser` and `swagger-preview` features

### Reference Files (No Changes)
- `studio/js/postman-parser.js` - Reference for parser structure
- `studio/js/postman-preview.js` - Reference for preview modal pattern
