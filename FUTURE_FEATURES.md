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
