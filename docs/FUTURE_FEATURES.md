# Future Features & Enhancements

This document tracks potential improvements and feature requests for the HTTP Sequence Runner.

## Config Schema Refinement

Rename config properties for better clarity and consistency with UI terminology.

**Changes:**
- Rename `steps` → `nodes` (aligns with FlowSphere Studio UI)
- Rename `prompts` → `userPrompts` (more descriptive and explicit)

**Current Schema:**
```json
{
  "steps": [
    {
      "id": "authenticate",
      "name": "Login",
      "method": "POST",
      "url": "/auth/login",
      "prompts": {
        "username": "Enter username:",
        "password": "Enter password:"
      }
    }
  ]
}
```

**Proposed Schema:**
```json
{
  "nodes": [
    {
      "id": "authenticate",
      "name": "Login",
      "method": "POST",
      "url": "/auth/login",
      "userPrompts": {
        "username": "Enter username:",
        "password": "Enter password:"
      }
    }
  ]
}
```

**Benefits:**
- Consistent terminology between config files and UI
- More intuitive for new users (FlowSphere Studio uses "nodes" everywhere)
- `userPrompts` is more descriptive than generic `prompts`
- Better API design for future JavaScript/Node.js version

**Migration Strategy:**
- Maintain backward compatibility (support both old and new property names)
- Add deprecation warnings when old names are detected
- FlowSphere Studio auto-converts on save (with user confirmation)
- Provide migration tool: `flowsphere migrate config.json --output config-v2.json`
- Update all examples and documentation to use new schema

## JavaScript/Node.js Version & NPM Package

Create a JavaScript/Node.js implementation of FlowSphere and publish it as an npm package.

**Benefits:**
- Cross-platform compatibility without Bash dependency
- Easier integration with Node.js projects and CI/CD pipelines
- Better Windows support (no WSL/Git Bash required)
- Access to npm ecosystem for plugins and extensions
- Programmatic API for use in automated testing frameworks

**Proposed Package Structure:**
```
flowsphere/
├── bin/
│   └── flowsphere.js          # CLI entry point
├── lib/
│   ├── executor.js            # Core execution engine
│   ├── validator.js           # Response validation
│   ├── substitution.js        # Variable substitution
│   └── conditions.js          # Conditional execution
├── package.json
└── README.md
```

**Usage:**
```bash
# Install globally
npm install -g flowsphere

# Run a config
flowsphere config.json

# Or use programmatically
const FlowSphere = require('flowsphere');
await FlowSphere.run('config.json');
```

**Compatibility:**
- Maintain 100% config file compatibility with Bash version
- Support all existing features (variables, conditions, validations, etc.)
- Keep FlowSphere Studio config editor compatible with both versions

## MCP Server for Code Generation

Create a Model Context Protocol (MCP) server that generates executable code in any programming language based on FlowSphere config files.

**Benefits:**
- Generate production-ready test code from config files
- Support multiple languages (Python, Go, Java, C#, Ruby, etc.)
- Integrate FlowSphere workflows into existing test frameworks
- Enable code review and version control of API test sequences
- Preserve validations, conditions, and variable substitution in generated code

**Proposed Functionality:**
```bash
# Start MCP server
flowsphere-mcp-server

# Claude Code/AI can then use it to generate code:
"Generate Python pytest code from config.json"
"Convert this config to Go test code"
"Create Java RestAssured tests from config-onboarding.json"
```

**Generated Code Features:**
- All HTTP requests with proper headers and body
- Variable substitution using language-native templating
- Response validation with assertions
- Conditional execution (if/else based on previous responses)
- User input prompts where applicable
- Browser launch capability for OAuth flows
- Proper error handling and logging

**Example Output (Python):**
```python
import requests
import pytest

def test_api_sequence():
    # Step 1: Authenticate
    response_1 = requests.post(
        "https://api.example.com/auth/login",
        json={"username": "user", "password": "pass"},
        timeout=30
    )
    assert response_1.status_code == 200
    token = response_1.json()["token"]

    # Step 2: Get user data (using token from step 1)
    response_2 = requests.get(
        f"https://api.example.com/users/me",
        headers={"Authorization": f"Bearer {token}"},
        timeout=30
    )
    assert response_2.status_code == 200
    assert response_2.json()["id"] is not None
```

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
