# HTTP Sequence Runner

A cross-platform command-line tool written in Bash that sequentially executes HTTP requests defined in a JSON configuration file.

## Features

- **Sequential HTTP Execution** - Execute multiple HTTP requests in order
- **Conditional Execution** - Skip steps based on previous response status codes or field values
- **Dynamic Value Substitution** - Reference data from previous responses using `{{ .responses[N].field }}`
- **Validation** - Verify HTTP status codes and JSON response values
- **Error Handling** - Stop execution immediately on validation failure
- **Clean Output** - Visual feedback with ✅/❌/⊘ indicators
- **Cross-Platform** - Works on Windows (Git Bash/WSL), macOS, and Linux

## Prerequisites

The following tools must be installed and available in your PATH:

- **bash** - Shell interpreter (version 4.0 or higher recommended)
- **curl** - HTTP client for making requests
- **jq** - JSON processor for parsing and extracting data

### Installing Prerequisites

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

- **name** (required) - Human-readable description of the step
- **method** (required) - HTTP method: GET, POST, PUT, DELETE, PATCH
- **url** (required) - Full URL or relative path (if baseUrl is defined in defaults)
- **headers** (optional) - HTTP headers as key-value pairs (merged with default headers)
- **body** (optional) - Request body (will be sent as JSON)
- **condition** (optional) - Conditional execution rules (see Conditional Execution section)
- **expect** (optional) - Validation rules (merged with default expect):
  - **status** - Expected HTTP status code (overrides default)
  - **jsonpath** - JQ expression to extract a value (e.g., `.token`, `.data.id`)
  - **equals** - Expected value for the extracted field

### Dynamic Value Substitution

You can reference data from previous responses using the template syntax:

```
{{ .responses[N].field.subfield }}
```

Where:
- `N` is the zero-based index of the previous step (0 for first step, 1 for second, etc.)
- `field.subfield` is the JSON path to the value you want

**Examples:**

```json
{
  "steps": [
    {
      "name": "Login",
      "method": "POST",
      "url": "https://api.example.com/login",
      "body": {
        "username": "user",
        "password": "pass"
      }
    },
    {
      "name": "Get Profile",
      "method": "GET",
      "url": "https://api.example.com/profile",
      "headers": {
        "Authorization": "Bearer {{ .responses[0].token }}"
      }
    },
    {
      "name": "Update User",
      "method": "PUT",
      "url": "https://api.example.com/users/{{ .responses[1].id }}",
      "headers": {
        "Authorization": "Bearer {{ .responses[0].token }}"
      },
      "body": {
        "email": "newemail@example.com"
      }
    }
  ]
}
```

### Conditional Execution

Steps can be executed conditionally based on previous responses. If a condition is not met, the step is skipped with a ⊘ indicator.

**Condition Structure:**

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

- **response** (required) - Zero-based index of the response to check
- **statusCode** (optional) - Check if previous response had this status code
- **field** (optional) - JSON path to a field in the response
- **equals** (optional) - Field value must equal this value
- **notEquals** (optional) - Field value must NOT equal this value
- **exists** (optional) - Check if field exists (true) or doesn't exist (false)

**Important Notes:**

- You can check either `statusCode` OR field-based conditions (not both in same condition)
- Field-based conditions require the `field` parameter
- Skipped steps still maintain their position in the responses array (with empty values)
- Conditions reference completed steps only (step 3 can check responses 0, 1, or 2)

#### Conditional Execution Examples

**1. Execute only if authentication succeeded:**

```json
{
  "name": "Get user data",
  "method": "GET",
  "url": "https://api.example.com/user",
  "headers": {
    "Authorization": "Bearer {{ .responses[0].token }}"
  },
  "condition": {
    "response": 0,
    "statusCode": 200
  }
}
```

**2. Execute only if user is premium:**

```json
{
  "name": "Access premium features",
  "method": "GET",
  "url": "https://api.example.com/premium/dashboard",
  "condition": {
    "response": 1,
    "field": ".isPremium",
    "equals": "true"
  }
}
```

**3. Execute only if user is NOT admin:**

```json
{
  "name": "Show regular user content",
  "method": "GET",
  "url": "https://api.example.com/content/regular",
  "condition": {
    "response": 0,
    "field": ".role",
    "notEquals": "admin"
  }
}
```

**4. Execute only if field exists:**

```json
{
  "name": "Use referral code",
  "method": "POST",
  "url": "https://api.example.com/referrals/apply",
  "body": {
    "code": "{{ .responses[0].referralCode }}"
  },
  "condition": {
    "response": 0,
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
      "name": "Try to login",
      "method": "POST",
      "url": "https://api.example.com/login",
      "body": {
        "username": "user",
        "password": "pass"
      }
    },
    {
      "name": "Log successful login",
      "method": "POST",
      "url": "https://api.example.com/audit/login-success",
      "condition": {
        "response": 0,
        "statusCode": 200
      }
    },
    {
      "name": "Log failed login",
      "method": "POST",
      "url": "https://api.example.com/audit/login-failed",
      "condition": {
        "response": 0,
        "statusCode": 401
      }
    }
  ]
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

## License

This project is provided as-is for educational and practical use.

## Contributing

Feel free to submit issues or pull requests for improvements!
