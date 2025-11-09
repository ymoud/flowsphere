# Enhanced Postman Import

**Status:** Completed (with known issues)

**Priority:** 4

**Phase Progress:**
- ✅ Phase 1: Order-of-Appearance Import (Completed)
- ✅ Phase 2: Environment File Support (Completed)
- ✅ Phase 3: Import Preview (Completed)

**Known Issues:**
See [Implementation Status](../implementation/enhanced-postman-import-status.md) for details on known issues and limitations.

## Overview

Improve the existing Postman import feature with environment file support, better variable resolution, auth conversion, and test script mining.

## Current Limitations

- **Requires numeric prefixes** - Current parser only works with requests/folders prefixed with numbers (e.g., "1. Login", "2. Get User") → **Fixed in Phase 1**
- Fails completely if collection doesn't follow numbering convention → **Fixed in Phase 1**
- No environment file support → **Fixed in Phase 2**
- Auth must be manually configured (not imported from Postman) → **Fixed in Phase 1**
- Validations not extracted from test scripts → **Fixed in Phase 1**
- No preview before import → **Phase 3**

## Proposed Improvements

### 1. Order of Appearance Import (No Numbering Required)

**Problem:**
Current parser (`postman-tools/parse-postman.js`) requires requests/folders to have numeric prefixes (e.g., "1. Login", "2. Get User"). If the collection doesn't follow this convention, the import fails completely.

**Solution:**
Detect whether numbering is present:
- **If numbered:** Use existing sorting logic (sort by numeric prefix)
- **If not numbered:** Import requests in order of appearance in the collection

**Order of Appearance Logic:**
1. Iterate through collection items in the order they appear in the JSON
2. Process folders first (if any), then top-level requests
3. Within each folder, process requests in order
4. Flatten the structure into a sequential node list
5. Auto-generate node IDs based on request names (sanitized)

**Example:**
```
Postman Collection (no numbering):
├── 📁 Authentication
│   ├── Login
│   └── Get Token
├── 📁 Users
│   ├── Create User
│   ├── Get User
│   └── Update User
└── Logout

FlowSphere Config (order preserved):
1. Login (id: login)
2. Get Token (id: get-token)
3. Create User (id: create-user)
4. Get User (id: get-user)
5. Update User (id: update-user)
6. Logout (id: logout)
```

**Detection Logic:**
- Use regex pattern `/^\d+\.\s/` to detect numeric prefixes
- Count how many items match the pattern
- If >50% of items are numbered → treat as numbered collection
- Otherwise → treat as non-numbered collection

**Benefits:**
- Import ANY Postman collection, regardless of naming convention
- No manual renaming required before import
- Preserves logical order from Postman workspace
- More user-friendly for beginners

### 2. Better Variable Resolution

- Show preview of resolved vs unresolved variables
- Option to keep variable syntax for runtime resolution
- Smart detection of dynamic values to preserve as placeholders
- Map Postman variables to FlowSphere syntax

### 3. Import Preview

**Preview Features:**
- Show all discovered requests before importing
- Display resolved variable values
- Preview generated node structure
- Show which variables are unresolved
- List auth conversions and extracted validations

**Note:** Users can edit nodes, reorder, and customize after import using Studio's full editor capabilities.

## User Workflow

1. Click "Import Config" → "From Postman Collection"
2. Upload collection file (numbering no longer required!)
3. *(Phase 2+)* Optionally upload environment file (`.postman_environment.json`)
4. *(Phase 3+)* Preview discovered requests with variable values and auth conversions
5. Click "Import" to generate config
6. Edit and customize nodes in Studio as needed

## Feature Mapping: Postman → FlowSphere

### ✅ Direct Mapping (Already Supported)

| Postman Feature | FlowSphere Equivalent | Notes |
|----------------|----------------------|-------|
| HTTP Methods (GET, POST, PUT, DELETE, etc.) | `node.method` | Direct 1:1 mapping |
| Request URL | `node.url` | Relative to `defaults.baseUrl` |
| Request Headers | `node.headers` | Object with key-value pairs |
| Request Body (raw JSON) | `node.body` | Parsed JSON object |
| Request Body (formdata) | `node.body` | Converted to object |
| Request Body (urlencoded) | `node.body` | Converted to object |
| Environment Variables `{{var}}` | `{{ .vars.var }}` | Resolved during import |
| Dynamic Variables `{{$guid}}` | `{{ $guid }}` | Identical syntax |
| Dynamic Variables `{{$timestamp}}` | `{{ $timestamp }}` | Identical syntax |
| Query Parameters | Encoded in `node.url` | Both object and string formats |
| Example Responses | Used for validation generation | Status + body structure |

### ⚠️ Requires Conversion

| Postman Feature | FlowSphere Equivalent | Conversion Logic |
|----------------|----------------------|------------------|
| **Collection-level Auth** | `defaults.headers.Authorization` | Convert auth object to header |
| Basic Auth | `Authorization: Basic base64(user:pass)` | Encode credentials |
| Bearer Token | `Authorization: Bearer {{token}}` | Map to header with variable |
| API Key Auth | Custom header (e.g., `X-API-Key`) | Map to appropriate header |
| Request-level Auth override | `node.headers.Authorization` | Override default header |
| **Test Scripts** `pm.test()` | `node.validations[]` | Extract assertions |
| Status assertions | `{ httpStatusCode: 201 }` | Parse `pm.response.to.have.status()` |
| Field assertions | `{ jsonpath: ".field", exists: true }` | Parse `pm.response.json().field` |
| Environment setting | Dependency mapping | Parse `pm.environment.set()` |
| **Pre-request Scripts** | Variable substitution | Extract variable assignments |
| **Disabled Items** | Skip during import | Ignore disabled headers/params |
| **Folder Descriptions** | Node name/grouping | Preserve context in node names |

### ❌ Not Supported (Future Enhancement)

| Postman Feature | Reason | Potential Workaround |
|----------------|--------|----------------------|
| JavaScript test logic | FlowSphere uses declarative validations | Manual conversion to validations |
| Complex pre-request scripts | No script execution environment | Manual conversion to substitutions |
| Collection-level events | No global hooks | Apply per-node |
| Request chaining (non-sequential) | Sequential execution only | Reorder nodes |
| Data files for parameterization | No data-driven testing | Multiple configs or user prompts |

## Variable Mapping

### Postman → FlowSphere

| Postman Syntax | FlowSphere Syntax | Source |
|----------------|-------------------|--------|
| `{{variableName}}` | `{{ .vars.variableName }}` | Global variables (from environment) |
| `{{$guid}}` | `{{ $guid }}` | Dynamic UUID generation |
| `{{$timestamp}}` | `{{ $timestamp }}` | Unix timestamp |
| `pm.environment.get("var")` | `{{ .vars.var }}` | Environment variables |
| `pm.response.json().field` | `{{ .responses.stepId.field }}` | Previous step response |
| `pm.variables.get("var")` | `{{ .vars.var }}` | Collection variables |

### Auth Conversion Examples

**Basic Auth:**
- **Postman**: `auth.type = "basic"` with username/password in array
- **FlowSphere**: `Authorization: Basic <base64-encoded-credentials>` header
- Variables resolved during import or preserved as `{{ .vars.username }}`

**Bearer Token:**
- **Postman**: `auth.type = "bearer"` with token value in array
- **FlowSphere**: `Authorization: Bearer {{ .vars.token }}` header

**API Key:**
- **Postman**: `auth.type = "apikey"` with key name and value in array
- **FlowSphere**: Custom header (e.g., `X-API-Key: {{ .vars.api_key }}`)

## Implementation Phases

### Phase 1 - Order of Appearance Import (Foundation)
**Goal:** Make the parser work with ANY Postman collection, regardless of numbering convention, and improve feature coverage.

**Core Tasks:**
- Implement numbering detection logic (`hasNumericPrefixes()`)
- Add order-of-appearance traversal for non-numbered collections
- Preserve existing numeric prefix sorting for numbered collections
- Auto-generate sanitized node IDs from request names
- Handle nested folders correctly (flatten to sequential list)

**Enhanced Feature Support:**
- ✅ **Auth Conversion** - Convert Postman auth to FlowSphere headers
  - Basic Auth → `Authorization: Basic base64(user:pass)`
  - Bearer Token → `Authorization: Bearer {{token}}`
  - API Key → Custom header (X-API-Key, etc.)
  - Collection-level auth → `defaults.headers`
  - Request-level auth override → `node.headers`
- ✅ **Test Script Mining** - Extract validations from test scripts
  - Parse `pm.response.to.have.status(code)` → `{ httpStatusCode: code }`
  - Parse `pm.response.json().field` references → `{ jsonpath: ".field", exists: true }`
  - Warn about unparseable tests (skip gracefully)
- ✅ **Query Parameter Handling** - Support both URL formats
  - Object format: `{ host[], path[], query[] }` → Encoded URL string
  - String format: Already handled
  - Skip disabled query parameters
- ✅ **Disabled Items** - Skip disabled headers and query params
- ✅ **URL Normalization** - Handle both URL formats
  - String: `"{{base_url}}/path"`
  - Object: `{ raw, host[], path[], query[] }` → Use `raw` field
- ✅ **Request Body Modes** - Support all body types
  - `raw` (JSON) - Already supported
  - `formdata` - Convert to object
  - `urlencoded` - Convert to object
  - `file` - Not supported (warn user)

**Files to modify:**
- `postman-tools/parse-postman.js` - Core parser logic

**Acceptance Criteria:**
- ✅ Import numbered collections (existing behavior preserved)
- ✅ Import non-numbered collections (new capability)
- ✅ Preserve order of appearance for non-numbered collections
- ✅ Auto-generate valid node IDs from request names
- ✅ Handle folders and nested requests correctly
- ✅ Convert collection-level and request-level auth to headers
- ✅ Extract basic validations from test scripts
- ✅ Handle query parameters in both formats
- ✅ Skip disabled headers and query params
- ✅ Support all request body modes (raw, formdata, urlencoded)
- ✅ No breaking changes to existing configs

**Technical Details:**

*Node ID Generation:*
- Convert request name to lowercase kebab-case (spaces/special chars → hyphens)
- Trim leading/trailing hyphens
- Check for duplicates in existing IDs
- If duplicate exists, append counter suffix: `-2`, `-3`, etc.
- Return sanitized unique ID

*Collection Traversal Logic:*
- Detect numbering: Check if >50% of items have numeric prefix pattern `/^\d+\.\s/`
- If numbered: Sort items by numeric prefix (preserve existing behavior)
- If not numbered: Keep items in order of appearance in JSON
- Recursively traverse folders, flattening to sequential request list
- Maintain order within each folder level

*Auth Conversion Logic:*
- Check `collection.auth` for collection-level auth configuration
- Check `request.auth` for request-level overrides
- Convert auth object to appropriate `Authorization` header:
  - **Basic Auth**: Extract username/password, base64 encode, format as `Basic <encoded>`
  - **Bearer Token**: Extract token value, format as `Bearer <token>`
  - **API Key**: Extract header key/value, add as custom header
  - **No Auth**: Skip auth header entirely
- Request-level auth overrides collection-level auth
- Unsupported auth types: Log warning, skip conversion

*Test Script Mining:*
- Extract test scripts from `request.event` array (filter `listen === 'test'`)
- Concatenate script lines from `script.exec` array
- Parse common assertion patterns using regex:
  - `pm.response.to.have.status(code)` → Extract status code
  - `pm.response.json().field` → Extract field name for existence check
- Add extracted validations to node's `validations` array
- Skip unparseable assertions with warning

*Query Parameter Handling:*
- Check URL format: string vs object (`{ raw, host[], path[], query[] }`)
- If object format and `raw` field exists: Use raw field directly
- If object format without raw: Reconstruct URL from components
  - Join host array with `.`
  - Join path array with `/`
  - Filter query array to skip disabled parameters
  - URL-encode query parameters and append as query string
- Resolve environment variables in final URL string

*Edge Cases to Handle:*
- Empty collections (no items)
- Collections with only folders (no requests)
- Deeply nested folders (3+ levels)
- Duplicate request names (use counter suffix: `-2`, `-3`, etc.)
- Requests with special characters in names
- Mixed numbered/non-numbered items (treat as non-numbered if <50% have numbers)
- Auth at collection level vs request level (request overrides collection)
- Disabled headers/query params (skip entirely)
- Unsupported auth types (warn user, skip auth conversion)
- Unparseable test scripts (warn user, skip validation extraction)
- File body mode (warn user, not supported)

### Phase 2 - Environment File Support
**Goal:** Support importing Postman environment files to resolve variables during import.

**Tasks:**
- Parse Postman environment file (`.postman_environment.json`)
- Extract variables from environment file
- Merge environment variables with collection variables (if any)
- Resolve environment variables during import → Add to `variables` section
- Support both resolved values and preserving variable syntax

**UI Changes:**
```
Import from Postman ▼
├── Collection File: [Browse...] collection.json
├── Environment File (optional): [Browse...] environment.json
└── [Import]
```

**Files to modify:**
- `postman-tools/parse-postman.js` - Add environment file parsing

**Note on Multi-Environment Support:**
FlowSphere supports multiple variable groups (environments) similar to Postman environments. See [Multi-Environment Variable Groups](multi-environment-variable-groups.md) feature for details on selecting which environment to use during execution.

**Acceptance Criteria:**
- ✅ Parse environment file and extract variables
- ✅ Merge environment + collection variables
- ✅ Resolve variables during import
- ✅ Add variables to config `variables` section
- ✅ Handle missing environment file gracefully

### Phase 3 - Import Preview
**Goal:** Provide visibility into what will be imported before creating the config.

**Tasks:**
- Show preview dialog before finalizing import
- Display all discovered requests with generated node IDs
- Show resolved variable values
- Highlight unresolved variables
- Display auth conversions (collection → headers)
- Show extracted validations from test scripts
- Allow user to confirm or cancel import

**Files to modify:**
- Studio UI for import dialog

**Acceptance Criteria:**
- ✅ Preview shows all requests in import order
- ✅ Variable resolutions are visible
- ✅ Auth conversions are listed
- ✅ Extracted validations are displayed
- ✅ User can cancel import after preview

## Success Criteria

### Phase 1 Success Criteria:
- ✅ Import ANY Postman collection regardless of numbering convention
- ✅ Preserve order of appearance for non-numbered collections
- ✅ Auto-generate valid node IDs from request names
- ✅ Convert collection-level and request-level auth to Authorization headers
- ✅ Extract status code validations from test scripts
- ✅ Extract field existence validations from test scripts
- ✅ Handle query parameters in both object and string formats
- ✅ Skip disabled headers and query parameters
- ✅ Support all request body modes (raw, formdata, urlencoded)
- ✅ Maintain backward compatibility with existing numbered collections

### Phase 2 Success Criteria:
- ✅ Parse and import Postman environment files
- ✅ Resolve environment variables to actual values
- ✅ Merge environment + collection variables
- ✅ Add all variables to config `variables` section
- ✅ Handle missing/optional environment file

### Phase 3 Success Criteria:
- ✅ Display import preview before finalizing
- ✅ Show all variable resolutions
- ✅ Display auth conversions and extracted validations
- ✅ Allow user to confirm or cancel

## Related Features

### Multi-Environment Variable Groups
FlowSphere supports multiple variable groups (environments) similar to Postman environments. When importing Postman collections with multiple environment files, each environment can be imported as a separate variable group.

**Integration with Import:**
- Import multiple Postman environment files → Multiple variable groups in FlowSphere config
- Each Postman environment becomes a named group (dev, staging, production)
- Select which environment to use during execution via CLI (`--env=staging`) or Studio dropdown

➡️ See [Multi-Environment Variable Groups](multi-environment-variable-groups.md) for full feature specification

This is a core FlowSphere feature that works seamlessly with Postman import, allowing you to import all your Postman environments at once and switch between them during execution.
