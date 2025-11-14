# Response Header Access

**Status:** Planned

**Priority:** 2

## Overview

Enable accessing HTTP response headers in variable substitution, validations, and conditional execution. This enhancement introduces a structured response access pattern (`.responses.<id>.body`, `.responses.<id>.headers`, `.responses.<id>.status`) replacing the current implicit body-only access.

## Problem Statement

**Current Limitation:**

FlowSphere can only access response **body** fields. Response headers are completely inaccessible, preventing users from:
- Extracting authentication tokens from headers (e.g., `X-Auth-Token`, `Set-Cookie`)
- Checking rate limit information (e.g., `X-RateLimit-Remaining`, `Retry-After`)
- Using pagination headers (e.g., `Link` with next/prev URLs)
- Validating content metadata (e.g., `Content-Type`, `ETag`, `Last-Modified`)
- Extracting correlation IDs for tracing (e.g., `X-Request-Id`, `X-Correlation-Id`)
- Accessing API versioning headers (e.g., `X-API-Version`)

**Current Syntax:**
```json
{
  "id": "get-user",
  "url": "/users/{{ .responses.login.userId }}"
}
```

This implicitly accesses the response **body** only. There's no way to access headers.

**Real-World Example Pain Point:**

Many authentication APIs return tokens in response headers instead of the body:
```http
POST /auth/login
Response Headers:
  X-Auth-Token: abc123xyz
  X-Session-Id: session-456
  X-RateLimit-Remaining: 99
Response Body:
  {"userId": 123, "username": "john"}
```

Currently, users **cannot** extract `X-Auth-Token` to use in subsequent requests, forcing them to:
- Manually copy/paste tokens between steps
- Use external scripts to extract headers
- Modify APIs to return tokens in body (not always possible)
- Abandon FlowSphere for header-dependent workflows

## Solution

**Structured Response Access Pattern:**

Introduce explicit access paths for all response components:

```
.responses.<id>.body.<fieldName>      // Response body fields (NEW explicit syntax)
.responses.<id>.headers.<headerName>  // Response headers (NEW)
.responses.<id>.status                // HTTP status code (NEW)
.responses.<id>.statusText            // HTTP status text (NEW)
```

**Breaking Change:**
- **Old syntax**: `.responses.<id>.<field>` (implicitly accesses body)
- **New syntax**: `.responses.<id>.body.<field>` (explicitly accesses body)
- Since FlowSphere is pre-release (v0.x), backwards compatibility is NOT maintained
- All existing configs must be migrated to new syntax

**Header Name Normalization:**
- HTTP headers are case-insensitive per RFC 7230
- All header names normalized to **lowercase** internally
- User writes: `.responses.auth.headers.X-Auth-Token`
- System resolves: `.responses.auth.headers.x-auth-token`
- Prevents case-sensitivity bugs and inconsistencies

## Key Features

### 1. Variable Substitution - Response Headers

**Access headers in requests:**
```json
{
  "id": "login",
  "method": "POST",
  "url": "/auth/login"
},
{
  "id": "get-profile",
  "method": "GET",
  "url": "/profile",
  "headers": {
    "Authorization": "Bearer {{ .responses.login.headers.x-auth-token }}",
    "X-Session-Id": "{{ .responses.login.headers.x-session-id }}"
  }
}
```

**Use headers in request body:**
```json
{
  "id": "verify-token",
  "method": "POST",
  "url": "/auth/verify",
  "body": {
    "token": "{{ .responses.login.headers.x-auth-token }}",
    "sessionId": "{{ .responses.login.headers.x-session-id }}"
  }
}
```

**Combine headers and body in same request:**
```json
{
  "id": "update-user",
  "method": "PUT",
  "url": "/users/{{ .responses.login.body.userId }}",
  "headers": {
    "Authorization": "Bearer {{ .responses.login.headers.x-auth-token }}",
    "If-Match": "{{ .responses.get-user.headers.etag }}"
  },
  "body": {
    "name": "{{ .responses.get-user.body.name }}",
    "email": "new-email@example.com"
  }
}
```

### 2. Variable Substitution - Response Status

**Access status code and text:**
```json
{
  "id": "check-status",
  "method": "GET",
  "url": "/health"
},
{
  "id": "log-status",
  "method": "POST",
  "url": "/logs",
  "body": {
    "previousStatus": {{ .responses.check-status.status }},
    "statusText": "{{ .responses.check-status.statusText }}",
    "timestamp": {{ $timestamp }}
  }
}
```

**Use in dynamic URLs:**
```json
{
  "url": "/fallback?previousStatus={{ .responses.api-call.status }}"
}
```

### 3. Response Body - Explicit Syntax

**New explicit body access:**
```json
{
  "id": "get-user",
  "method": "GET",
  "url": "/users/123"
},
{
  "id": "update-user",
  "method": "PUT",
  "url": "/users/{{ .responses.get-user.body.id }}",
  "body": {
    "name": "{{ .responses.get-user.body.name }}",
    "email": "{{ .responses.get-user.body.email }}",
    "age": {{ .responses.get-user.body.age }}
  }
}
```

**Nested field access:**
```json
{
  "userId": "{{ .responses.login.body.user.id }}",
  "token": "{{ .responses.login.headers.x-auth-token }}"
}
```

**Array access:**
```json
{
  "firstUserId": "{{ .responses.get-users.body.users[0].id }}",
  "totalUsers": "{{ .responses.get-users.body.users | length }}"
}
```

### 4. Header Validations

**Validate header existence:**
```json
{
  "id": "login",
  "method": "POST",
  "url": "/auth/login",
  "validations": [
    {
      "httpStatusCode": 200
    },
    {
      "header": "x-auth-token",
      "exists": true
    },
    {
      "header": "x-session-id",
      "exists": true
    }
  ]
}
```

**Validate header values:**
```json
{
  "validations": [
    {
      "header": "content-type",
      "equals": "application/json"
    },
    {
      "header": "x-api-version",
      "equals": "v2"
    },
    {
      "header": "x-ratelimit-remaining",
      "exists": true,
      "greaterThan": 0
    }
  ]
}
```

**Numeric comparisons on headers:**
```json
{
  "validations": [
    {
      "header": "content-length",
      "greaterThan": 0,
      "lessThan": 10000000
    },
    {
      "header": "x-ratelimit-limit",
      "greaterThanOrEqual": 100
    },
    {
      "header": "retry-after",
      "lessThanOrEqual": 60
    }
  ]
}
```

**Multiple header validations:**
```json
{
  "validations": [
    {
      "httpStatusCode": 200
    },
    {
      "header": "x-auth-token",
      "exists": true,
      "notEquals": ""
    },
    {
      "header": "content-type",
      "equals": "application/json"
    },
    {
      "jsonpath": ".userId",
      "exists": true
    }
  ]
}
```

### 5. Conditional Execution Based on Headers

**Skip step if rate limit exhausted:**
```json
{
  "id": "check-api",
  "method": "GET",
  "url": "/api/status"
},
{
  "id": "make-api-call",
  "method": "POST",
  "url": "/api/resource",
  "conditions": [
    {
      "node": "check-api",
      "header": "x-ratelimit-remaining",
      "greaterThan": 0
    }
  ]
}
```

**Conditional based on authentication header:**
```json
{
  "id": "login",
  "method": "POST",
  "url": "/auth/login"
},
{
  "id": "get-premium-data",
  "method": "GET",
  "url": "/premium/data",
  "conditions": [
    {
      "node": "login",
      "header": "x-user-tier",
      "equals": "premium"
    }
  ]
}
```

**Conditional based on API version:**
```json
{
  "id": "use-v2-feature",
  "method": "POST",
  "url": "/api/v2/feature",
  "conditions": [
    {
      "node": "check-version",
      "header": "x-api-version",
      "equals": "v2"
    }
  ]
}
```

**Multiple conditions (headers + body):**
```json
{
  "conditions": [
    {
      "node": "login",
      "header": "x-auth-token",
      "exists": true
    },
    {
      "node": "login",
      "field": ".body.userId",
      "exists": true
    },
    {
      "node": "login",
      "field": ".status",
      "equals": 200
    }
  ]
}
```

### 6. Response Structure

**Internal response storage format:**
```javascript
responses[stepIndex] = {
  status: 200,
  statusText: "OK",
  headers: {
    "content-type": "application/json",
    "x-auth-token": "abc123xyz",
    "x-session-id": "session-456",
    "x-ratelimit-remaining": "99"
  },
  body: {
    "userId": 123,
    "username": "john",
    "email": "john@example.com"
  }
};
```

**Access examples:**
- `.responses.login.status` → `200`
- `.responses.login.statusText` → `"OK"`
- `.responses.login.headers.x-auth-token` → `"abc123xyz"`
- `.responses.login.headers.content-type` → `"application/json"`
- `.responses.login.body.userId` → `123`
- `.responses.login.body.username` → `"john"`

## UI/UX Design

### Studio - Autocomplete Enhancement

**Enhanced autocomplete suggestions:**

When user types `{{ .responses.login.` show:
```
{{ .responses.login. }}
  ├── body              (response body fields)
  ├── headers           (response headers)
  ├── status            (HTTP status code)
  └── statusText        (HTTP status text)
```

When user types `{{ .responses.login.headers.` show:
```
{{ .responses.login.headers. }}
  ├── content-type (application/json)
  ├── x-auth-token (abc123...)
  ├── x-session-id (session-456)
  └── x-ratelimit-remaining (99)
```

**Context-aware header suggestions:**
- Show actual headers from previous execution (if available)
- Show common HTTP headers as hints (if no execution yet):
  - `content-type`
  - `authorization`
  - `x-auth-token`
  - `x-api-key`
  - `x-ratelimit-remaining`
  - `etag`
  - `set-cookie`

### Studio - Validation UI

**Add "Header Validation" option:**
```
┌─────────────────────────────────────────┐
│ Validations                             │
│                                         │
│ Validation Type:                        │
│   ○ HTTP Status Code                    │
│   ○ JSON Path (body)                    │
│   ● Response Header                     │
│                                         │
│ Header Name:                            │
│ [x-auth-token___________________]       │
│                                         │
│ Conditions:                             │
│ ☑ Exists                                │
│ ☐ Equals: [_____________________]       │
│ ☐ Not Equals: [_________________]       │
│ ☐ Greater Than: [_______________]       │
│ ☐ Less Than: [__________________]       │
│                                         │
│ [Add Validation]                        │
└─────────────────────────────────────────┘
```

### Studio - Conditions UI

**Add "Header Condition" option:**
```
┌─────────────────────────────────────────┐
│ Conditions                              │
│                                         │
│ Condition Source:                       │
│   ○ Response Body Field                 │
│   ● Response Header                     │
│   ○ Global Variable                     │
│   ○ User Input                          │
│                                         │
│ Previous Step:                          │
│ [login ▼]                               │
│                                         │
│ Header Name:                            │
│ [x-user-tier____________________]       │
│                                         │
│ Condition Type:                         │
│ [Equals ▼]                              │
│                                         │
│ Value:                                  │
│ [premium________________________]       │
│                                         │
│ [Add Condition]                         │
└─────────────────────────────────────────┘
```

### Flow Runner - Execution Display

**Show headers in execution results:**
```
┌─────────────────────────────────────────┐
│ ✓ Step 1: Login                         │
│   POST /auth/login                      │
│   Status: 200 OK                        │
│   Duration: 234ms                       │
│                                         │
│   Response Headers:                     │
│     content-type: application/json      │
│     x-auth-token: abc123xyz             │
│     x-session-id: session-456           │
│     x-ratelimit-remaining: 99           │
│   [Show Full Headers]                   │
│                                         │
│   Validations:                          │
│     ✓ Validated status = 200            │
│     ✓ Validated header x-auth-token exists │
│     ✓ Validated header x-ratelimit-remaining > 0 │
│     ✓ Extracted .body.userId = 123      │
│                                         │
│   Substitutions:                        │
│     {{ .responses.login.headers.x-auth-token }} → abc123xyz (response) │
└─────────────────────────────────────────┘
```

**Expandable headers section:**
```
[Show Full Headers] clicked:

┌─────────────────────────────────────────┐
│ Response Headers (10 total)             │
│                                         │
│   cache-control: no-store               │
│   content-encoding: gzip                │
│   content-length: 247                   │
│   content-type: application/json        │
│   date: Thu, 14 Nov 2025 10:30:00 GMT   │
│   etag: "abc123"                        │
│   server: nginx/1.21.0                  │
│   x-auth-token: abc123xyz               │
│   x-ratelimit-remaining: 99             │
│   x-session-id: session-456             │
│                                         │
│ [Hide Headers]                          │
└─────────────────────────────────────────┘
```

### Try it Out - Response Display

**Include headers in response panel:**
```
┌─────────────────────────────────────────┐
│ Try it Out: Login                       │
│                                         │
│ Response                                │
│ ┌─────────────────────────────────────┐ │
│ │ [Body] [Headers] [Info]             │ │
│ │                                     │ │
│ │ Headers (4)                         │ │
│ │ ─────────────────────────────────── │ │
│ │ content-type: application/json      │ │
│ │ x-auth-token: abc123xyz             │ │
│ │ x-session-id: session-456           │ │
│ │ x-ratelimit-remaining: 99           │ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [Copy Headers]  [Close]                 │
└─────────────────────────────────────────┘
```

**Body tab:**
```
│ [Body] [Headers] [Info]                 │
│                                         │
│ {                                       │
│   "userId": 123,                        │
│   "username": "john",                   │
│   "email": "john@example.com"           │
│ }                                       │
```

**Info tab:**
```
│ [Body] [Headers] [Info]                 │
│                                         │
│ Status:    200 OK                       │
│ Duration:  234ms                        │
│ Size:      247 bytes                    │
│                                         │
│ Timeline:                               │
│   DNS:      12ms                        │
│   Connect:  45ms                        │
│   TLS:      67ms                        │
│   Request:  23ms                        │
│   Response: 87ms                        │
```

## Implementation Phases

### Phase 1 - Core Response Structure & Substitution

**Goal:** Implement structured response access and update variable substitution.

**Tasks:**
1. Modify `lib/executor.js` to store full response structure:
   - Capture `status`, `statusText`, `headers`, `body` from axios responses
   - Normalize header names to lowercase
   - Store in `responses[]` array with new structure
2. Update `lib/substitution.js` to support new syntax:
   - Add regex patterns for `.responses.<id>.body.<field>`
   - Add regex patterns for `.responses.<id>.headers.<headerName>`
   - Add regex patterns for `.responses.<id>.status` and `.statusText`
   - Normalize header names in references to lowercase
   - Update `extractValue()` to handle new paths
3. Update all example configs to use new syntax
4. Update test configs to use new syntax

**Files to Create/Modify:**
- `lib/executor.js` - Store full response structure
- `lib/substitution.js` - New substitution patterns
- `lib/utils.js` - Update `extractValue()` for new paths
- `examples/*.json` - Update all examples
- `tests/*.json` - Update all test configs

**Acceptance Criteria:**
- ✓ Responses stored with `status`, `statusText`, `headers`, `body` structure
- ✓ Header names normalized to lowercase
- ✓ `.responses.<id>.body.<field>` works in substitution
- ✓ `.responses.<id>.headers.<headerName>` works in substitution
- ✓ `.responses.<id>.status` and `.statusText` work in substitution
- ✓ All existing examples updated and working
- ✓ All test configs passing

### Phase 2 - Header Validations

**Goal:** Enable header validation in config validations.

**Tasks:**
1. Update `lib/validator.js`:
   - Add `header` validation type
   - Support `exists`, `equals`, `notEquals` for headers
   - Support `greaterThan`, `lessThan`, etc. for numeric headers
   - Normalize header names in validation rules
2. Update validation display logic in Studio
3. Add header validation examples to docs

**New Validation Format:**
```json
{
  "validations": [
    {
      "header": "x-auth-token",
      "exists": true,
      "notEquals": ""
    },
    {
      "header": "x-ratelimit-remaining",
      "greaterThan": 0
    }
  ]
}
```

**Files to Modify:**
- `lib/validator.js` - Add header validation logic
- `studio/js/flow-runner.js` - Display header validations
- `studio/js/try-it-out.js` - Display header validations
- `studio/js/node-editor.js` - UI for adding header validations

**Acceptance Criteria:**
- ✓ Header validations work in executor
- ✓ All validation types supported (exists, equals, notEquals, comparisons)
- ✓ Header names normalized in validations
- ✓ Validation failures show clear error messages
- ✓ Studio displays header validation results correctly

### Phase 3 - Header Conditions

**Goal:** Enable conditional execution based on response headers.

**Tasks:**
1. Update `lib/conditions.js`:
   - Add `header` field to condition evaluation
   - Support header-based conditions alongside existing `field` conditions
   - Normalize header names in condition checks
2. Update condition display in Studio
3. Add header condition examples

**New Condition Format:**
```json
{
  "conditions": [
    {
      "node": "check-api",
      "header": "x-ratelimit-remaining",
      "greaterThan": 0
    }
  ]
}
```

**Files to Modify:**
- `lib/conditions.js` - Add header condition support
- `studio/js/flow-runner.js` - Display header-based skip reasons
- `studio/js/node-editor.js` - UI for adding header conditions

**Acceptance Criteria:**
- ✓ Header conditions work correctly
- ✓ Steps skip when header conditions not met
- ✓ Skip reasons clearly indicate header condition failure
- ✓ Studio displays header conditions in UI
- ✓ Condition editor supports header selection

### Phase 4 - Studio UI Enhancements

**Goal:** Rich UI support for headers in Studio editor and viewers.

**Tasks:**
1. Update autocomplete (`studio/js/autocomplete.js`):
   - Show `.body`, `.headers`, `.status`, `.statusText` when typing `.responses.<id>.`
   - Show actual header names from previous executions
   - Show common headers as hints when no execution data
2. Add header validation UI in node editor
3. Add header condition UI in node editor
4. Update Flow Runner display to show headers
5. Update Try it Out to show headers in response tabs

**UI Components:**
- Autocomplete suggestions for headers
- Header validation form in node editor
- Header condition form in node editor
- Headers tab/section in response viewers
- Collapsible header display with "Show Full Headers"

**Files to Modify:**
- `studio/js/autocomplete.js` - Header autocomplete
- `studio/js/node-editor.js` - Header validation/condition UI
- `studio/js/flow-runner.js` - Header display in execution
- `studio/js/try-it-out.js` - Header tabs in response

**Acceptance Criteria:**
- ✓ Autocomplete suggests header paths correctly
- ✓ Node editor has UI for header validations
- ✓ Node editor has UI for header conditions
- ✓ Flow Runner displays response headers
- ✓ Try it Out shows headers in dedicated tab
- ✓ UI is consistent with existing styling patterns

### Phase 5 - Documentation & Migration

**Goal:** Complete documentation and provide migration guide.

**Tasks:**
1. Update `CLAUDE.md` with new response syntax
2. Update technical architecture docs
3. Create migration guide for existing configs
4. Update all feature examples in docs
5. Add header access examples to cookbook/guides
6. Update README.md with header examples

**Documentation Updates:**
- Config format documentation
- Variable substitution guide
- Validation examples
- Condition examples
- Migration guide (old → new syntax)
- Real-world header use cases

**Files to Create/Modify:**
- `CLAUDE.md` - Update response syntax docs
- `docs/technical/core-architecture.md` - Update architecture
- `docs/guides/migration-response-syntax.md` - NEW migration guide
- `README.md` - Update examples
- All example configs in `examples/`

**Acceptance Criteria:**
- ✓ All documentation reflects new syntax
- ✓ Migration guide provides clear upgrade path
- ✓ Examples demonstrate header access
- ✓ No references to old syntax remain
- ✓ Cookbook includes header use cases

## Edge Cases & Error Handling

### Missing Header Reference

**Config:**
```json
{
  "headers": {
    "Authorization": "{{ .responses.login.headers.x-auth-token }}"
  }
}
```

**If `x-auth-token` header not in response:**
```
❌ Error: Header 'x-auth-token' not found in response from step 'login'

Available headers in 'login' response:
  - content-type
  - content-length
  - x-session-id
  - x-ratelimit-remaining

Suggestion: Check if the API returns 'x-auth-token' header, or use a different header
```

### Invalid Response Path

**Config:**
```json
{
  "url": "/users/{{ .responses.login.invalid.path }}"
}
```

**Error:**
```
❌ Error: Invalid response path '.responses.login.invalid.path'

Valid response paths:
  - .responses.login.body.<field>
  - .responses.login.headers.<headerName>
  - .responses.login.status
  - .responses.login.statusText

Suggestion: Use .responses.login.body.userId or .responses.login.headers.x-auth-token
```

### Header Validation Failure

**Config:**
```json
{
  "validations": [
    {
      "header": "x-ratelimit-remaining",
      "greaterThan": 10
    }
  ]
}
```

**Response has header value = 5:**
```
❌ Validation failed for header 'x-ratelimit-remaining'

Expected: greaterThan 10
Actual:   5

Step execution stopped.
```

### Header Condition Not Met

**Config:**
```json
{
  "conditions": [
    {
      "node": "check-api",
      "header": "x-feature-enabled",
      "equals": "true"
    }
  ]
}
```

**If header value is "false":**
```
⊘ Step skipped: Condition not met

Condition: header 'x-feature-enabled' equals 'true'
Actual:    header 'x-feature-enabled' = 'false'
```

### Case-Insensitive Header Matching

**Config (various cases):**
```json
{
  "validations": [
    {"header": "Content-Type", "equals": "application/json"},
    {"header": "x-auth-token", "exists": true},
    {"header": "X-RateLimit-Remaining", "greaterThan": 0}
  ]
}
```

**All normalized to lowercase internally:**
- `Content-Type` → `content-type`
- `x-auth-token` → `x-auth-token` (no change)
- `X-RateLimit-Remaining` → `x-ratelimit-remaining`

**Matching works regardless of case in config vs response.**

### Old Syntax Usage

**Config using old syntax (no `.body` or `.headers`):**
```json
{
  "url": "/users/{{ .responses.login.userId }}"
}
```

**Error with migration hint:**
```
❌ Error: Invalid response path '.responses.login.userId'

Since FlowSphere v0.2.0, response access requires explicit path:
  - OLD: .responses.login.userId
  - NEW: .responses.login.body.userId

Other new paths:
  - .responses.login.headers.x-auth-token
  - .responses.login.status
  - .responses.login.statusText

See migration guide: docs/guides/migration-response-syntax.md
```

## Success Criteria

- ✅ Users can access response headers via `.responses.<id>.headers.<headerName>`
- ✅ Users can access response body via `.responses.<id>.body.<field>`
- ✅ Users can access status code via `.responses.<id>.status`
- ✅ Users can access status text via `.responses.<id>.statusText`
- ✅ Header names normalized to lowercase automatically
- ✅ Header validations work with all comparison operators
- ✅ Header conditions work in conditional execution
- ✅ Studio autocomplete suggests header paths
- ✅ Studio displays headers in execution results
- ✅ Try it Out shows headers in response tabs
- ✅ Clear error messages for missing/invalid header references
- ✅ All existing examples migrated to new syntax
- ✅ Migration guide available for users
- ✅ Documentation complete and accurate

## Related Features

- **Enhanced Launch Browser with Expressions** (Priority 2): Can use headers in browser URLs
- **Multi-Environment Variable Groups** (Priority 8): Different auth headers per environment
- **OAuth Callback Capture** (Priority 7): Extract OAuth tokens from response headers
- **Execution Log Visualizer** (Priority 3): Display headers in log visualizer

## Technical Notes

### Response Storage Structure

**Before (v0.1.x):**
```javascript
responses[0] = {
  userId: 123,
  username: "john",
  email: "john@example.com"
};
```

**After (v0.2.0+):**
```javascript
responses[0] = {
  status: 200,
  statusText: "OK",
  headers: {
    "content-type": "application/json",
    "x-auth-token": "abc123xyz",
    "x-session-id": "session-456"
  },
  body: {
    userId: 123,
    username: "john",
    email: "john@example.com"
  }
};
```

### Axios Response Mapping

**Axios response object:**
```javascript
{
  status: 200,
  statusText: "OK",
  headers: {
    "content-type": "application/json",
    "X-Auth-Token": "abc123xyz"  // Original case from server
  },
  data: {
    userId: 123
  }
}
```

**FlowSphere mapping:**
```javascript
responses[stepIndex] = {
  status: response.status,
  statusText: response.statusText,
  headers: normalizeHeaders(response.headers),  // Lowercase keys
  body: response.data
};

function normalizeHeaders(headers) {
  const normalized = {};
  for (const [key, value] of Object.entries(headers)) {
    normalized[key.toLowerCase()] = value;
  }
  return normalized;
}
```

### JSONPath Extraction Enhancement

**Update `extractValue()` in `lib/utils.js`:**
```javascript
function extractValue(obj, path) {
  // Handle special response paths
  if (path.startsWith('.body.')) {
    path = path.substring(6); // Remove '.body.'
    obj = obj.body;
  } else if (path.startsWith('.headers.')) {
    const headerName = path.substring(9).toLowerCase(); // Remove '.headers.' and normalize
    return obj.headers[headerName];
  } else if (path === '.status') {
    return obj.status;
  } else if (path === '.statusText') {
    return obj.statusText;
  }

  // Existing JSONPath logic for body fields...
}
```

### Substitution Regex Patterns

**New regex patterns in `lib/substitution.js`:**
```javascript
// Match .responses.<id>.body.<field>
const bodyPattern = /\{\{\s*\.responses\.([a-zA-Z0-9_-]+)\.body\.([a-zA-Z0-9_.[\]|]+)\s*\}\}/g;

// Match .responses.<id>.headers.<headerName>
const headersPattern = /\{\{\s*\.responses\.([a-zA-Z0-9_-]+)\.headers\.([a-zA-Z0-9_-]+)\s*\}\}/g;

// Match .responses.<id>.status
const statusPattern = /\{\{\s*\.responses\.([a-zA-Z0-9_-]+)\.status\s*\}\}/g;

// Match .responses.<id>.statusText
const statusTextPattern = /\{\{\s*\.responses\.([a-zA-Z0-9_-]+)\.statusText\s*\}\}/g;
```

### Breaking Change Impact

**All configs must migrate from:**
```json
"url": "/users/{{ .responses.login.userId }}"
```

**To:**
```json
"url": "/users/{{ .responses.login.body.userId }}"
```

**Migration tool (optional Phase 6):**
- CLI tool: `flowsphere migrate-config config.json`
- Automatically converts old syntax to new syntax
- Creates backup of original config
- Reports all changes made

### Header Name Normalization

**HTTP headers are case-insensitive per RFC 7230:**
- `Content-Type` = `content-type` = `CONTENT-TYPE`
- FlowSphere normalizes ALL header names to lowercase
- User can write headers in any case in config
- Matching always works regardless of server's case choice

**Example:**
- Server returns: `X-Auth-Token: abc123`
- Stored as: `x-auth-token: abc123`
- User writes: `.responses.login.headers.X-Auth-Token`
- System resolves: `.responses.login.headers.x-auth-token`
- Match succeeds ✓

### Multiple Header Values

**Some headers can have multiple values:**
```http
Set-Cookie: session=abc123; Path=/
Set-Cookie: user=john; Path=/
```

**Axios combines multiple values with comma separator:**
```javascript
headers: {
  "set-cookie": "session=abc123; Path=/, user=john; Path=/"
}
```

**FlowSphere stores as single string (Axios default behavior)**
- Users can split values manually if needed
- Future enhancement: Support array access like `.headers.set-cookie[0]`

### Performance Considerations

- Header normalization happens once per response (minimal overhead)
- Header storage adds ~1-2KB per response (negligible)
- Regex matching for new patterns has same performance as existing body patterns
- No measurable performance impact expected
