# Future Features & Enhancements

This document tracks potential improvements and feature requests for the HTTP Sequence Runner.

## FlowSphere Studio Enhancements

### Swagger/OpenAPI Import

Add Swagger/OpenAPI file import capability to FlowSphere Studio for automatic config generation from API specifications.

**Benefits:**
- Import API specifications directly in the browser
- Automatically generate nodes from endpoints
- Extract request/response schemas and validation rules
- Reduce manual config creation time
- Keep configs in sync with API documentation

**Proposed UI:**
```
Import Config ▼
├── From Template (existing)
├── From Postman Collection (existing)
└── From Swagger/OpenAPI (NEW)
```

**Import Dialog Features:**
- File upload for Swagger/OpenAPI JSON/YAML files
- Preview discovered endpoints before import
- Checkbox selection for which endpoints to include
- Auto-generate node IDs from operation IDs or paths
- Extract base URL from server definitions
- Detect authentication schemes (Bearer, API Key, OAuth)
- Generate validations from response schemas

**User Workflow:**
1. Click "Import Config" → "From Swagger/OpenAPI"
2. Upload swagger.json or openapi.yaml file
3. Preview list of discovered endpoints with checkboxes
4. Select which endpoints to import
5. Click "Import Selected" to add nodes to config
6. Edit/customize generated nodes as needed

**Supported Formats:**
- Swagger 2.0 (JSON/YAML)
- OpenAPI 3.0+ (JSON/YAML)

### Enhanced Postman Import

Improve the existing Postman import feature with multi-environment support and batch collection processing.

**Current Limitations:**
- Single collection file only
- No environment file support
- Manual variable resolution required

**Proposed Improvements:**

**1. Multiple Environment File Support:**
```
Import from Postman ▼
├── Collection File: [Browse...] collection.json
├── Environment Files: [Browse...] (multi-select)
│   ├── QA.postman_environment.json
│   ├── Staging.postman_environment.json
│   └── Production.postman_environment.json
└── [Import]
```

**Features:**
- Upload multiple environment files simultaneously
- Select which environment to use for variable resolution
- Preview variable values from each environment
- Generate separate configs for each environment
- Environment switcher dropdown to preview different configs

**2. Multiple Collection Import:**
- Support uploading multiple collection files
- Merge related collections into single config
- Detect duplicate requests across collections
- Combine request chains from different collections

**3. Better Variable Resolution:**
- Show preview of resolved vs unresolved variables
- Highlight which variables come from which environment
- Option to keep `{{ .vars.variableName }}` for runtime resolution
- Smart detection of dynamic values to preserve as `{{ $guid }}` or `{{ $timestamp }}`

**4. Import Preview & Customization:**
- Preview generated config before accepting import
- Edit node names, IDs, and order before finalizing
- Choose which requests to include/exclude
- Rearrange request sequence with drag-and-drop

**User Workflow:**
1. Click "Import Config" → "From Postman Collection"
2. Upload collection file + multiple environment files
3. Select environment for variable resolution
4. Preview discovered requests with variable values
5. Customize node order, names, and selections
6. Click "Import" to generate config
7. Review and edit generated config in Studio

### Export to Postman Collection/Environment

Add export capability to convert FlowSphere configs back into Postman collection and environment files for sharing with team members or using in Postman/Newman.

**Benefits:**
- Share FlowSphere configs with team members who use Postman
- Run FlowSphere sequences in Postman GUI for debugging
- Execute configs in CI/CD using Newman (Postman CLI)
- Collaborate with teams using different tools
- Preserve work when migrating between tools

**Proposed UI:**
```
Export Config ▼
├── Download JSON (existing)
├── Copy to Clipboard (existing)
└── Export to Postman (NEW)
    ├── Collection + Environment
    ├── Collection Only
    └── Environment Only
```

**Export Dialog Features:**
- Convert all nodes to Postman requests with proper structure
- Generate environment file from `variables` section
- Preserve request order and folder structure
- Map validations to Postman test scripts
- Convert conditions to pre-request scripts
- Handle variable substitution syntax translation
- Generate meaningful collection name and description

**Variable Conversion:**
- `{{ .vars.apiKey }}` → `{{apiKey}}` + environment file entry
- `{{ .responses.stepId.field }}` → Postman test script with `pm.environment.set()`
- `{{ $guid }}` → `{{$guid}}` (Postman dynamic variable)
- `{{ $timestamp }}` → `{{$timestamp}}` (Postman dynamic variable)

**Validation to Test Script Conversion:**
```json
// FlowSphere validation
{
  "validations": [
    { "httpStatusCode": 200 },
    { "jsonpath": ".token", "exists": true }
  ]
}
```
↓
```javascript
// Postman test script
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Token exists", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.token).to.exist;
});

// Save token for next request
pm.environment.set("authenticate_token", jsonData.token);
```

**Condition to Pre-request Script Conversion:**
```json
// FlowSphere condition
{
  "conditions": [
    { "node": "authenticate", "field": ".status", "equals": "success" }
  ]
}
```
↓
```javascript
// Postman pre-request script
const authStatus = pm.environment.get("authenticate_status");
if (authStatus !== "success") {
    console.log("Skipping request: authentication not successful");
    pm.execution.skipRequest();
}
```

**Export Options:**
- **Collection Name**: Auto-generate or custom input
- **Environment Name**: Auto-generate or custom input
- **Include Folders**: Group related nodes into folders
- **Variable Scope**: Choose between environment vs collection variables
- **Test Scripts**: Include/exclude validation test scripts
- **Download Format**: Single ZIP with both files, or separate downloads

**User Workflow:**
1. Click "Export Config" → "Export to Postman"
2. Choose export type (Collection + Environment, Collection Only, etc.)
3. Customize collection/environment names
4. Select export options (folders, test scripts, etc.)
5. Preview generated Postman structure
6. Click "Export" to download files
7. Import into Postman and verify

**Generated Files:**
- `collection-name.postman_collection.json` - All requests with tests
- `environment-name.postman_environment.json` - All variables
- `README.txt` - Notes about variable dependencies and execution order

## JavaScript/Node.js Version & NPM Package

**Status:** Planned - Complete replacement of Bash implementation

Rewrite FlowSphere in JavaScript/Node.js and publish as an npm package, completely replacing the current Bash script.

### Benefits

**Cross-Platform:**
- Pure JavaScript - truly OS-agnostic (Windows, macOS, Linux)
- No Bash/WSL dependency on Windows (native Node.js only)
- Better path handling, file operations, and system compatibility
- Easier to maintain consistent behavior across all platforms

**Developer Experience:**
- Global installation: `npm install -g flowsphere`
- Programmatic API for automated testing frameworks
- Better debugging with JavaScript tooling
- Access to npm ecosystem for future extensions

**Integrated Visual Editor:**
- Bundle FlowSphere Studio (config editor) in the npm package
- Launch with `flowsphere studio` command
- Single installation for both CLI and visual editor
- Versions always in sync (no separate deployment)

**CI/CD & Integration:**
- Native Node.js integration in modern pipelines
- Use as a library in existing test suites
- No system dependencies beyond Node.js

### Package Structure

```
flowsphere/
├── bin/
│   └── flowsphere.js          # CLI entry point
├── lib/
│   ├── executor.js            # Core execution engine (execute_step equivalent)
│   ├── validator.js           # Response validation logic
│   ├── substitution.js        # Variable substitution engine
│   ├── conditions.js          # Conditional execution evaluator
│   ├── http-client.js         # HTTP request handling (axios/fetch)
│   ├── logger.js              # Execution logging
│   └── utils.js               # Helpers (UUID, timestamp, etc.)
├── studio/                    # Bundled config editor
│   ├── index.html
│   ├── css/
│   │   └── styles.css
│   └── js/
│       ├── core/
│       ├── modals.js
│       ├── ui-renderer.js
│       └── autocomplete.js
├── examples/
│   ├── config-simple.json
│   ├── config-oauth.json
│   └── ...
├── tests/
│   ├── config-test-*.json
│   └── test-suite.js
├── package.json
└── README.md
```

### CLI Commands

```bash
# Install globally
npm install -g flowsphere

# Run a config file
flowsphere config.json
flowsphere examples/config-simple.json

# Start execution from a specific step
flowsphere config.json --start-step 5

# Launch visual config editor (opens browser)
flowsphere studio

# Display version
flowsphere --version

# Show help
flowsphere --help
```

### Programmatic API

```javascript
// Use as a library in your test suite
const FlowSphere = require('flowsphere');

// Run a config file
const result = await FlowSphere.run('config.json');
console.log(result.stepsExecuted, result.stepsSkipped);

// Run with options
await FlowSphere.run('config.json', {
  startStep: 5,
  enableDebug: true,
  onStepComplete: (step, response) => {
    console.log(`Step ${step.id} completed`);
  }
});

// Run from config object (no file)
const config = {
  defaults: { baseUrl: 'https://api.example.com' },
  nodes: [ /* ... */ ]
};
await FlowSphere.runConfig(config);
```

### Visual Editor Integration

```javascript
// bin/flowsphere.js
function launchStudio() {
  const express = require('express');
  const open = require('open');
  const path = require('path');

  const app = express();
  const studioPath = path.join(__dirname, '../studio');
  app.use(express.static(studioPath));

  const server = app.listen(0, () => {
    const port = server.address().port;
    const url = `http://localhost:${port}`;
    console.log(`🎨 FlowSphere Studio: ${url}`);
    open(url);  // Opens browser automatically
  });
}
```

### Migration Strategy

**Phase 1: Implementation (Weeks 1-3)**
- Implement core features in JavaScript
- Match exact behavior of Bash version
- Use OS-agnostic Node.js APIs only

**Phase 2: Testing & Validation (Week 4)**
- Run all existing test configs on Node.js version
- Test on Windows, macOS, and Linux
- Compare output with Bash version
- Fix any discrepancies

**Phase 3: Bundling & Publishing (Week 5)**
- Bundle config editor in npm package
- Configure package.json for global installation
- Test `flowsphere studio` command
- Publish to npm registry

**Phase 4: Cutover (Week 6)**
- Replace `flowsphere` Bash script with Node.js CLI
- Move Bash version to `legacy/` folder temporarily
- Update all documentation and README
- Announce migration to users

**Phase 5: Cleanup (Week 7+)**
- Monitor for issues, gather feedback
- Remove Bash script after validation period
- Archive Bash version in git history

### Critical Requirements

**100% Config File Compatibility:**
- All existing config files must work unchanged
- `examples/*.json` ✅
- `tests/*.json` ✅
- `scenarios/*.json` ✅
- User configs ✅

**Feature Parity:**
- Dynamic variables: `{{ $guid }}`, `{{ $timestamp }}`
- Global variables: `{{ .vars.key }}`
- Response references: `{{ .responses.nodeId.field }}`
- User input: `{{ .input.key }}`
- Conditional execution with AND logic
- HTTP status code + JSON path validations
- Numeric comparisons (>, <, >=, <=)
- Timeout control per step
- User input prompts
- Browser launch for OAuth flows
- Debug logging
- Execution logs (JSON format)
- Detailed skip reasons

**OS-Agnostic Implementation:**
- Use native Node.js modules (`fs`, `path`, `crypto`)
- Choose cross-platform npm packages only
- Test on Windows, macOS, Linux
- No shell commands (`exec`, `spawn`) unless absolutely necessary
- Handle file paths with `path.join()` everywhere

### Core Dependencies (All Cross-Platform)

```json
{
  "dependencies": {
    "axios": "^1.6.0",           // HTTP client
    "express": "^4.18.0",        // Local server for studio
    "open": "^9.0.0",            // Cross-platform browser launcher
    "commander": "^11.0.0"       // CLI argument parsing (optional)
  }
}
```

### package.json Configuration

```json
{
  "name": "flowsphere",
  "version": "1.0.0",
  "description": "HTTP sequence runner with conditional execution and variable substitution",
  "main": "lib/index.js",
  "bin": {
    "flowsphere": "./bin/flowsphere.js"
  },
  "files": [
    "bin/",
    "lib/",
    "studio/",
    "examples/",
    "README.md"
  ],
  "keywords": [
    "http",
    "api",
    "testing",
    "sequence",
    "workflow",
    "automation"
  ],
  "engines": {
    "node": ">=14.17.0"
  }
}
```

### Advantages Over Bash Version

| Feature | Bash | Node.js |
|---------|------|---------|
| Windows Support | WSL/Git Bash required | Native ✅ |
| Cross-Platform | Manual compatibility checks | Truly OS-agnostic ✅ |
| Debugging | Echo statements | Full debugging tools ✅ |
| IDE Support | Limited | Excellent (IntelliSense, etc.) ✅ |
| Testing | Manual testing | Jest/Mocha test frameworks ✅ |
| Programmatic Use | Not possible | API available ✅ |
| Visual Editor | Separate deployment | Bundled together ✅ |
| Installation | Manual (git clone) | `npm install -g` ✅ |
| Dependencies | curl, jq, bash | Node.js only ✅ |

### Success Criteria

- ✅ All existing config files run identically
- ✅ Works on Windows without WSL
- ✅ Published to npm registry
- ✅ Config editor launches with `flowsphere studio`
- ✅ Programmatic API functional
- ✅ Documentation updated
- ✅ Bash script removed from main codebase

## MCP Server for Code Generation

**Status:** Planned - Schema + Template Provider Architecture

Create a Model Context Protocol (MCP) server that provides **deep schema knowledge and code generation templates** to help AI agents generate executable code in multiple programming languages from FlowSphere config files.

### Core Concept

This is **NOT** about generating config files - it's about **transforming existing configs into standalone executable programs** in the user's preferred language. The MCP server acts as a specialized knowledge provider that ensures AI agents correctly implement ALL FlowSphere features when generating code.

### Benefits

**Language Flexibility:**
- Generate code in user's preferred language instead of requiring Bash
- No external dependencies - eliminate need for bash/curl/jq in production
- Embeddable - integrate sequences directly into existing applications

**Code Quality:**
- Type safety - strongly-typed languages get compile-time checks
- Customizable - generated code can be modified for specific needs
- Portable - works on any platform that supports the target language
- Version control friendly - code review and track API test sequences in Git

**Integration:**
- Integrate FlowSphere workflows into existing test frameworks (pytest, Jest, xUnit)
- Use generated code in CI/CD pipelines
- Maintain sequences as production code alongside main application

### MCP Server Architecture

The server follows **Option B: Schema + Code Templates** approach:

**1. Schema Documentation Provider**
Comprehensive knowledge of the FlowSphere config structure:
- All node properties (id, name, method, url, headers, body, etc.)
- Variable substitution syntax and types
- Condition evaluation logic (all operators and sources)
- Validation rules (httpStatusCode + jsonpath with all operators)
- Defaults merging behavior (skipDefaultHeaders, skipDefaultValidations)
- Special features (userPrompts, launchBrowser, dynamic placeholders)

**2. Code Template Library**
Pre-built, battle-tested code snippets for each target language:
- HTTP request execution patterns
- Variable substitution engines ({{ .responses.id.field }}, {{ .vars.key }}, etc.)
- Dynamic placeholder handlers ({{ $guid }}, {{ $timestamp }})
- Condition evaluators (statusCode, equals, notEquals, exists, greaterThan, etc.)
- Validation logic (all operators: exists, equals, notEquals, numeric comparisons)
- User prompt collectors
- Browser launcher utilities
- Timeout and error handling

**3. Validation Tools**
Ensures generated code handles all edge cases:
- Verifies all condition types are supported
- Checks nested jsonpath handling
- Validates array support in conditions
- Confirms variable substitution completeness

### Priority Target Languages

1. **Python** - pytest, unittest, behave (Cucumber), or standalone scripts
2. **JavaScript/TypeScript** - Jest, Mocha, cucumber-js (Cucumber), or standalone Node.js
3. **C# (.NET Latest)** - xUnit, NUnit, SpecFlow (Cucumber), or console applications

**BDD/Cucumber Support:**
Generate Gherkin feature files alongside step definitions for behavior-driven development:
- **Python**: Gherkin features + behave step definitions
- **JavaScript/TypeScript**: Gherkin features + cucumber-js step definitions
- **C#**: Gherkin features + SpecFlow step definitions

**Example Gherkin output:**
```gherkin
Feature: API Authentication Flow

  Scenario: User login and profile retrieval
    Given the API base URL is "https://api.example.com"
    When I POST to "/auth/login" with credentials
    Then the response status should be 200
    And the response should contain a "token" field
    When I GET "/users/me" with the authentication token
    Then the response status should be 200
    And the response should contain an "id" field
```

### Dependency Policy

- Dependencies are **allowed and encouraged** for production-quality code
- All packages must come from **trusted sources**:
  - Python: PyPI (pypi.org) - e.g., `requests`, `pytest`, `behave`
  - JavaScript/TypeScript: npm (npmjs.com) - e.g., `axios`, `jest`, `@cucumber/cucumber`
  - C#: NuGet (nuget.org) - e.g., `Newtonsoft.Json`, `xUnit`, `SpecFlow`
- Generated code must specify exact versions for reproducibility
- Prefer well-maintained, popular libraries with active communities

### Generated Code Format

All generated code should be **standalone applications** that can be:
- Run directly from command line
- Integrated into test frameworks (pytest, Jest, xUnit, Cucumber/BDD)
- Modified and customized by developers
- Version controlled and code reviewed
- Deployed to CI/CD pipelines
- Support both traditional test frameworks and BDD/Gherkin syntax

### Complete Feature Coverage

The MCP server ensures generated code handles ALL FlowSphere features:

✅ **HTTP Execution**
- All methods (GET, POST, PUT, DELETE, PATCH)
- Headers (with defaults merging or skipDefaultHeaders)
- Request bodies (JSON and form-urlencoded)
- Timeouts (global defaults + step overrides)
- baseUrl resolution for relative URLs

✅ **Variable Substitution**
- Global variables: `{{ .vars.key }}`
- Response references: `{{ .responses.nodeId.field.subfield }}`
- User input: `{{ .input.variableName }}`
- Dynamic placeholders: `{{ $guid }}` (new UUID per occurrence), `{{ $timestamp }}`
- Nested field access and array indexing

✅ **Condition Evaluation**
- All sources: step (by node ID), variable, input
- All operators: statusCode, equals, notEquals, exists, greaterThan, lessThan, greaterThanOrEqual, lessThanOrEqual
- AND logic (all conditions must be met)
- Variable substitution in condition values
- Array support in conditions
- Skip tracking (maintain response array indexing)

✅ **Validation**
- HTTP status code validation
- JSON path validations with all operators
- Multiple validations per step
- Default validations (merge or skip with skipDefaultValidations)
- Numeric comparisons (integers and floats)
- Fail-fast on validation errors

✅ **User Interaction**
- User prompts collection (userPrompts)
- Browser launching (launchBrowser with jsonpath)
- Cross-platform support (Windows, macOS, Linux)

✅ **State Management**
- Response storage by step ID
- User input storage per step
- Defaults merging logic
- Debug logging (if enableDebug is true)

### Example: Python with pytest

**Input Config:**
```json
{
  "variables": {
    "apiKey": "your-api-key"
  },
  "defaults": {
    "baseUrl": "https://api.example.com",
    "timeout": 30,
    "headers": { "Content-Type": "application/json" }
  },
  "nodes": [
    {
      "id": "authenticate",
      "name": "Login",
      "method": "POST",
      "url": "/auth/login",
      "body": { "username": "user", "password": "pass" },
      "validations": [
        { "httpStatusCode": 200 },
        { "jsonpath": ".token", "exists": true }
      ]
    },
    {
      "id": "getProfile",
      "name": "Get Profile",
      "method": "GET",
      "url": "/users/me",
      "headers": { "Authorization": "Bearer {{ .responses.authenticate.token }}" },
      "conditions": [
        { "node": "authenticate", "field": ".token", "exists": true }
      ]
    }
  ]
}
```

**Generated Python Code:**
```python
import requests
import pytest
import uuid
import time
import webbrowser
from typing import Dict, Any, Optional

class APISequence:
    """FlowSphere sequence executor - generated from config"""

    def __init__(self):
        self.responses = {}
        self.variables = {
            "apiKey": "your-api-key"
        }
        self.defaults = {
            "baseUrl": "https://api.example.com",
            "timeout": 30,
            "headers": {"Content-Type": "application/json"}
        }

    def substitute_variables(self, value: Any, user_input: Dict = None) -> Any:
        """Handle {{ }} variable substitution"""
        if not isinstance(value, str):
            return value

        # Dynamic placeholders - each {{ $guid }} gets unique UUID
        import re
        value = re.sub(r'\{\{\s*\$guid\s*\}\}', lambda m: str(uuid.uuid4()), value)

        # Timestamp - same for all occurrences in one step
        timestamp = str(int(time.time()))
        value = re.sub(r'\{\{\s*\$timestamp\s*\}\}', timestamp, value)

        # Global variables
        for key, val in self.variables.items():
            value = value.replace(f"{{{{ .vars.{key} }}}}", str(val))

        # Response references
        for node_id, response_data in self.responses.items():
            # Support nested field access like {{ .responses.nodeId.field.subfield }}
            pattern = re.compile(rf'\{{\{{\s*\.responses\.{node_id}\.([^\}}]+)\s*\}}}}')
            for match in pattern.finditer(value):
                field_path = match.group(1)
                field_value = self.extract_field(response_data, field_path)
                value = value.replace(match.group(0), str(field_value))

        # User input
        if user_input:
            for key, val in user_input.items():
                value = value.replace(f"{{{{ .input.{key} }}}}", str(val))

        return value

    def extract_field(self, data: Dict, path: str) -> Any:
        """Extract nested field using dot notation"""
        parts = path.split('.')
        result = data
        for part in parts:
            if isinstance(result, dict):
                result = result.get(part)
            else:
                return None
        return result

    def evaluate_condition(self, condition: Dict) -> bool:
        """Evaluate a single condition"""
        if "node" in condition:
            node_id = condition["node"]
            if node_id not in self.responses:
                return False

            response = self.responses[node_id]

            # Status code check
            if "statusCode" in condition:
                return response.get("_status_code") == condition["statusCode"]

            # Field-based checks
            if "field" in condition:
                field_value = self.extract_field(response, condition["field"].lstrip('.'))

                if "equals" in condition:
                    expected = self.substitute_variables(condition["equals"])
                    return str(field_value) == str(expected)
                if "notEquals" in condition:
                    expected = self.substitute_variables(condition["notEquals"])
                    return str(field_value) != str(expected)
                if "exists" in condition:
                    return (field_value is not None) == condition["exists"]
                if "greaterThan" in condition:
                    return float(field_value) > float(condition["greaterThan"])
                if "lessThan" in condition:
                    return float(field_value) < float(condition["lessThan"])
                if "greaterThanOrEqual" in condition:
                    return float(field_value) >= float(condition["greaterThanOrEqual"])
                if "lessThanOrEqual" in condition:
                    return float(field_value) <= float(condition["lessThanOrEqual"])

        return True

    def run_step(self, step_config: Dict) -> Optional[Dict]:
        """Execute a single step"""
        step_name = step_config["name"]

        # Evaluate conditions (AND logic - all must pass)
        if "conditions" in step_config:
            if not all(self.evaluate_condition(c) for c in step_config["conditions"]):
                print(f"⊘ Skipped: {step_name}")
                return None

        # Merge with defaults (unless skip flags are set)
        headers = {}
        if not step_config.get("skipDefaultHeaders", False):
            headers.update(self.defaults.get("headers", {}))
        headers.update(step_config.get("headers", {}))

        timeout = step_config.get("timeout", self.defaults.get("timeout", 30))

        url = step_config["url"]
        if not url.startswith("http"):
            url = self.defaults.get("baseUrl", "") + url

        # Substitute variables in headers and body
        headers = {k: self.substitute_variables(v) for k, v in headers.items()}

        body = step_config.get("body")
        if body:
            body = {k: self.substitute_variables(v) for k, v in body.items()}

        # Make HTTP request
        try:
            response = requests.request(
                method=step_config["method"],
                url=url,
                headers=headers,
                json=body,
                timeout=timeout
            )
        except requests.Timeout:
            raise Exception(f"Request timeout after {timeout}s: {step_name}")

        # Store response
        response_data = response.json()
        response_data["_status_code"] = response.status_code
        self.responses[step_config["id"]] = response_data

        # Run validations
        validations = step_config.get("validations", [])
        if not validations and not step_config.get("skipDefaultValidations", False):
            validations = self.defaults.get("validations", [{"httpStatusCode": 200}])

        for validation in validations:
            if "httpStatusCode" in validation:
                assert response.status_code == validation["httpStatusCode"], \
                    f"Expected status {validation['httpStatusCode']}, got {response.status_code}"

            if "jsonpath" in validation:
                value = self.extract_field(response_data, validation["jsonpath"].lstrip('.'))

                if "exists" in validation:
                    assert (value is not None) == validation["exists"], \
                        f"Field {validation['jsonpath']} existence check failed"
                if "equals" in validation:
                    assert str(value) == str(validation["equals"]), \
                        f"Field {validation['jsonpath']} expected {validation['equals']}, got {value}"
                if "notEquals" in validation:
                    assert str(value) != str(validation["notEquals"]), \
                        f"Field {validation['jsonpath']} should not equal {validation['notEquals']}"
                if "greaterThan" in validation:
                    assert float(value) > float(validation["greaterThan"]), \
                        f"Field {validation['jsonpath']} not greater than {validation['greaterThan']}"
                if "lessThan" in validation:
                    assert float(value) < float(validation["lessThan"]), \
                        f"Field {validation['jsonpath']} not less than {validation['lessThan']}"
                if "greaterThanOrEqual" in validation:
                    assert float(value) >= float(validation["greaterThanOrEqual"])
                if "lessThanOrEqual" in validation:
                    assert float(value) <= float(validation["lessThanOrEqual"])

        # Launch browser if configured
        if "launchBrowser" in step_config:
            url_to_launch = self.extract_field(response_data, step_config["launchBrowser"].lstrip('.'))
            if url_to_launch:
                webbrowser.open(url_to_launch)

        print(f"✅ Success: {step_name}")
        return response_data


def test_api_sequence():
    """Generated test from FlowSphere config"""
    sequence = APISequence()

    # Step 1: Login
    sequence.run_step({
        "id": "authenticate",
        "name": "Login",
        "method": "POST",
        "url": "/auth/login",
        "body": {"username": "user", "password": "pass"},
        "validations": [
            {"httpStatusCode": 200},
            {"jsonpath": ".token", "exists": True}
        ]
    })

    # Step 2: Get Profile
    sequence.run_step({
        "id": "getProfile",
        "name": "Get Profile",
        "method": "GET",
        "url": "/users/me",
        "headers": {"Authorization": "Bearer {{ .responses.authenticate.token }}"},
        "conditions": [
            {"node": "authenticate", "field": ".token", "exists": True}
        ]
    })


if __name__ == "__main__":
    # Run standalone
    test_api_sequence()
```

### Example: Python BDD with behave (Cucumber)

**Generated Gherkin Feature File (`features/api_sequence.feature`):**
```gherkin
Feature: API Sequence Execution
  Execute multi-step API workflows with variable substitution and validation

  Background:
    Given the API base URL is "https://api.example.com"
    And the default timeout is 30 seconds
    And the default headers are:
      | Content-Type | application/json |

  Scenario: Authenticate and retrieve user profile
    When I POST to "/auth/login" with body:
      """json
      {
        "username": "user",
        "password": "pass"
      }
      """
    Then the response status code should be 200
    And the response should have field ".token" that exists
    And I store the response as "authenticate"

    When I GET "/users/me" with headers:
      | Authorization | Bearer {{ .responses.authenticate.token }} |
    Then the response status code should be 200
    And the response should have field ".id" that exists
```

**Generated Step Definitions (`features/steps/api_steps.py`):**
```python
import requests
import uuid
import time
from behave import given, when, then
from hamcrest import assert_that, equal_to, is_not, none

class APIContext:
    """Shared context for API sequence execution"""
    def __init__(self):
        self.base_url = ""
        self.timeout = 30
        self.default_headers = {}
        self.responses = {}
        self.last_response = None

    def substitute_variables(self, value):
        """Handle {{ }} variable substitution"""
        if not isinstance(value, str):
            return value

        import re
        # Dynamic placeholders
        value = re.sub(r'\{\{\s*\$guid\s*\}\}', lambda m: str(uuid.uuid4()), value)
        timestamp = str(int(time.time()))
        value = re.sub(r'\{\{\s*\$timestamp\s*\}\}', timestamp, value)

        # Response references
        for node_id, response_data in self.responses.items():
            pattern = re.compile(rf'\{{\{{\s*\.responses\.{node_id}\.([^\}}]+)\s*\}}}}')
            for match in pattern.finditer(value):
                field_path = match.group(1)
                field_value = self.extract_field(response_data, field_path)
                value = value.replace(match.group(0), str(field_value))

        return value

    def extract_field(self, data, path):
        """Extract nested field using dot notation"""
        parts = path.split('.')
        result = data
        for part in parts:
            if isinstance(result, dict):
                result = result.get(part)
            else:
                return None
        return result


@given('the API base URL is "{base_url}"')
def step_set_base_url(context, base_url):
    if not hasattr(context, 'api'):
        context.api = APIContext()
    context.api.base_url = base_url


@given('the default timeout is {timeout:d} seconds')
def step_set_timeout(context, timeout):
    if not hasattr(context, 'api'):
        context.api = APIContext()
    context.api.timeout = timeout


@given('the default headers are')
def step_set_default_headers(context):
    if not hasattr(context, 'api'):
        context.api = APIContext()
    for row in context.table:
        context.api.default_headers[row[0]] = row[1]


@when('I {method} to "{endpoint}" with body')
def step_request_with_body(context, method, endpoint):
    if not hasattr(context, 'api'):
        context.api = APIContext()

    url = context.api.base_url + endpoint
    headers = dict(context.api.default_headers)

    # Parse JSON body from docstring
    import json
    body = json.loads(context.text)

    # Substitute variables
    body = {k: context.api.substitute_variables(v) for k, v in body.items()}
    headers = {k: context.api.substitute_variables(v) for k, v in headers.items()}

    response = requests.request(
        method=method,
        url=url,
        headers=headers,
        json=body,
        timeout=context.api.timeout
    )

    context.api.last_response = response


@when('I {method} "{endpoint}" with headers')
def step_request_with_headers(context, method, endpoint):
    if not hasattr(context, 'api'):
        context.api = APIContext()

    url = context.api.base_url + endpoint
    headers = dict(context.api.default_headers)

    # Add step-specific headers
    for row in context.table:
        header_value = context.api.substitute_variables(row[1])
        headers[row[0]] = header_value

    response = requests.request(
        method=method,
        url=url,
        headers=headers,
        timeout=context.api.timeout
    )

    context.api.last_response = response


@then('the response status code should be {status_code:d}')
def step_check_status_code(context, status_code):
    assert_that(context.api.last_response.status_code, equal_to(status_code),
                f"Expected status {status_code}, got {context.api.last_response.status_code}")


@then('the response should have field "{field_path}" that exists')
def step_check_field_exists(context, field_path):
    response_data = context.api.last_response.json()
    field_value = context.api.extract_field(response_data, field_path.lstrip('.'))
    assert_that(field_value, is_not(none()),
                f"Field {field_path} should exist in response")


@then('I store the response as "{node_id}"')
def step_store_response(context, node_id):
    response_data = context.api.last_response.json()
    response_data['_status_code'] = context.api.last_response.status_code
    context.api.responses[node_id] = response_data
```

**Run with:**
```bash
# Install dependencies
pip install behave requests pyhamcrest

# Run BDD tests
behave features/
```

### Usage Example

```bash
# AI agent uses MCP server to generate code:
User: "Generate Python pytest code from scenarios/config-onboarding.json"
AI: [Reads config via MCP server, gets schema knowledge + templates, generates complete Python code]

User: "Convert examples/config-oauth-example.json to TypeScript with Jest"
AI: [Generates TypeScript code with all features: OAuth, browser launch, validations]

User: "Create C# xUnit tests from tests/config-test-comparisons.json"
AI: [Generates C# test class with numeric comparison validations]

User: "Generate Cucumber BDD tests in Python from config.json"
AI: [Generates Gherkin feature file + behave step definitions with full FlowSphere feature support]

User: "Create SpecFlow tests in C# from scenarios/config-onboarding.json"
AI: [Generates Gherkin feature file + SpecFlow C# step definitions]
```

### Implementation Phases

**Phase 1 - Schema Provider:**
- Document all config properties and their behavior
- Provide comprehensive examples of each feature
- Explain edge cases and special handling

**Phase 2 - Template Library:**
- Create reusable code templates for Python, JS/TS, C#
- Cover all FlowSphere features (substitution, conditions, validations, etc.)
- Include error handling and logging patterns

**Phase 3 - Validation Tools:**
- Build checklist validator for generated code
- Verify all config features are implemented
- Test generated code against reference configs

**Phase 4 - Advanced Features:**
- Support custom template overrides
- Add code style customization options (linting, formatting)
- Enable plugin system for additional languages

## Plug-and-Play UI Architecture

Refactor FlowSphere Studio to have a lightweight, always-working base UI with optional plug-and-play features.

**Benefits:**
- Faster initial load time
- Better reliability (core UI never breaks from feature issues)
- Easier maintenance and testing
- Users can enable/disable features based on needs
- Simpler debugging and development

**Core Base UI (Always Works):**
- Basic config editor with form inputs
- Simple JSON preview (no fancy highlighting)
- Load/Save config files
- Add/Remove/Edit nodes manually
- No JavaScript dependencies beyond basic Bootstrap

**Plug-and-Play Features (Optional Modules):**
- **drag-drop-handler.js** - Drag-and-drop node reordering
- **autocomplete.js** - Variable substitution autocomplete
- **json-preview-toggle.js** - Collapsible JSON panel
- **theme-switcher.js** - Dark/Light theme toggle
- **postman-parser.js** - Import from Postman collections
- **json-sync-scroll.js** - Auto-scroll JSON to edited section
- **validation-mode.js** - Live config validation

**Proposed Architecture:**
```html
<!-- Base UI (required) -->
<script src="js/core/state.js"></script>
<script src="js/core/renderer.js"></script>
<script src="js/core/config-manager.js"></script>

<!-- Optional Features (load on demand) -->
<script src="js/features/drag-drop.js" data-feature="drag-drop"></script>
<script src="js/features/autocomplete.js" data-feature="autocomplete"></script>
<script src="js/features/theme-toggle.js" data-feature="theme"></script>
```

**Feature Toggle UI:**
```
Settings > Features
☑ Drag-and-Drop Reordering
☑ Variable Autocomplete
☑ JSON Preview Panel Toggle
☑ Theme Switcher
☐ Postman Import (disabled for faster load)
```

**Implementation:**
- Feature registry system with enable/disable API
- Graceful degradation (UI works even if feature fails to load)
- Each feature is self-contained with no cross-dependencies
- Features can be hot-swapped without page reload

---

**Contributing:** Feel free to propose additional features by creating an issue or pull request!
