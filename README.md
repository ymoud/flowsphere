# HTTP Sequence Runner

A cross-platform command-line tool written in Bash that sequentially executes HTTP requests defined in a JSON configuration file.

## Features

- **Sequential HTTP Execution** - Execute multiple HTTP requests in order
- **Conditional Execution** - Skip steps based on previous response status codes or field values
- **Dynamic Value Substitution** - Reference data from previous responses using step IDs or indices
- **Validation** - Verify HTTP status codes and JSON response values
- **Error Handling** - Stop execution immediately on validation failure
- **Clean Output** - Visual feedback with ✅/❌/⊘ indicators
- **Cross-Platform** - Works on Windows (Git Bash/WSL), macOS, and Linux
- **Auto-Install Dependencies** - Automatically detects and installs missing dependencies (curl, jq)

## Prerequisites

The following tools must be installed and available in your PATH:

- **bash** - Shell interpreter (version 4.0 or higher recommended)
- **curl** - HTTP client for making requests
- **jq** - JSON processor for parsing and extracting data

### Automatic Installation

**New!** The script now includes automatic dependency installation. When you run the script for the first time, if `curl` or `jq` are missing, you'll be prompted:

```
Missing required dependencies: jq
Would you like to attempt automatic installation? (y/n):
```

Simply press `y` and the script will:
- Detect your operating system and package manager
- Attempt to install missing dependencies automatically
- Verify the installation succeeded

**Supported package managers:**
- **Linux:** apt (Ubuntu/Debian), yum (RHEL/CentOS), dnf (Fedora)
- **macOS:** Homebrew
- **Windows:** Chocolatey, Scoop

If automatic installation fails or you prefer manual installation, detailed instructions will be provided.

### Manual Installation

**macOS (using Homebrew):**
```bash
brew install curl jq
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install curl jq
```

**Linux (RHEL/CentOS):**
```bash
sudo yum install curl jq
```

**Windows:**
- Use Git Bash (includes bash and curl) - download from https://git-scm.com/
- Install jq from https://stedolan.github.io/jq/download/ or via Chocolatey:
  ```bash
  choco install jq
  ```

## Installation

1. Clone or download this repository
2. Make the script executable:
   ```bash
   chmod +x apiseq.sh
   ```

## Usage

Run the script with a JSON configuration file:

```bash
./apiseq.sh config.json
```

## Configuration File Format

The configuration file is a JSON file with an optional `defaults` section and a `steps` array.

### Basic Structure (without defaults)

```json
{
  "steps": [
    {
      "name": "Step description",
      "method": "GET|POST|PUT|DELETE|PATCH",
      "url": "https://api.example.com/endpoint",
      "headers": {
        "Header-Name": "Header-Value"
      },
      "body": {
        "key": "value"
      },
      "expect": {
        "status": 200,
        "jsonpath": ".fieldName",
        "equals": "expectedValue"
      }
    }
  ]
}
```

### Structure with Defaults (Recommended)

To reduce duplication, you can define common values in a `defaults` section:

```json
{
  "defaults": {
    "baseUrl": "https://api.example.com",
    "headers": {
      "Content-Type": "application/json",
      "X-API-Key": "your-api-key"
    },
    "expect": {
      "status": 200
    }
  },
  "steps": [
    {
      "name": "Login",
      "method": "POST",
      "url": "/login",
      "body": {
        "username": "user",
        "password": "pass"
      },
      "expect": {
        "jsonpath": ".token"
      }
    },
    {
      "name": "Get Profile",
      "method": "GET",
      "url": "/profile",
      "headers": {
        "Authorization": "Bearer {{ .responses[0].token }}"
      }
    }
  ]
}
```

**Benefits of using defaults:**
- URLs can be relative (e.g., `/login` instead of `https://api.example.com/login`)
- Common headers are inherited by all steps (step headers override defaults)
- Default status code (200) doesn't need to be repeated
- Cleaner, more maintainable configuration files

### Field Descriptions

#### Defaults Section (optional)

- **baseUrl** (optional) - Base URL prepended to all relative step URLs
- **headers** (optional) - Default headers applied to all steps (step headers override these)
- **expect** (optional) - Default validation rules applied to all steps (step expectations override these)
  - **status** - Default expected HTTP status code (typically 200)

#### Step Fields

- **id** (required) - Unique identifier for the step (used in named references)
- **name** (required) - Human-readable description of the step
- **method** (required) - HTTP method: GET, POST, PUT, DELETE, PATCH
- **url** (required) - Full URL or relative path (if baseUrl is defined in defaults)
- **headers** (optional) - HTTP headers as key-value pairs (merged with default headers)
- **body** (optional) - Request body (default: JSON format)
- **bodyFormat** (optional) - Body encoding format: `"json"` (default) or `"form-urlencoded"`
- **condition** (optional) - Conditional execution rules (see Conditional Execution section)
- **expect** (optional) - Validation rules (merged with default expect):
  - **status** - Expected HTTP status code (overrides default)
  - **jsonpath** - JQ expression to extract a value (e.g., `.token`, `.data.id`)
  - **equals** - Expected value for the extracted field
  - **notEquals** - Value the field must NOT equal
  - **exists** - Check if field exists (true) or doesn't exist (false)

### Dynamic Value Substitution

You can reference data from previous responses using template syntax. Two formats are supported:

#### Named References (Recommended)

Reference responses by step ID for clearer, more maintainable configurations:

```
{{ .responses.stepId.field.subfield }}
```

Where:
- `stepId` is the unique ID of a previous step
- `field.subfield` is the JSON path to the value you want

**Example with Named References:**

```json
{
  "steps": [
    {
      "id": "login",
      "name": "Login",
      "method": "POST",
      "url": "https://api.example.com/login",
      "body": {
        "username": "user",
        "password": "pass"
      }
    },
    {
      "id": "getProfile",
      "name": "Get Profile",
      "method": "GET",
      "url": "https://api.example.com/profile",
      "headers": {
        "Authorization": "Bearer {{ .responses.login.token }}"
      }
    },
    {
      "id": "updateUser",
      "name": "Update User",
      "method": "PUT",
      "url": "https://api.example.com/users/{{ .responses.getProfile.id }}",
      "headers": {
        "Authorization": "Bearer {{ .responses.login.token }}"
      },
      "body": {
        "email": "newemail@example.com"
      }
    }
  ]
}
```

**Step ID Requirements:**
- All steps must have an `id` field
- IDs must start with a letter
- IDs can only contain letters, numbers, underscores, and hyphens
- IDs must be unique across all steps

**Benefits of Named References:**
- Self-documenting: `{{ .responses.login.token }}` is clearer than `{{ .responses[0].token }}`
- Maintainable: Adding/removing steps doesn't break references
- Less error-prone: No need to count array indices

#### Index-Based References (Legacy)

Reference responses by zero-based index (backward compatibility):

```
{{ .responses[N].field.subfield }}
```

Where:
- `N` is the zero-based index of the previous step (0 for first step, 1 for second, etc.)
- `field.subfield` is the JSON path to the value you want

**Note:** Index-based references still work for backward compatibility, but named references are recommended for new configurations.

### Form-Urlencoded Body Support

By default, request bodies are sent as JSON. For APIs that require `application/x-www-form-urlencoded` format (like OAuth endpoints or traditional form submissions), you can use either auto-detection or explicit format specification.

#### Auto-Detection via Content-Type Header

The tool automatically encodes the body as form-urlencoded when the `Content-Type` header is set:

```json
{
  "id": "getToken",
  "name": "OAuth Token Request",
  "method": "POST",
  "url": "https://oauth.example.com/token",
  "headers": {
    "Content-Type": "application/x-www-form-urlencoded"
  },
  "body": {
    "grant_type": "client_credentials",
    "client_id": "my-client-id",
    "client_secret": "my-secret",
    "scope": "read write"
  }
}
```

This sends: `grant_type=client_credentials&client_id=my-client-id&client_secret=my-secret&scope=read%20write`

#### Explicit bodyFormat Field

You can explicitly specify the encoding format using the `bodyFormat` field:

```json
{
  "id": "login",
  "name": "Login with Form Data",
  "method": "POST",
  "url": "https://example.com/login",
  "bodyFormat": "form-urlencoded",
  "body": {
    "username": "john",
    "password": "secret123",
    "remember": "true"
  }
}
```

**Supported bodyFormat values:**
- `"json"` (default) - JSON serialization
- `"form-urlencoded"` - URL-encoded key=value pairs

**Features:**
- ✅ Automatic URL encoding of special characters (spaces, `@`, `&`, `=`, etc.)
- ✅ Works with variable substitution: `"token": "{{ .responses.login.token }}"`
- ✅ Compatible with user input prompts: `"username": "{{ .input.username }}"`
- ✅ Validates nested objects/arrays are not used (not supported in form-urlencoded)

**Limitations:**
- Body must be a flat JSON object (no nested objects or arrays)
- All values are converted to strings and URL-encoded

### Conditional Execution

Steps can be executed conditionally based on previous responses. If a condition is not met, the step is skipped with a ⊘ indicator.

**Condition Structure (Named References - Recommended):**

```json
{
  "condition": {
    "step": "stepId",
    "statusCode": 200,
    "field": ".fieldName",
    "equals": "value",
    "notEquals": "value",
    "exists": true
  }
}
```

**Condition Structure (Index-Based - Legacy):**

```json
{
  "condition": {
    "response": 0,
    "statusCode": 200,
    "field": ".fieldName",
    "equals": "value",
    "notEquals": "value",
    "exists": true
  }
}
```

**Condition Parameters:**

- **step** (required for named) - Step ID to reference (e.g., `"login"`)
- **response** (required for index-based) - Zero-based index of the response to check
- **statusCode** (optional) - Check if previous response had this status code
- **field** (optional) - JSON path to a field in the response
- **equals** (optional) - Field value must equal this value
- **notEquals** (optional) - Field value must NOT equal this value
- **exists** (optional) - Check if field exists (true) or doesn't exist (false)

**Important Notes:**

- Use either `step` (named) or `response` (index) - not both
- You can check either `statusCode` OR field-based conditions (not both in same condition)
- Field-based conditions require the `field` parameter
- Skipped steps still maintain their position in the responses array (with empty values)
- Conditions reference completed steps only

#### Conditional Execution Examples

**1. Execute only if authentication succeeded:**

```json
{
  "id": "getUserData",
  "name": "Get user data",
  "method": "GET",
  "url": "https://api.example.com/user",
  "headers": {
    "Authorization": "Bearer {{ .responses.login.token }}"
  },
  "condition": {
    "step": "login",
    "statusCode": 200
  }
}
```

**2. Execute only if user is premium:**

```json
{
  "id": "accessPremium",
  "name": "Access premium features",
  "method": "GET",
  "url": "https://api.example.com/premium/dashboard",
  "condition": {
    "step": "getProfile",
    "field": ".isPremium",
    "equals": "true"
  }
}
```

**3. Execute only if user is NOT admin:**

```json
{
  "id": "showRegularContent",
  "name": "Show regular user content",
  "method": "GET",
  "url": "https://api.example.com/content/regular",
  "condition": {
    "step": "login",
    "field": ".role",
    "notEquals": "admin"
  }
}
```

**4. Execute only if field exists:**

```json
{
  "id": "applyReferral",
  "name": "Use referral code",
  "method": "POST",
  "url": "https://api.example.com/referrals/apply",
  "body": {
    "code": "{{ .responses.login.referralCode }}"
  },
  "condition": {
    "step": "login",
    "field": ".referralCode",
    "exists": true
  }
}
```

**5. Handle authentication failure:**

```json
{
  "steps": [
    {
      "id": "tryLogin",
      "name": "Try to login",
      "method": "POST",
      "url": "https://api.example.com/login",
      "body": {
        "username": "user",
        "password": "pass"
      }
    },
    {
      "id": "logSuccess",
      "name": "Log successful login",
      "method": "POST",
      "url": "https://api.example.com/audit/login-success",
      "condition": {
        "step": "tryLogin",
        "statusCode": 200
      }
    },
    {
      "id": "logFailure",
      "name": "Log failed login",
      "method": "POST",
      "url": "https://api.example.com/audit/login-failed",
      "condition": {
        "step": "tryLogin",
        "statusCode": 401
      }
    }
  ]
}
```

### Advanced Validation Examples

**1. Check if a field exists:**

```json
{
  "name": "Verify token is present",
  "method": "GET",
  "url": "https://api.example.com/session",
  "expect": {
    "status": 200,
    "jsonpath": ".token",
    "exists": true
  }
}
```

**2. Verify a field does NOT exist:**

```json
{
  "name": "Ensure no error field",
  "method": "POST",
  "url": "https://api.example.com/process",
  "expect": {
    "status": 200,
    "jsonpath": ".error",
    "exists": false
  }
}
```

**3. Check value is NOT a specific value:**

```json
{
  "name": "Verify user is not suspended",
  "method": "GET",
  "url": "https://api.example.com/user/status",
  "expect": {
    "status": 200,
    "jsonpath": ".status",
    "notEquals": "suspended"
  }
}
```

**4. Combine multiple validations:**

```json
{
  "name": "Complex validation",
  "method": "GET",
  "url": "https://api.example.com/account",
  "expect": {
    "status": 200,
    "jsonpath": ".role",
    "exists": true,
    "notEquals": "guest"
  }
}
```

## Example Output

**Without conditional steps:**

```
Starting HTTP sequence with 5 steps...

Step 1: POST https://api.example.com/login ✅ Status 200 OK
Step 2: GET https://api.example.com/profile ✅ Status 200 OK
Step 3: PUT https://api.example.com/users/123/settings ✅ Status 200 OK
Step 4: GET https://api.example.com/profile ✅ Status 200 OK
Step 5: POST https://api.example.com/logout ✅ Status 200 OK

Sequence completed: 5 executed, 0 skipped 🎉
```

**With conditional steps (some skipped):**

```
Starting HTTP sequence with 7 steps...

Step 1: POST https://api.example.com/login ✅ Status 200 OK
Step 2: GET https://api.example.com/profile ✅ Status 200 OK
Step 3: PUT https://api.example.com/users/123/premium-settings ⊘ SKIPPED (condition not met)
Step 4: POST https://api.example.com/emails/welcome ⊘ SKIPPED (condition not met)
Step 5: GET https://api.example.com/admin/dashboard ⊘ SKIPPED (condition not met)
Step 6: GET https://api.example.com/profile ✅ Status 200 OK
Step 7: POST https://api.example.com/logout ✅ Status 200 OK

Sequence completed: 4 executed, 3 skipped 🎉
```

## Error Handling

If a step fails validation, the script will:
1. Print an error message with ❌ indicator
2. Show the status code and/or validation error
3. Exit immediately (remaining steps will not execute)

**Example error output:**
```
Step 2: GET https://api.example.com/profile ❌ Status 401 (expected 200)
Response body: {"error": "Unauthorized"}
```

## Advanced Examples

### Testing a REST API Workflow

```json
{
  "steps": [
    {
      "name": "Create new item",
      "method": "POST",
      "url": "https://api.example.com/items",
      "headers": {
        "Content-Type": "application/json"
      },
      "body": {
        "name": "Test Item",
        "description": "Created by apiseq"
      },
      "expect": {
        "status": 201,
        "jsonpath": ".id"
      }
    },
    {
      "name": "Verify item was created",
      "method": "GET",
      "url": "https://api.example.com/items/{{ .responses[0].id }}",
      "expect": {
        "status": 200,
        "jsonpath": ".name",
        "equals": "Test Item"
      }
    },
    {
      "name": "Delete the item",
      "method": "DELETE",
      "url": "https://api.example.com/items/{{ .responses[0].id }}",
      "expect": {
        "status": 204
      }
    }
  ]
}
```

### Health Check Sequence

```json
{
  "steps": [
    {
      "name": "Check API health",
      "method": "GET",
      "url": "https://api.example.com/health",
      "expect": {
        "status": 200,
        "jsonpath": ".status",
        "equals": "healthy"
      }
    },
    {
      "name": "Check database connection",
      "method": "GET",
      "url": "https://api.example.com/health/db",
      "expect": {
        "status": 200,
        "jsonpath": ".connected",
        "equals": "true"
      }
    }
  ]
}
```

## Portability Notes

- The script uses POSIX-compliant Bash features for maximum portability
- All variables are properly quoted to handle spaces and special characters
- Temporary files are cleaned up automatically on exit
- Works with Bash 4.0+ (available on all modern systems)

## Debugging

### Enabling Debug Mode

To see detailed execution logs, add `"enableDebug": true` to your configuration file:

```json
{
  "enableDebug": true,
  "defaults": {
    "baseUrl": "https://api.example.com"
  },
  "steps": [
    ...
  ]
}
```

### Debug Output

When debug mode is enabled, the script outputs detailed information to stderr:

```
DEBUG: Loop iteration 0 of 5
DEBUG: Processing step 1: Login
DEBUG: About to execute step 1 (no condition)
DEBUG: execute_step - start, step_num=1
DEBUG: execute_step - calling merge_with_defaults
DEBUG: execute_step - merge completed
DEBUG: execute_step - extracting step details
DEBUG: execute_step - extracted url=https://api.example.com/login
DEBUG: execute_step - calling substitute_variables with url=https://api.example.com/login
DEBUG: substitute_variables - input=https://api.example.com/login
DEBUG: substitute_variables - responses_json array size=0
DEBUG: substitute_variables - user_input_json={}
DEBUG: substitute_variables - returning output=https://api.example.com/login
DEBUG: execute_step - after substitution url=https://api.example.com/login
DEBUG: Headers found in step_json
DEBUG: step_json headers: {"Content-Type":"application/json"}
DEBUG: Processing header: Content-Type = application/json
DEBUG: After substitution: Content-Type = application/json
DEBUG: Replacing GENERATED_GUID with 7e35d8d8-e1fa-4d6c-83d0-20a0262770e6
DEBUG: Final curl command: curl -s -w '\n%{http_code}' -X POST -H 'Content-Type: application/json' -d '{"user":"test"}' 'https://api.example.com/login'
```

### What Debug Logs Show

Debug logs help you understand:

- **Request flow:** See each step being processed
- **Variable substitution:** Watch how `{{ .responses[N].field }}` placeholders are replaced
- **Header processing:** See which headers are being sent
- **GUID generation:** View generated UUIDs for `GENERATED_GUID` placeholders
- **Final curl commands:** See the exact curl command being executed

### Debugging Common Issues

#### 1. Script hangs after "Starting HTTP sequence"

**Symptoms:**
```
Loaded defaults from configuration
Starting HTTP sequence with 51 steps...
[script stops here]
```

**Solution:**
- Enable debug mode to see where it stops
- Check if the first step has a long timeout
- Verify the API endpoint is accessible
- Check for network issues or firewall blocking

#### 2. Headers not being sent

**Symptoms:**
```
Step 1: POST /endpoint ❌ Status 418 (expected 200)
```

**Debug approach:**
- Enable debug mode and look for "Processing header" lines
- Verify headers are in the "DEBUG: Final curl command" output
- Check that custom headers are merged with default headers

#### 3. Variable substitution fails

**Symptoms:**
```
Error: Could not extract value from .responses[0].token
```

**Debug approach:**
- Enable debug mode to see what's in `responses_json array`
- Check the jsonpath is correct (case-sensitive)
- Verify the previous step succeeded and returned the expected field
- Look at "Response body:" output to see actual response structure

#### 4. GUID generation issues

**Symptoms:**
```
Error: Invalid UUID format
```

**Debug approach:**
- Look for "DEBUG: Replacing GENERATED_GUID with [uuid]" messages
- Verify uuidgen is installed: `which uuidgen`
- Check `/proc/sys/kernel/random/uuid` exists on Linux

### Redirecting Debug Output

Debug logs go to stderr, so you can redirect them separately:

```bash
# Save debug logs to a file
./apiseq.sh config.json 2> debug.log

# View only debug output
./apiseq.sh config.json 2>&1 > /dev/null

# Save both stdout and stderr
./apiseq.sh config.json > output.log 2>&1
```

## Troubleshooting

**"curl is not installed" error:**
- Install curl using your package manager (see Prerequisites section)

**"jq is not installed" error:**
- Install jq using your package manager (see Prerequisites section)

**"Invalid JSON in configuration file" error:**
- Validate your JSON using a tool like https://jsonlint.com/

**Variable substitution not working:**
- Ensure you're using the correct syntax: `{{ .responses[N].field }}`
- Check that the response index N exists (0-based indexing)
- Verify the JSON path is correct by examining the response
- Enable debug mode to see the actual substitution process

## License

This project is provided as-is for educational and practical use.

## Contributing

Feel free to submit issues or pull requests for improvements!
