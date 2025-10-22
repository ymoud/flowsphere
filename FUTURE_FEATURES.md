# Future Features & Enhancements

This document tracks potential improvements and feature requests for the HTTP Sequence Runner.

## 1. Named Response References

**Status:** Proposed
**Priority:** Medium
**Complexity:** Medium

### Problem

Currently, responses are referenced using zero-based array indices:

```json
{
  "steps": [
    {
      "name": "Login",
      "method": "POST",
      "url": "/login"
    },
    {
      "name": "Get Profile",
      "method": "GET",
      "url": "/profile",
      "headers": {
        "Authorization": "Bearer {{ .responses[0].token }}"
      }
    },
    {
      "name": "Update Settings",
      "method": "PUT",
      "url": "/users/{{ .responses[1].id }}/settings",
      "headers": {
        "Authorization": "Bearer {{ .responses[0].token }}"
      }
    }
  ]
}
```

**Issues with current approach:**

- **Not intuitive:** Need to count steps to determine index (0-based)
- **Fragile:** Adding/removing steps breaks all subsequent references
- **Hard to read:** `{{ .responses[0].token }}` doesn't convey what step it references
- **Error-prone:** Easy to reference wrong index after refactoring

### Proposed Solution

Allow referencing responses by step name:

```json
{
  "steps": [
    {
      "name": "Login",
      "method": "POST",
      "url": "/login"
    },
    {
      "name": "Get Profile",
      "method": "GET",
      "url": "/profile",
      "headers": {
        "Authorization": "Bearer {{ .responses.Login.token }}"
      }
    },
    {
      "name": "Update Settings",
      "method": "PUT",
      "url": "/users/{{ .responses['Get Profile'].id }}/settings",
      "headers": {
        "Authorization": "Bearer {{ .responses.Login.token }}"
      }
    }
  ]
}
```

**Benefits:**

- ✅ **Self-documenting:** Clear which step is being referenced
- ✅ **Maintainable:** Adding/removing steps doesn't break references
- ✅ **Readable:** `{{ .responses.Login.token }}` is more intuitive
- ✅ **Less error-prone:** Name-based references are easier to get right

### Implementation Considerations

1. **Name sanitization:** Convert step names to valid identifiers
   - Replace spaces with underscores: `"Get Profile"` → `Get_Profile`
   - Or use bracket notation: `{{ .responses['Get Profile'].id }}`

2. **Backward compatibility:** Keep supporting index-based references
   - `{{ .responses[0].token }}` still works
   - `{{ .responses.Login.token }}` also works

3. **Duplicate names:** Handle steps with identical names
   - Error on duplicate names during validation?
   - Append index suffix: `Login`, `Login_2`, `Login_3`?
   - Require unique names when using named references?

4. **Step name lookup:** Build a name-to-index mapping
   ```bash
   declare -A response_names
   response_names["Login"]=0
   response_names["Get Profile"]=1
   ```

5. **Pattern matching:** Update regex to support both syntaxes
   ```bash
   # Current: {{ .responses[0].field }}
   \{\{[[:space:]]*\.responses\[([0-9]+)\]\.([^}]+)[[:space:]]*\}\}

   # New: {{ .responses.Login.field }} or {{ .responses['Login'].field }}
   \{\{[[:space:]]*\.responses\.([a-zA-Z0-9_-]+)\.([^}]+)[[:space:]]*\}\}
   \{\{[[:space:]]*\.responses\['([^']+)'\]\.([^}]+)[[:space:]]*\}\}
   ```

### Example Implementation Approach

```bash
# Build name-to-index mapping during execution
declare -A response_names

# In main() loop when executing steps:
for ((i=0; i<num_steps; i++)); do
    local name=$(echo "$step" | jq -r '.name')

    # Execute step...
    execute_step "$i" "$step"

    # Map name to index
    response_names["$name"]=$i
done

# In substitute_variables():
# First try named reference: {{ .responses.StepName.field }}
while [[ "$output" =~ \{\{[[:space:]]*\.responses\.([a-zA-Z0-9_-]+)\.([^}]+)[[:space:]]*\}\} ]]; do
    local step_name="${BASH_REMATCH[1]}"
    local jsonpath="${BASH_REMATCH[2]}"

    # Lookup index by name
    if [[ -v response_names["$step_name"] ]]; then
        local index="${response_names[$step_name]}"
        # Extract value using index...
    else
        echo "Error: No step named '$step_name' found" >&2
        exit 1
    fi
done

# Then try index-based reference: {{ .responses[0].field }}
# (existing implementation)
```

### Migration Path

1. Add named reference support alongside existing index-based
2. Update documentation with examples of both syntaxes
3. Recommend named references for new configs
4. Consider deprecating index-based in future major version

### Related Features

- **Step aliases:** Allow multiple names for same step
- **Step tags:** Group steps and reference by tag
- **Response caching:** Cache responses for reuse across runs

---

## 2. Form-Urlencoded Body Support

**Status:** Proposed
**Priority:** Medium
**Complexity:** Low

### Problem

Currently, the tool only supports JSON request bodies. The `body` field is always serialized as JSON:

```json
{
  "name": "Login",
  "method": "POST",
  "url": "/login",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "username": "user",
    "password": "pass"
  }
}
```

This sends: `{"username":"user","password":"pass"}`

**However**, many APIs (especially OAuth endpoints, traditional form submissions) expect `application/x-www-form-urlencoded` format:

```
username=user&password=pass
```

**Current workarounds don't work:**
- Setting `Content-Type: application/x-www-form-urlencoded` header still sends JSON body
- No way to send URL-encoded parameters
- Can't use curl's `--data-urlencode` functionality

### Use Cases

1. **OAuth Token Requests:**
   ```
   POST /oauth/token
   Content-Type: application/x-www-form-urlencoded

   grant_type=authorization_code&code=abc123&client_id=xyz&client_secret=secret
   ```

2. **Traditional Form Submissions:**
   ```
   POST /login
   Content-Type: application/x-www-form-urlencoded

   username=john&password=secret123
   ```

3. **API Endpoints that require form data:**
   ```
   POST /webhook/callback
   Content-Type: application/x-www-form-urlencoded

   event=user.created&user_id=12345&timestamp=1234567890
   ```

### Proposed Solution

#### Option 1: Auto-detect based on Content-Type

Automatically encode body as form-urlencoded when Content-Type header is set:

```json
{
  "name": "OAuth Token",
  "method": "POST",
  "url": "/oauth/token",
  "headers": {
    "Content-Type": "application/x-www-form-urlencoded"
  },
  "body": {
    "grant_type": "authorization_code",
    "code": "{{ .responses[0].code }}",
    "client_id": "my-client-id",
    "client_secret": "my-secret"
  }
}
```

**Script behavior:**
- Detects `Content-Type: application/x-www-form-urlencoded` header
- Converts body object to URL-encoded string: `grant_type=authorization_code&code=abc&client_id=my-client-id&client_secret=my-secret`
- Uses curl with proper encoding

#### Option 2: Explicit bodyFormat field

Add a `bodyFormat` field to explicitly specify encoding:

```json
{
  "name": "OAuth Token",
  "method": "POST",
  "url": "/oauth/token",
  "bodyFormat": "form-urlencoded",
  "body": {
    "grant_type": "authorization_code",
    "code": "{{ .responses[0].code }}"
  }
}
```

**Supported formats:**
- `"json"` (default) - JSON serialization
- `"form-urlencoded"` - URL-encoded key=value pairs
- `"raw"` - Send body as-is (string value)

#### Option 3: Both approaches combined

Support both auto-detection AND explicit format for flexibility:
- Auto-detect from Content-Type header (convenient)
- Allow `bodyFormat` to override (explicit control)

### Implementation Details

```bash
# In process_body() function:
process_body() {
    local body_json="$1"
    local content_type="${2:-application/json}"  # Pass Content-Type from step
    local body_format="${3:-auto}"                # Pass explicit bodyFormat if set

    # Determine format
    if [ "$body_format" = "form-urlencoded" ] || [[ "$content_type" == *"application/x-www-form-urlencoded"* ]]; then
        # Convert JSON object to URL-encoded string
        local encoded=""
        local keys=$(echo "$body_json" | jq -r 'keys[]')
        while IFS= read -r key; do
            local value=$(echo "$body_json" | jq -r ".[\"$key\"]")
            # URL encode the value
            value=$(printf '%s' "$value" | jq -sRr @uri)
            if [ -n "$encoded" ]; then
                encoded+="&"
            fi
            encoded+="${key}=${value}"
        done <<< "$keys"
        echo "$encoded"
    else
        # Existing JSON processing
        local body_str=$(echo "$body_json" | jq -c '.')
        # ... rest of current implementation
        echo "$body_str"
    fi
}

# In execute_step(), detect Content-Type:
local content_type="application/json"
if echo "$step_json" | jq -e '.headers["Content-Type"]' > /dev/null 2>&1; then
    content_type=$(echo "$step_json" | jq -r '.headers["Content-Type"]')
fi

local body_format="auto"
if echo "$step_json" | jq -e '.bodyFormat' > /dev/null 2>&1; then
    body_format=$(echo "$step_json" | jq -r '.bodyFormat')
fi

# Process body with format awareness
body=$(process_body "$body" "$content_type" "$body_format")
```

### URL Encoding

Use jq's built-in `@uri` filter for proper URL encoding:

```bash
# URL encode a value
echo '"hello world"' | jq -sRr @uri
# Output: hello%20world

# URL encode special characters
echo '"user@example.com"' | jq -sRr @uri
# Output: user%40example.com
```

### Example Configurations

**OAuth 2.0 Token Request:**
```json
{
  "name": "Get Access Token",
  "method": "POST",
  "url": "https://oauth.example.com/token",
  "headers": {
    "Content-Type": "application/x-www-form-urlencoded"
  },
  "body": {
    "grant_type": "client_credentials",
    "client_id": "{{ .env.CLIENT_ID }}",
    "client_secret": "{{ .env.CLIENT_SECRET }}",
    "scope": "read write"
  }
}
```

**Form Login:**
```json
{
  "name": "Login",
  "method": "POST",
  "url": "https://example.com/login",
  "bodyFormat": "form-urlencoded",
  "body": {
    "username": "{{ .input.username }}",
    "password": "{{ .input.password }}",
    "remember": "true"
  }
}
```

### Benefits

- ✅ Support OAuth 2.0 token endpoints
- ✅ Work with traditional form-based APIs
- ✅ Maintain backward compatibility (JSON is default)
- ✅ Proper URL encoding of special characters
- ✅ Simple configuration syntax

### Testing Considerations

Test with:
1. Special characters in values (`@`, `&`, `=`, spaces, unicode)
2. Empty values
3. Nested objects (should error or flatten?)
4. Array values (should error or join?)
5. Variable substitution in form values

---

## 3. Other Potential Features

### Cookie Management
- Automatic cookie jar support
- Save/load cookies between steps
- Handle Set-Cookie headers automatically

### Retry Logic
- Configurable retry attempts on failure
- Exponential backoff
- Retry only on specific status codes

### Parallel Execution
- Execute independent steps in parallel
- Define dependency graphs
- Improve performance for large sequences

### Environment Variables
- Load config from environment variables
- Template syntax: `{{ .env.API_KEY }}`
- Support for .env files

### Response Assertions
- More validation types (regex, greater/less than, array length)
- Custom assertion functions
- JSON schema validation

### Output Formats
- JSON output mode for CI/CD
- JUnit XML for test reporting
- Markdown report generation

---

**Contributing:** Feel free to propose additional features by creating an issue or pull request!
