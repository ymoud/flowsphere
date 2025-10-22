# Future Features & Enhancements

This document tracks potential improvements and feature requests for the HTTP Sequence Runner.

## 1. Form-Urlencoded Body Support

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

## 2. Other Potential Features

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
