# Enhanced Postman Import - Implementation Status

**Feature:** Enhanced Postman Import
**Status:** Phase 3 Completed (with known issues)
**Last Updated:** 2025-11-10

## Phase Progress

### ✅ Phase 1: Order-of-Appearance Import (Completed)
- ✅ Order-of-appearance detection and import
- ✅ Kebab-case node ID generation
- ✅ Auth conversion (Basic, Bearer, API Key)
- ✅ Test script mining (pm.response.to.have.status, pm.expect patterns)
- ✅ Query parameter handling
- ✅ Disabled items filtering
- ✅ All body modes (raw, formdata, urlencoded)

### ✅ Phase 2: Environment File Support (Completed)
- ✅ Environment file upload UI
- ✅ Variable resolution from environment
- ✅ Variables section in generated config
- ✅ Merged environment + collection variables

### ✅ Phase 3: Import Preview (Completed)
- ✅ Preview modal UI with config summary
- ✅ Display discovered nodes with IDs
- ✅ Show resolved variable values
- ✅ Display auth conversions
- ✅ Show extracted validations summary
- ✅ Confirm/Cancel flow

## Known Issues & Limitations

### 1. Basic Auth with Variable References (Not Supported)

**Issue:**
Postman collections can use environment variables in Basic Auth credentials:
```json
{
  "auth": {
    "type": "basic",
    "basic": [
      {"key": "username", "value": "{{username}}"},
      {"key": "password", "value": "{{password}}"}
    ]
  }
}
```

When these variables are set from previous responses (via `pm.environment.set()`), we need to reference response values in auth headers. However, FlowSphere's `defaults.headers` doesn't support response references like `{{ .responses.nodeId.field }}`.

**Current Behavior:**
- Basic auth with static values: ✅ Works (encoded to base64)
- Basic auth with environment variables: ✅ Works if variables are in environment file
- Basic auth with response-based variables: ❌ Doesn't work (defaults can't reference responses)

**Example from Fake API collection:**
1. Request 1 (`create-user`): Creates user, returns `username` and `password` in response
2. Request 1 test script: `pm.environment.set("username", jsonData.username)`
3. Collection-level auth: Uses `{{username}}` and `{{password}}`
4. Request 2+: Should use auth from responses, but defaults.headers can't do this

**Workaround:**
Currently, the parser resolves `{{username}}` and `{{password}}` from the environment file at import time. This works if the environment file has static values, but not if values come from responses.

**Solution Required:**
Need a new FlowSphere feature: **"Response-based Auth"** or **"Dynamic Auth Per Node"**
- Allow per-node auth headers that reference previous responses
- Add `auth` field to node config with response substitution support
- Example: `"auth": {"username": "{{ .responses.create-user.username }}", "password": "{{ .responses.create-user.password }}"}`

**Action Items:**
- [ ] Add "Response-based Auth" feature to ROADMAP.md
- [ ] Update parser to detect auth with response dependencies
- [ ] For now: Ignore auth conversion when variables can't be resolved
- [ ] When feature is ready: Update parser to generate per-node auth with response references

---

### 2. Request-Level "No Auth" Not Detected (skipDefaultHeaders)

**Issue:**
When a Postman request explicitly sets `auth.type = "noauth"`, it means "don't inherit collection-level auth". We need to:
1. Copy all non-auth headers from `defaults.headers` to `node.headers`
2. Set `skipDefaultHeaders: true` to prevent inheriting the Authorization header
3. This ensures the node gets all default headers EXCEPT the auth header

**Current Behavior:**
Parser doesn't check for `auth.type === "noauth"`, so nodes incorrectly inherit collection-level auth headers.

**Example from Fake API collection:**
- Collection has Basic Auth configured
- Request 1 (`create-user`) has "No Auth" selected
- Expected: Copy non-auth headers to node, set `skipDefaultHeaders: true`
- Actual: Node inherits Authorization header from defaults

**Solution:**
```javascript
// In parsePostmanCollection, when processing node headers:
if (request.auth && request.auth.type === 'noauth') {
    // Copy all default headers EXCEPT Authorization to node headers
    if (defaults.headers) {
        Object.entries(defaults.headers).forEach(([key, value]) => {
            if (key !== 'Authorization') {
                nodeHeaders[key] = value;
            }
        });
        hasCustomHeaders = true;
    }

    // Skip all default headers (we already copied the non-auth ones above)
    node.skipDefaultHeaders = true;
}
```

**Action Items:**
- [ ] Update `parsePostmanCollection()` to detect `auth.type === "noauth"`
- [ ] Copy non-auth default headers to node.headers
- [ ] Set `skipDefaultHeaders: true` when noauth is detected
- [ ] Test with Fake API collection

---

### 3. Response Variables Used in Auth Headers

**Issue:**
Postman test scripts can set environment variables from responses:
```javascript
pm.environment.set("username", jsonData.username);
pm.environment.set("password", jsonData.password);
```

These variables are then used in collection-level auth. However, FlowSphere's `defaults.headers` is evaluated once at the start and doesn't support response references.

**Current Behavior:**
Parser resolves `{{username}}` from environment file at import time (static value), which doesn't work for response-based values.

**Root Cause:**
FlowSphere limitation - defaults can't reference responses. Auth is in `defaults.headers`, which is applied globally.

**Related to Issue #1:**
This is a subset of the "Response-based Auth" problem. Need per-node auth that can reference responses.

**Action Items:**
- [ ] Same as Issue #1 - requires new FlowSphere feature
- [ ] Document this limitation in feature spec
- [ ] Add note to ROADMAP.md that Postman import will be enhanced when feature is ready

---

## Files Modified

### Phase 1
- `postman-tools/parse-postman.js` - CLI parser
- `studio/js/postman-parser.js` - Studio parser

### Phase 2
- `studio/index.html` - Environment file upload UI
- `studio/js/main.js` - Environment file input listener
- `studio/js/bootstrap-modal-bridge.js` - Environment file reading
- `studio/js/modals.js` - Environment file reading (duplicate)

### Phase 3
- `studio/index.html` - Preview modal UI
- `studio/js/postman-preview.js` - Preview logic (NEW)
- `studio/js/core/feature-registry.js` - Registered postman-preview feature
- `studio/js/bootstrap-modal-bridge.js` - Modified parseAndLoad to show preview
- `studio/js/modals.js` - Modified parseAndLoad to show preview (duplicate)

## Next Steps

1. **Immediate (Bug Fixes):**
   - Fix Issue #2 (detect noauth and set skipDefaultHeaders)
   - Update ROADMAP.md with Response-based Auth feature
   - Update feature spec with limitations

2. **Future (New Feature Required):**
   - Implement "Response-based Auth" feature in FlowSphere core
   - Update Postman parser to leverage new feature
   - Support dynamic auth with response references

3. **Testing:**
   - Test with Fake API collection after fixes
   - Test with Endpoint 3 collection
   - Test auth conversion edge cases

## Related Features

- **Response-based Auth** (planned) - Allow nodes to use auth headers with response references
- **Multi-Environment Variable Groups** (planned) - Better environment management
- **Pre-request Script Mining** (future) - Extract variable assignments from pre-request scripts
