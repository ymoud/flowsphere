# Multi-Environment Variable Groups

**Status:** Planned

**Priority:** 9

## Overview

Support multiple variable groups (environments) in FlowSphere configs, allowing users to switch between different sets of variables (dev, staging, production) without modifying the config file.

## Problem Statement

**Current Limitation:**
FlowSphere has a single `variables` section in the config. To test the same workflow against different environments, users must:
- Manually edit variable values before each run
- Maintain separate config files for each environment (duplicate node definitions)
- Use external tools to swap variable values
- Risk accidentally running workflows against the wrong environment

**Example:**
```json
{
  "variables": {
    "baseUrl": "https://api.dev.example.com",  // Must edit this manually
    "apiKey": "dev-api-key-123"                // Must edit this manually
  },
  "nodes": [ /* 50 nodes defining the workflow */ ]
}
```

To run against staging, user must:
1. Open config file
2. Change `baseUrl` to `https://api.staging.example.com`
3. Change `apiKey` to `staging-api-key-456`
4. Save file
5. Run workflow
6. Remember to change back to dev values later

**Pain Points:**
- Error-prone (forgetting to change all variables)
- Tedious for frequent environment switches
- Config file constantly marked as "modified" in git
- Risk of accidentally committing production credentials
- Difficult to maintain consistency across environments
- No visual indicator of which environment is active

## Solution

**Multi-Environment Variable Groups:**
Define multiple named variable groups in the config, select which group to use at runtime.

```json
{
  "variableGroups": {
    "dev": {
      "baseUrl": "https://api.dev.example.com",
      "apiKey": "dev-api-key-123",
      "userId": "test-user-dev"
    },
    "staging": {
      "baseUrl": "https://api.staging.example.com",
      "apiKey": "staging-api-key-456",
      "userId": "test-user-staging"
    },
    "production": {
      "baseUrl": "https://api.example.com",
      "apiKey": "prod-api-key-789",
      "userId": "real-user-prod"
    }
  },
  "defaultEnvironment": "dev",
  "nodes": [ /* workflow nodes remain unchanged */ ]
}
```

**Runtime Selection:**
- **CLI**: `flowsphere config.json --env=staging`
- **Studio Flow Runner**: Dropdown menu to select environment before starting
- **Studio Try it Out**: Dropdown in modal to select environment for single node test

**Benefits:**
- One config file for all environments
- Zero manual editing when switching environments
- Visual indicator of active environment
- Safer (reduces risk of wrong-environment execution)
- Faster workflow development and testing
- Better git hygiene (no accidental credential commits)
- Consistent variable names across environments

## Key Features

### 1. Config Format

**New `variableGroups` Section:**
```json
{
  "variableGroups": {
    "dev": {
      "baseUrl": "https://api.dev.example.com",
      "apiKey": "dev-key",
      "timeout": 30
    },
    "staging": {
      "baseUrl": "https://api.staging.example.com",
      "apiKey": "staging-key",
      "timeout": 60
    },
    "production": {
      "baseUrl": "https://api.example.com",
      "apiKey": "prod-key",
      "timeout": 120
    }
  },
  "defaultEnvironment": "dev",
  "nodes": [...]
}
```

**Backwards Compatibility:**
- Existing `variables` section still supported
- If both `variableGroups` and `variables` exist:
  - `variableGroups` takes precedence (new behavior)
  - `variables` used as fallback if environment not specified
- Configs without `variableGroups` work unchanged

**Environment Inheritance:**
Define common variables once, override in specific environments:
```json
{
  "variableGroups": {
    "_common": {
      "apiVersion": "v2",
      "timeout": 30,
      "retries": 3
    },
    "dev": {
      "baseUrl": "https://api.dev.example.com",
      "apiKey": "dev-key"
    },
    "production": {
      "baseUrl": "https://api.example.com",
      "apiKey": "prod-key",
      "timeout": 120  // Override common timeout for production
    }
  }
}
```

Variables resolved in order:
1. Check selected environment group
2. Check `_common` group (if exists)
3. Check legacy `variables` section (if exists)
4. Error if not found

### 2. CLI Integration

**New `--env` Flag:**
```bash
# Run with specific environment
flowsphere config.json --env=staging

# Run with default environment (from config)
flowsphere config.json

# Error if environment doesn't exist
flowsphere config.json --env=nonexistent
# ❌ Error: Environment 'nonexistent' not found in config
# Available environments: dev, staging, production
```

**Environment Override:**
```bash
# Override specific variables via CLI (highest priority)
flowsphere config.json --env=dev --var baseUrl=http://localhost:3000
```

**Environment Listing:**
```bash
# List available environments
flowsphere config.json --list-envs

# Output:
# Available environments in config.json:
#   dev (default)
#   staging
#   production
```

### 3. Studio Integration

**Flow Runner - Environment Selector:**
```
┌─────────────────────────────────────────┐
│ ▶ Run Workflow                          │
│                                         │
│   Environment: [dev ▼]                  │
│                 ├── dev (default)       │
│                 ├── staging             │
│                 └── production          │
│                                         │
│   Execution Mode: [▶ Run All ▼]         │
│                                         │
│   [Cancel]  [Start Execution]           │
└─────────────────────────────────────────┘
```

**Environment Indicator During Execution:**
```
┌─────────────────────────────────────────┐
│ 🌍 Environment: staging                 │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                         │
│ ✓ Step 1: Login                         │
│ ▶ Step 2: Get User Profile (running...) │
│ ○ Step 3: Update Settings               │
└─────────────────────────────────────────┘
```

**Try it Out - Environment Selector:**
```
┌─────────────────────────────────────────┐
│ Try it Out: Get User Profile            │
│                                         │
│   Environment: [staging ▼]              │
│                                         │
│   Request Preview                       │
│   GET /users/123                        │
│   baseUrl: https://api.staging.example.com │
│   apiKey: staging-key                   │
│                                         │
│   [Execute]                             │
└─────────────────────────────────────────┘
```

**Studio Editor - Environment Manager:**
```
┌─────────────────────────────────────────┐
│ Variable Groups                         │
│                                         │
│   [dev ▼] ☑ Default                     │
│   baseUrl: https://api.dev.example.com  │
│   apiKey:  dev-key-123                  │
│                                         │
│   [+ Add Variable]  [Remove Group]      │
│                                         │
│   [+ Add Environment Group]             │
└─────────────────────────────────────────┘
```

### 4. Variable Resolution Logic

**Resolution Order (highest to lowest priority):**
1. **CLI override**: `--var key=value`
2. **Selected environment group**: `variableGroups.staging.baseUrl`
3. **Common group**: `variableGroups._common.timeout`
4. **Legacy variables**: `variables.apiKey`
5. **Error**: Variable not found

**Example:**
```json
{
  "variableGroups": {
    "_common": {
      "apiVersion": "v2",
      "timeout": 30
    },
    "dev": {
      "baseUrl": "https://api.dev.example.com"
    }
  },
  "variables": {
    "fallbackKey": "legacy-value"
  }
}
```

When running with `--env=dev --var timeout=60`:
- `{{ .vars.baseUrl }}` → `https://api.dev.example.com` (from dev group)
- `{{ .vars.timeout }}` → `60` (from CLI override)
- `{{ .vars.apiVersion }}` → `v2` (from _common group)
- `{{ .vars.fallbackKey }}` → `legacy-value` (from legacy variables)

### 5. Environment-Specific Execution Logs

**Log Files Include Environment Name:**
```
logs/
├── execution_log_20250109_143022_dev.json
├── execution_log_20250109_145530_staging.json
└── execution_log_20250109_150245_production.json
```

**Log Metadata:**
```json
{
  "executionId": "abc-123",
  "config": "config-api-test.json",
  "environment": "staging",
  "timestamp": "2025-01-09T14:55:30Z",
  "variables": {
    "baseUrl": "https://api.staging.example.com",
    "apiKey": "***REDACTED***"
  },
  "steps": [...]
}
```

**Security:**
- Sensitive variables (containing "key", "secret", "password", "token") are redacted in logs
- Full values available during execution, only redacted in saved logs

### 6. Studio Visual Indicators

**Active Environment Badge:**
- Show environment name in header/status bar
- Color-coded badges:
  - 🟢 dev (green)
  - 🟡 staging (yellow)
  - 🔴 production (red)
  - ⚪ custom (gray)

**Confirmation Prompt for Production:**
```
┌─────────────────────────────────────────┐
│ ⚠️ Confirm Production Execution          │
│                                         │
│   You are about to run this workflow    │
│   against the PRODUCTION environment.   │
│                                         │
│   Environment: production               │
│   Base URL: https://api.example.com     │
│                                         │
│   Are you sure you want to continue?    │
│                                         │
│   [Cancel]  [Yes, Execute]              │
└─────────────────────────────────────────┘
```

**Environment-Specific Variable Highlighting:**
Show which environment provides each variable in autocomplete:
```
{{ .vars. }}
  ├── baseUrl (dev)
  ├── apiKey (dev)
  ├── timeout (_common)
  └── apiVersion (_common)
```

## UI/UX Design

### Studio - Variable Groups Editor

**Tab-Based Environment Switcher:**
```
┌────────────────────────────────────────────────────┐
│ Global Configuration                               │
│ ┌──────────────────────────────────────────────┐   │
│ │ Variable Groups                              │   │
│ │                                              │   │
│ │ [dev ☆] [staging] [production] [+ Add]      │   │
│ │ ─────────────────────────────────────────    │   │
│ │                                              │   │
│ │ Environment: dev (default)                   │   │
│ │                                              │   │
│ │ baseUrl                                      │   │
│ │ [https://api.dev.example.com____________]    │   │
│ │                                              │   │
│ │ apiKey                                       │   │
│ │ [dev-key-123_____________________________]   │   │
│ │                                              │   │
│ │ userId                                       │   │
│ │ [test-user-dev___________________________]   │   │
│ │                                              │   │
│ │ [+ Add Variable]                             │   │
│ │                                              │   │
│ │ ☐ Set as default environment                 │   │
│ │                                              │   │
│ └──────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────┘
```

**Common Variables Section:**
```
┌────────────────────────────────────────────────────┐
│ Variable Groups                                    │
│                                                    │
│ [_common] [dev] [staging] [production] [+ Add]    │
│ ─────────────────────────────────────────────      │
│                                                    │
│ Common Variables (inherited by all environments)  │
│                                                    │
│ apiVersion                                         │
│ [v2_________________________________________]      │
│                                                    │
│ timeout                                            │
│ [30_________________________________________]      │
│                                                    │
│ retries                                            │
│ [3__________________________________________]      │
│                                                    │
│ [+ Add Variable]                                   │
└────────────────────────────────────────────────────┘
```

### CLI Output

**Environment Indicator in Execution:**
```
$ flowsphere config.json --env=staging

FlowSphere v0.2.0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Config:      config.json
Environment: staging 🟡
Variables:   3 loaded (baseUrl, apiKey, userId)
Nodes:       12 steps
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

▶ Step 1: Login
  POST https://api.staging.example.com/auth/login
  Status: 200 OK
  ✓ Validated status = 200
  Duration: 234ms

✓ Execution completed successfully (12/12 steps)
```

## Implementation Phases

### Phase 1 - Basic Environment Groups (CLI)

**Goal:** Core functionality for environment groups in CLI mode.

**Tasks:**
- Add `variableGroups` parsing in config loader
- Implement `--env` flag in CLI
- Add environment selection logic in variable substitution
- Support `defaultEnvironment` in config
- Maintain backwards compatibility with `variables` section
- Add environment name to execution logs

**Files to Create/Modify:**
- `lib/config-loader.js` - Parse `variableGroups` section
- `lib/substitution.js` - Environment-aware variable resolution
- `bin/flowsphere.js` - Add `--env` flag
- `lib/executor.js` - Pass environment to substitution
- `lib/logger.js` - Include environment in log metadata

**Acceptance Criteria:**
- ✓ Parse `variableGroups` from config
- ✓ CLI `--env` flag selects environment
- ✓ Variables resolved from selected environment
- ✓ Default environment used if `--env` not specified
- ✓ Backwards compatible with existing `variables` configs
- ✓ Environment name included in execution logs

### Phase 2 - Common Variables & Inheritance

**Goal:** Support shared variables across environments with override capability.

**Tasks:**
- Implement `_common` group support
- Add variable inheritance logic (environment → common → legacy)
- Handle variable override precedence
- Add CLI `--var` override support
- Add `--list-envs` command

**Enhancements:**
- CLI override: `--var key=value`
- Common variables: `variableGroups._common`
- Variable inheritance chain
- List environments: `--list-envs`

**Acceptance Criteria:**
- ✓ `_common` variables inherited by all environments
- ✓ Environment-specific variables override common
- ✓ CLI `--var` overrides config values
- ✓ `--list-envs` shows available environments
- ✓ Clear error messages for missing environments

### Phase 3 - Studio UI Integration

**Goal:** Visual environment management and selection in Studio.

**Tasks:**
- Add environment selector to Flow Runner modal
- Add environment selector to Try it Out modal
- Show active environment indicator during execution
- Add environment tabs to variable editor
- Color-coded environment badges
- Confirmation prompt for production execution

**UI Components:**
- Environment dropdown in Flow Runner
- Environment dropdown in Try it Out
- Environment badge in execution view
- Tab-based environment editor
- Production confirmation modal

**Files to Modify:**
- `studio/js/flow-runner.js` - Environment selector
- `studio/js/try-it-out.js` - Environment selector
- `studio/js/config-manager.js` - Environment editor UI
- `studio/js/main.js` - Active environment indicator
- `studio/server.js` - Pass environment to executor

**Acceptance Criteria:**
- ✓ User can select environment in Flow Runner
- ✓ User can select environment in Try it Out
- ✓ Active environment shown during execution
- ✓ Variable editor supports multiple environment tabs
- ✓ Production executions require confirmation
- ✓ Environment badges color-coded correctly

### Phase 4 - Advanced Features & Polish

**Goal:** Enhanced UX, security, and developer experience.

**Tasks:**
- Sensitive variable redaction in logs
- Environment-specific autocomplete hints
- Environment comparison view (show diff between envs)
- Import environments from Postman
- Export environment as `.env` file
- Environment templates (starter configs for common patterns)

**Advanced Features:**
- Log redaction for sensitive keys
- Environment diff viewer
- Postman environment import
- `.env` export for external tools
- Environment templates

**Acceptance Criteria:**
- ✓ Sensitive variables redacted in logs
- ✓ Autocomplete shows variable source (env/common)
- ✓ Can compare variables across environments
- ✓ Import Postman environments into `variableGroups`
- ✓ Export environment as `.env` file

## Edge Cases & Error Handling

### Missing Environment
```bash
$ flowsphere config.json --env=qa

❌ Error: Environment 'qa' not found in config
Available environments: dev, staging, production

Suggestion: Add 'qa' environment to variableGroups section
```

### Missing Variable in Environment
```json
{
  "variableGroups": {
    "dev": { "baseUrl": "..." },
    "staging": { /* missing baseUrl */ }
  }
}
```
When running with `--env=staging` and using `{{ .vars.baseUrl }}`:
```
❌ Error: Variable 'baseUrl' not found in environment 'staging'

Available variables in 'staging': (none)
Available variables in '_common': (none)
Available variables in 'variables': (none)

Suggestion: Add 'baseUrl' to variableGroups.staging
```

### Conflicting Config Sections
```json
{
  "variables": { "baseUrl": "old-style" },
  "variableGroups": { "dev": { "baseUrl": "new-style" } }
}
```
Warning displayed:
```
⚠️  Warning: Both 'variables' and 'variableGroups' found in config
Using 'variableGroups' (new format)
'variables' section will be used as fallback only

Suggestion: Migrate all variables to 'variableGroups' format
```

### Default Environment Not Specified
```json
{
  "variableGroups": {
    "dev": {...},
    "staging": {...}
  }
  // No defaultEnvironment specified
}
```
Behavior:
- CLI without `--env`: Use first environment alphabetically (dev)
- Studio: Require user to select environment (no auto-run)

### Empty Environment Group
```json
{
  "variableGroups": {
    "dev": {},  // Empty!
    "staging": { "baseUrl": "..." }
  }
}
```
Warning:
```
⚠️  Warning: Environment 'dev' has no variables defined
```
Execution continues, but all variable references fail unless found in `_common` or `variables`.

## Security Considerations

### Sensitive Variable Redaction

**Auto-Redact Keywords:**
Variables containing these keywords are redacted in logs:
- `key`, `apikey`, `api_key`
- `secret`, `client_secret`
- `password`, `pass`
- `token`, `access_token`, `auth_token`
- `credential`, `creds`

**Log Output:**
```json
{
  "environment": "production",
  "variables": {
    "baseUrl": "https://api.example.com",
    "apiKey": "***REDACTED***",
    "clientSecret": "***REDACTED***",
    "username": "admin"
  }
}
```

### Production Environment Protection

**Confirmation Required:**
- Studio: Modal confirmation before executing against production
- CLI: Optional `--confirm-prod` flag required for production
  ```bash
  flowsphere config.json --env=production --confirm-prod
  ```
- Without flag: Error message with safety warning

**Git Best Practices:**
- Add `.env` to `.gitignore`
- Document environment setup in README
- Never commit production credentials
- Use environment-specific `.gitignore` patterns

## Migration Guide

### From Single `variables` to `variableGroups`

**Before:**
```json
{
  "variables": {
    "baseUrl": "https://api.dev.example.com",
    "apiKey": "dev-key"
  },
  "nodes": [...]
}
```

**After:**
```json
{
  "variableGroups": {
    "dev": {
      "baseUrl": "https://api.dev.example.com",
      "apiKey": "dev-key"
    },
    "staging": {
      "baseUrl": "https://api.staging.example.com",
      "apiKey": "staging-key"
    },
    "production": {
      "baseUrl": "https://api.example.com",
      "apiKey": "prod-key"
    }
  },
  "defaultEnvironment": "dev",
  "nodes": [...]
}
```

**Migration Steps:**
1. Create `variableGroups` section
2. Move existing `variables` to `variableGroups.dev`
3. Add additional environments (staging, production)
4. Set `defaultEnvironment: "dev"`
5. Remove old `variables` section (optional - kept as fallback)
6. Test execution with `--env=dev` to verify

**Studio Migration Tool:**
- Button in editor: "Migrate to Variable Groups"
- Automatically converts `variables` → `variableGroups.dev`
- Prompts user to add additional environments
- One-click migration

## Example Use Cases

### API Testing Across Environments

**Config:**
```json
{
  "variableGroups": {
    "_common": {
      "apiVersion": "v2",
      "timeout": 30
    },
    "dev": {
      "baseUrl": "https://api.dev.example.com",
      "apiKey": "dev-key-123",
      "testUserId": "test-user-dev"
    },
    "staging": {
      "baseUrl": "https://api.staging.example.com",
      "apiKey": "staging-key-456",
      "testUserId": "test-user-staging"
    },
    "production": {
      "baseUrl": "https://api.example.com",
      "apiKey": "prod-key-789",
      "testUserId": "real-user-id",
      "timeout": 60
    }
  },
  "defaultEnvironment": "dev",
  "nodes": [
    {
      "id": "login",
      "name": "Login",
      "method": "POST",
      "url": "{{ .vars.baseUrl }}/auth/login",
      "headers": {
        "X-API-Key": "{{ .vars.apiKey }}"
      },
      "body": {
        "userId": "{{ .vars.testUserId }}"
      }
    }
  ]
}
```

**Usage:**
```bash
# Test against dev (default)
flowsphere api-test.json

# Test against staging
flowsphere api-test.json --env=staging

# Test against production (requires confirmation)
flowsphere api-test.json --env=production --confirm-prod
```

### OAuth Flow with Environment-Specific Clients

**Config:**
```json
{
  "variableGroups": {
    "dev": {
      "oauthClientId": "dev-client-id",
      "oauthClientSecret": "dev-client-secret",
      "oauthRedirectUri": "http://localhost:54321/oauth/callback"
    },
    "production": {
      "oauthClientId": "prod-client-id",
      "oauthClientSecret": "prod-client-secret",
      "oauthRedirectUri": "https://app.example.com/oauth/callback"
    }
  },
  "nodes": [
    {
      "id": "get-auth-url",
      "method": "POST",
      "url": "https://oauth.provider.com/authorize",
      "body": {
        "client_id": "{{ .vars.oauthClientId }}",
        "redirect_uri": "{{ .vars.oauthRedirectUri }}"
      }
    },
    {
      "id": "exchange-token",
      "method": "POST",
      "url": "https://oauth.provider.com/token",
      "body": {
        "code": "{{ .responses.get-auth-url.callback.code }}",
        "client_id": "{{ .vars.oauthClientId }}",
        "client_secret": "{{ .vars.oauthClientSecret }}"
      }
    }
  ]
}
```

## Success Criteria

- ✅ User can define multiple environment groups in config
- ✅ User can select environment via CLI `--env` flag
- ✅ User can select environment via Studio dropdown
- ✅ Variables resolved correctly from selected environment
- ✅ Common variables inherited by all environments
- ✅ Environment-specific overrides work correctly
- ✅ Default environment used when none specified
- ✅ Backwards compatible with existing `variables` configs
- ✅ Environment name included in execution logs
- ✅ Production environment requires confirmation
- ✅ Sensitive variables redacted in logs
- ✅ Clear error messages for missing environments/variables
- ✅ Studio UI shows active environment during execution

## Related Features

- **Enhanced Postman Import** (Priority 5): Import Postman environments as `variableGroups`
- **OAuth Callback Capture** (Priority 8): Environment-specific OAuth redirect URIs
- **Execution Log Visualizer** (Priority 3): Filter/compare logs by environment

## Technical Notes

- Environment selection happens at config load time, not runtime
- Variable substitution uses selected environment's values
- No runtime environment switching (must restart execution)
- Execution logs are environment-specific (separate files)
- Studio persists last-selected environment in localStorage
- CLI defaults to `defaultEnvironment` from config
- Common variables pattern (`_common`) inspired by Ansible group_vars
- Sensitive variable redaction uses keyword pattern matching (case-insensitive)
