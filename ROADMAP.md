# FlowSphere Roadmap

This document outlines the planned features and enhancements for FlowSphere.

## Priority Overview

### Planned Features

Features listed in priority order (highest to lowest):

| Priority | Feature | Status |
|----------|---------|--------|
| 1 | Node Templates & Import System | Planned |
| 2 | Response Headers Access | Planned |
| 3 | OAuth Callback Auto-Capture | Planned |
| 4 | Try it Out - Individual Node Testing | Planned |
| 5 | Execution Log Visualizer | Planned |
| 6 | Swagger/OpenAPI Import | Planned |
| 7 | Enhanced Postman Import | Planned |
| 8 | Export to Postman Collection/Environment | Planned |

### Completed & External Features

| Feature | Status |
|---------|--------|
| Test Execution with Proxy (Bypass CORS) | ✅ Completed |
| JavaScript/Node.js Version & NPM Package | ✅ Completed |
| Plug-and-Play UI Architecture | ✅ Completed |
| MCP Server for Code Generation | [External Repository](https://github.com/ymoud/flowsphere-mcp) |

---

## Detailed Feature Specifications

## FlowSphere Studio Enhancements

### Node Templates & Import System

**Status:** Planned

Replace the current template system with a more flexible two-button approach that separates "starting fresh" from "adding to existing work".

**Problem with Current System:**
- The "New" button dropdown mixes complete templates with individual patterns
- Users must load a full template and delete unwanted nodes to get specific features
- No way to add common patterns (auth, user input) to an existing flow incrementally
- Building from scratch requires either starting empty or modifying templates

**Proposed Solution:**

Two distinct buttons that serve different purposes:

**1. Load Config Button**
Opens a modal with three import options:
- **Load FlowSphere JSON Config** - Import existing config file
- **Import from Postman Files** - Convert Postman collection to FlowSphere config
- **Import from Swagger File** - Generate config from OpenAPI/Swagger spec (future)

**Modal UX:**
```
┌─────────────────────────────────────┐
│  Load Config                     × │
├─────────────────────────────────────┤
│ Choose import source:               │
│                                     │
│ [📄 FlowSphere JSON Config]        │
│ [📮 Postman Collection]            │
│ [📋 Swagger/OpenAPI Spec] 🔜       │
│                                     │
│ ⚠️  This will replace your current │
│    flow. Save before proceeding.   │
└─────────────────────────────────────┘
```

**2. Import Nodes Button**
Opens a modal showing categorized node templates that can be added to the current flow:

**Modal UX:**
```
┌─────────────────────────────────────┐
│  Import Nodes                    × │
├─────────────────────────────────────┤
│ Select node template to add:        │
│                                     │
│ 🔐 Authentication                   │
│  • Bearer Token Auth               │
│  • OAuth 2.0 Flow (2 nodes)        │
│  • API Key Header                  │
│                                     │
│ 👤 User Interaction                 │
│  • Username/Password Prompt         │
│  • Verification Code Input          │
│  • Custom User Input                │
│                                     │
│ ✅ Validation Examples              │
│  • Status + Extract Token           │
│  • Paginated Response               │
│  • Multi-field Validation           │
│                                     │
│ 🔀 Conditional Flow                 │
│  • Premium vs Free User             │
│  • Skip on Error                    │
│                                     │
│ ℹ️  Nodes will be added to the end │
│    of your current flow.           │
└─────────────────────────────────────┘
```

**Node Template Categories:**

**Authentication:**
- **Bearer Token Auth** - Simple login with token extraction
- **OAuth 2.0 Flow** - Two nodes: get auth URL → exchange code for token
- **API Key Header** - Static API key in headers

**User Interaction:**
- **Username/Password Prompt** - Interactive credential collection
- **Verification Code Input** - 2FA/MFA code prompt
- **Custom User Input** - Generic template for custom prompts

**Validation Examples:**
- **Status + Extract Token** - Common auth response validation
- **Paginated Response** - Validate array length and pagination metadata
- **Multi-field Validation** - Multiple jsonpath validations example

**Conditional Flow:**
- **Premium vs Free User** - Conditional execution based on user tier
- **Skip on Error** - Graceful error handling pattern

**Key Features:**

**1. Smart Variable Auto-Creation**
When an imported node references variables that don't exist:
```javascript
// Node uses {{ .vars.clientId }}
// But clientId doesn't exist in config.variables

→ Auto-create in variables section:
{
  "variables": {
    "clientId": "YOUR_CLIENT_ID_HERE",  // ← auto-added with placeholder
    ...
  }
}

→ Show notification:
"ℹ️ Added variable 'clientId' to your config. Update the value in Variables section."
```

**Benefits:**
- No broken references after import
- Clear placeholder values guide the user
- Immediate visibility of required configuration
- Works for all variable types (.vars references)

**2. Smart ID Auto-Rename**
When an imported node has an ID that already exists:
```javascript
// Current flow has node with id: "authenticate"
// Importing "Bearer Token Auth" template also uses id: "authenticate"

→ Auto-rename to avoid conflict:
{
  "id": "authenticate-2",  // ← auto-incremented
  "name": "Bearer Token Auth",
  ...
}

→ Show notification:
"ℹ️ Renamed node ID to 'authenticate-2' to avoid conflict."
```

**Benefits:**
- No ID collisions
- Predictable naming scheme (append -2, -3, etc.)
- User can rename later if needed
- Preserves all references and relationships

**3. Dependency Detection**
Some templates import multiple nodes (e.g., OAuth flow = 2 nodes):
```javascript
// OAuth 2.0 Flow template imports:
[
  {
    "id": "oauth-get-url",
    "name": "Get OAuth URL",
    "method": "POST",
    "url": "/oauth/authorize",
    "launchBrowser": ".authorizationUrl",
    ...
  },
  {
    "id": "oauth-exchange-code",
    "name": "Exchange Code for Token",
    "method": "POST",
    "url": "/oauth/token",
    "userPrompts": {
      "authCode": "Enter the authorization code from browser:"
    },
    "body": {
      "code": "{{ .input.authCode }}",
      "redirect_uri": "{{ .vars.redirectUri }}"
    },
    ...
  }
]

→ Both nodes added in sequence
→ Variables auto-created: redirectUri
→ IDs auto-renamed if conflicts
```

**4. Node Placement**
Imported nodes are added to the end of the current flow by default:
- Preserves existing sequence order
- New nodes can be reordered with drag-and-drop
- Clear visual indicator showing newly added nodes (highlight for 3 seconds)

**Benefits:**

**For New Users:**
- Clear entry points: "Load Config" (start fresh) vs "Import Nodes" (add patterns)
- Guided workflow with templates that demonstrate best practices
- Learn FlowSphere features through pre-built examples

**For Experienced Users:**
- Rapid flow construction by combining templates
- Reusable patterns eliminate repetitive config writing
- Focus on API-specific logic, not boilerplate

**For Teams:**
- Share custom node templates (stored as JSON files)
- Standardize common patterns across team configs
- Version control templates alongside configs

**Success Criteria:**
- ✅ Users can add common patterns without manual JSON editing
- ✅ No ID conflicts or broken variable references after import
- ✅ Clear separation between "start fresh" and "add to existing"
- ✅ 5+ high-quality templates covering essential patterns
- ✅ Import workflow takes < 10 seconds from click to added nodes

### Response Headers Access

**Status:** Planned

Enable access to HTTP response headers for validation and reference in subsequent nodes, just like response body access.

**Current Limitation:**
- Only response body is accessible via `{{ .responses.nodeId.field }}`
- Response headers are not stored or accessible
- Cannot validate response headers (e.g., rate limits, tokens in headers)
- Cannot pass header values to subsequent requests
- Missing critical data for some APIs (pagination links, auth tokens, rate limits)

**Use Cases:**

**1. Authentication Tokens in Headers:**
Some APIs return tokens in response headers instead of body:
```json
{
  "id": "login",
  "method": "POST",
  "url": "/auth/login",
  "validations": [
    { "httpStatusCode": 200 },
    { "header": "X-Auth-Token", "exists": true }
  ]
}
```

Then use in next request:
```json
{
  "id": "getProfile",
  "method": "GET",
  "url": "/profile",
  "headers": {
    "X-Auth-Token": "{{ .responses.login.headers.X-Auth-Token }}"
  }
}
```

**2. Rate Limiting Validation:**
Verify API rate limits before continuing:
```json
{
  "id": "checkRateLimit",
  "method": "GET",
  "url": "/api/data",
  "validations": [
    { "httpStatusCode": 200 },
    { "header": "X-RateLimit-Remaining", "greaterThan": 10 }
  ]
}
```

**3. Pagination Links:**
Some APIs use `Link` header for pagination (GitHub, GitLab):
```json
{
  "id": "getUsers",
  "method": "GET",
  "url": "/users",
  "validations": [
    { "header": "Link", "exists": true }
  ]
}
```

**4. Content Metadata Validation:**
Verify response format and size:
```json
{
  "id": "downloadFile",
  "method": "GET",
  "url": "/files/report.pdf",
  "validations": [
    { "httpStatusCode": 200 },
    { "header": "Content-Type", "equals": "application/pdf" },
    { "header": "Content-Length", "greaterThan": 1000 }
  ]
}
```

**5. Custom Business Logic Headers:**
APIs may return important data in custom headers:
```json
{
  "id": "processPayment",
  "method": "POST",
  "url": "/payments",
  "validations": [
    { "httpStatusCode": 201 },
    { "header": "X-Transaction-ID", "exists": true },
    { "header": "X-Processing-Time", "lessThan": 5000 }
  ]
}
```

**6. Redirects with Browser Launch:**
Handle 302 redirects and launch browser with Location header (useful for OAuth, SSO):
```json
{
  "id": "initiateOAuth",
  "method": "POST",
  "url": "/oauth/initiate",
  "body": {
    "client_id": "{{ .vars.clientId }}",
    "redirect_uri": "{{ .vars.redirectUri }}"
  },
  "validations": [
    { "httpStatusCode": 302 },
    { "header": "Location", "exists": true }
  ],
  "launchBrowser": "headers.Location"
}
```

This enables seamless OAuth flows where the redirect URL is in the Location header, not the response body.

**Proposed Syntax:**

**Validation Syntax:**
```json
{
  "validations": [
    { "header": "Header-Name", "exists": true },
    { "header": "Header-Name", "equals": "expected-value" },
    { "header": "Header-Name", "notEquals": "forbidden-value" },
    { "header": "Header-Name", "greaterThan": 100 },
    { "header": "Header-Name", "lessThan": 1000 },
    { "header": "Header-Name", "greaterThanOrEqual": 0 },
    { "header": "Header-Name", "lessThanOrEqual": 500 }
  ]
}
```

**Reference Syntax:**
```json
{
  "headers": {
    "Authorization": "{{ .responses.nodeId.headers.HeaderName }}"
  },
  "body": {
    "transactionId": "{{ .responses.payment.headers.X-Transaction-ID }}"
  }
}
```

**Condition Syntax:**
```json
{
  "conditions": [
    {
      "source": "node",
      "node": "checkApi",
      "field": "headers.X-RateLimit-Remaining",
      "greaterThan": 0
    }
  ]
}
```

**Header Name Handling:**
- Case-insensitive (HTTP headers are case-insensitive per RFC)
- Access `X-Auth-Token` as `headers.X-Auth-Token` or `headers.x-auth-token`
- Hyphens in header names supported (no special syntax needed)

**Examples:**

**Example 1: OAuth with Token in Header**
```json
{
  "nodes": [
    {
      "id": "authenticate",
      "name": "Get OAuth Token",
      "method": "POST",
      "url": "/oauth/token",
      "body": {
        "grant_type": "client_credentials",
        "client_id": "{{ .vars.clientId }}",
        "client_secret": "{{ .vars.clientSecret }}"
      },
      "validations": [
        { "httpStatusCode": 200 },
        { "header": "X-OAuth-Token", "exists": true },
        { "header": "X-Token-Expires-In", "greaterThan": 0 }
      ]
    },
    {
      "id": "callApi",
      "name": "Call Protected API",
      "method": "GET",
      "url": "/api/protected",
      "headers": {
        "Authorization": "Bearer {{ .responses.authenticate.headers.X-OAuth-Token }}"
      }
    }
  ]
}
```

**Example 2: Rate Limit Aware Flow**
```json
{
  "nodes": [
    {
      "id": "apiCall1",
      "name": "First API Call",
      "method": "GET",
      "url": "/api/data",
      "validations": [
        { "httpStatusCode": 200 },
        { "header": "X-RateLimit-Remaining", "greaterThan": 5 }
      ]
    },
    {
      "id": "apiCall2",
      "name": "Second API Call (conditional)",
      "method": "GET",
      "url": "/api/more-data",
      "conditions": [
        {
          "source": "node",
          "node": "apiCall1",
          "field": "headers.X-RateLimit-Remaining",
          "greaterThan": 10
        }
      ]
    }
  ]
}
```

**Example 3: Pagination with Link Header**
```json
{
  "nodes": [
    {
      "id": "getPage1",
      "name": "Get First Page",
      "method": "GET",
      "url": "/api/users?page=1",
      "validations": [
        { "httpStatusCode": 200 },
        { "header": "Link", "exists": true },
        { "jsonpath": ". | length", "greaterThan": 0 }
      ]
    },
    {
      "id": "verifyPagination",
      "name": "Verify Pagination Info",
      "method": "GET",
      "url": "/api/stats",
      "userPrompts": {
        "linkHeader": "Link header was: {{ .responses.getPage1.headers.Link }}"
      }
    }
  ]
}
```

**Example 4: OAuth Redirect Flow with Browser Launch**
```json
{
  "nodes": [
    {
      "id": "initiateOAuth",
      "name": "Initiate OAuth Flow",
      "method": "POST",
      "url": "/oauth/authorize",
      "body": {
        "client_id": "{{ .vars.clientId }}",
        "redirect_uri": "{{ .vars.redirectUri }}",
        "response_type": "code",
        "scope": "read write"
      },
      "validations": [
        { "httpStatusCode": 302 },
        { "header": "Location", "exists": true }
      ],
      "launchBrowser": "headers.Location"
    },
    {
      "id": "exchangeCode",
      "name": "Exchange Authorization Code",
      "method": "POST",
      "url": "/oauth/token",
      "userPrompts": {
        "authCode": "Enter the authorization code from the browser:"
      },
      "body": {
        "code": "{{ .input.authCode }}",
        "client_id": "{{ .vars.clientId }}",
        "client_secret": "{{ .vars.clientSecret }}",
        "redirect_uri": "{{ .vars.redirectUri }}",
        "grant_type": "authorization_code"
      },
      "validations": [
        { "httpStatusCode": 200 },
        { "jsonpath": ".access_token", "exists": true }
      ]
    }
  ]
}
```

**Benefits:**

**For API Testing:**
- Complete validation coverage (body + headers)
- Test rate limiting behavior
- Verify security headers (CORS, CSP, etc.)
- Validate content metadata

**For Complex Workflows:**
- Pass tokens/IDs in headers between requests
- Implement rate-limit-aware flows
- Follow pagination links from headers
- Chain requests using header data

**For Real-World APIs:**
- Many APIs use headers for important data (GitHub, Stripe, Twilio)
- RESTful APIs often return metadata in headers
- Security tokens frequently in headers
- Pagination commonly via `Link` header

**Success Criteria:**
- ✅ All header validation operators work (exists, equals, notEquals, numeric comparisons)
- ✅ Headers accessible via `{{ .responses.nodeId.headers.HeaderName }}` syntax
- ✅ Header names are case-insensitive (per HTTP spec)
- ✅ Conditions can evaluate header values
- ✅ Headers visible in execution logs and Studio UI
- ✅ Autocomplete suggests available headers in Studio
- ✅ Backward compatible with existing configs

### OAuth Callback Auto-Capture

**Status:** Planned

**Depends on:** Response Headers Access (for `launchBrowser: "headers.Location"`)

Automatically capture OAuth authorization codes from redirect callbacks without requiring manual copy/paste from the browser URL bar.

**Current OAuth Flow (Manual - Tedious):**
1. FlowSphere initiates OAuth → receives authorization URL
2. Browser launches → user authenticates on OAuth provider
3. OAuth provider redirects to `http://localhost:3000/callback?code=ABC123`
4. **User manually copies the code from URL bar** 😓
5. User pastes code into FlowSphere prompt
6. FlowSphere exchanges code for access token

This works but is error-prone, tedious, and breaks the flow experience.

**Proposed OAuth Flow (Automatic - Seamless):**
1. FlowSphere initiates OAuth with `redirect_uri: http://localhost:PORT/oauth-callback`
2. Browser launches → user authenticates
3. OAuth provider redirects to `http://localhost:PORT/oauth-callback?code=ABC123&state=xyz`
4. **FlowSphere automatically captures the code** ✨
5. FlowSphere validates state parameter (CSRF protection)
6. FlowSphere automatically proceeds to token exchange
7. Done! Zero manual intervention.

**Config Format:**

```json
{
  "variables": {
    "clientId": "your-client-id",
    "clientSecret": "your-client-secret"
  },
  "nodes": [
    {
      "id": "initiateOAuth",
      "name": "Initiate OAuth Flow",
      "method": "POST",
      "url": "https://oauth.example.com/authorize",
      "body": {
        "client_id": "{{ .vars.clientId }}",
        "redirect_uri": "http://localhost:3737/oauth-callback",
        "response_type": "code",
        "scope": "read write",
        "state": "{{ $guid }}"
      },
      "validations": [
        { "httpStatusCode": 302 },
        { "header": "Location", "exists": true }
      ],
      "launchBrowser": "headers.Location",
      "waitForCallback": {
        "enabled": true,
        "timeout": 300,
        "validateState": true,
        "captureParams": {
          "code": "authCode",
          "state": "oauthState",
          "error": "oauthError",
          "error_description": "oauthErrorDesc"
        }
      }
    },
    {
      "id": "exchangeToken",
      "name": "Exchange Code for Token",
      "method": "POST",
      "url": "https://oauth.example.com/token",
      "body": {
        "code": "{{ .input.authCode }}",
        "client_id": "{{ .vars.clientId }}",
        "client_secret": "{{ .vars.clientSecret }}",
        "redirect_uri": "http://localhost:3737/oauth-callback",
        "grant_type": "authorization_code"
      },
      "validations": [
        { "httpStatusCode": 200 },
        { "jsonpath": ".access_token", "exists": true },
        { "jsonpath": ".token_type", "equals": "Bearer" }
      ]
    }
  ]
}
```

**waitForCallback Configuration:**

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | boolean | Enable automatic callback capture (default: false) |
| `timeout` | number | Seconds to wait for callback before prompting user (default: 300) |
| `validateState` | boolean | Verify state parameter matches for CSRF protection (default: true) |
| `captureParams` | object | Map query params to input variables (e.g., `"code": "authCode"`) |

**Studio Implementation:**

FlowSphere Studio already runs an Express server on port 3737, making this feature straightforward:

1. **Callback Endpoint Registration:**
   - Studio registers route: `GET /oauth-callback`
   - Route accepts any query parameters
   - Extracts parameters based on `captureParams` config

2. **Execution Flow:**
   ```
   Execute node with waitForCallback
      ↓
   Register callback handler (GET /oauth-callback)
      ↓
   Launch browser with OAuth URL
      ↓
   Pause execution + Show waiting UI
      ↓
   [User authenticates in browser]
      ↓
   OAuth provider redirects → http://localhost:3737/oauth-callback?code=ABC&state=xyz
      ↓
   Studio captures params: code=ABC, state=xyz
      ↓
   Validate state matches (CSRF check)
      ↓
   Store params in .input: { authCode: "ABC", oauthState: "xyz" }
      ↓
   Resume execution automatically
      ↓
   Next node runs with {{ .input.authCode }}
   ```

3. **UI During Callback Wait:**
   ```
   ┌─────────────────────────────────────────────────────┐
   │ ⏳ Step 1: Initiate OAuth Flow                      │
   ├─────────────────────────────────────────────────────┤
   │ Status: Waiting for OAuth callback...              │
   │                                                     │
   │ 🌐 Browser launched with authorization URL         │
   │ 📍 Callback: http://localhost:3737/oauth-callback  │
   │                                                     │
   │ Please complete authentication in your browser.    │
   │ FlowSphere will automatically continue when the    │
   │ OAuth provider redirects back.                     │
   │                                                     │
   │ ⏱️  Timeout: 4:32 remaining                         │
   │                                                     │
   │ [Cancel] [Enter Code Manually]                     │
   └─────────────────────────────────────────────────────┘
   ```

4. **Success Callback Page:**
   When callback received, show user-friendly page:
   ```html
   ┌─────────────────────────────────────────────────┐
   │  ✅ OAuth Authorization Successful              │
   ├─────────────────────────────────────────────────┤
   │  Authorization code captured successfully!      │
   │                                                 │
   │  You can close this window and return to       │
   │  FlowSphere Studio.                             │
   │                                                 │
   │  FlowSphere is now exchanging the code for an  │
   │  access token...                                │
   └─────────────────────────────────────────────────┘
   ```

**CLI Enhancement (Temporary HTTP Server):**

For CLI users, add optional OAuth callback support with a temporary HTTP server:

**Usage:**
```bash
# Enable OAuth callback server
flowsphere config.json --enable-oauth-callback

# Or specify custom port
flowsphere config.json --enable-oauth-callback --oauth-port 8080

# Or let CLI choose random available port
flowsphere config.json --enable-oauth-callback --oauth-port random
```

**How It Works:**

1. **Server Initialization:**
   - CLI detects `waitForCallback` in config
   - If `--enable-oauth-callback` flag provided:
     - Start temporary HTTP server on specified/random port
     - Display: `📡 OAuth callback server started on http://localhost:54321`
     - Register route: `GET /oauth-callback`

2. **Config Adjustment:**
   - CLI automatically substitutes `{{ $oauthCallbackUrl }}` in redirect_uri
   - Example: `"redirect_uri": "{{ $oauthCallbackUrl }}"` → `http://localhost:54321/oauth-callback`

3. **Execution Flow:**
   ```
   Start CLI with --enable-oauth-callback
      ↓
   Detect waitForCallback in config
      ↓
   Start temp HTTP server on random port (e.g., 54321)
      ↓
   Display: "OAuth callback: http://localhost:54321/oauth-callback"
      ↓
   Execute OAuth initiation request
      ↓
   Launch browser with authorization URL
      ↓
   Wait for callback (max timeout seconds)
      ↓
   [User authenticates]
      ↓
   OAuth redirects → http://localhost:54321/oauth-callback?code=ABC
      ↓
   CLI captures params, validates state
      ↓
   Store in .input, shutdown temp server
      ↓
   Continue execution with token exchange
   ```

4. **Fallback to Manual Entry:**
   - If `--enable-oauth-callback` NOT provided
   - CLI ignores `waitForCallback` configuration
   - Falls back to `userPrompts` for manual code entry
   - **Fully backward compatible**

5. **CLI Output:**
   ```bash
   $ flowsphere oauth-flow.json --enable-oauth-callback

   📡 OAuth callback server started on http://localhost:54321/oauth-callback

   ═══════════════════════════════════════════════════════
   Step 1: Initiate OAuth Flow
   ═══════════════════════════════════════════════════════
   POST https://oauth.example.com/authorize
   ✅ Status: 302 Found
   ✅ Header "Location" exists
   🌐 Launching browser...

   ⏳ Waiting for OAuth callback...
      Callback URL: http://localhost:54321/oauth-callback
      Timeout: 5:00

   [User authenticates in browser]

   ✅ Callback received!
      Code: ABC123DEF456
      State: validated ✓

   🔒 Shutting down OAuth callback server...

   ═══════════════════════════════════════════════════════
   Step 2: Exchange Code for Token
   ═══════════════════════════════════════════════════════
   POST https://oauth.example.com/token
   ✅ Status: 200 OK
   ✅ Field .access_token exists
   ✅ Field .token_type equals "Bearer"

   ✅ Sequence completed successfully!
   ```

**Dynamic Callback URL Variable:**

```json
{
  "nodes": [
    {
      "id": "initiateOAuth",
      "method": "POST",
      "url": "/oauth/authorize",
      "body": {
        "client_id": "{{ .vars.clientId }}",
        "redirect_uri": "{{ $oauthCallbackUrl }}",
        "response_type": "code",
        "state": "{{ $guid }}"
      },
      "waitForCallback": {
        "enabled": true,
        "timeout": 300
      }
    }
  ]
}
```

- `{{ $oauthCallbackUrl }}` is automatically replaced with:
  - **Studio**: `http://localhost:3737/oauth-callback` (fixed)
  - **CLI**: `http://localhost:{random-port}/oauth-callback` (dynamic)

**Security Features:**

**1. CSRF Protection (State Validation):**
```json
{
  "waitForCallback": {
    "validateState": true  // Default: true
  }
}
```
- Generates unique state with `{{ $guid }}`
- Validates state parameter in callback matches
- Rejects callback if state doesn't match

**2. Timeout Protection:**
- Maximum wait time configurable (default: 5 minutes)
- Prevents hanging indefinitely
- Offers manual entry fallback on timeout

**3. Error Handling:**
```json
{
  "waitForCallback": {
    "captureParams": {
      "code": "authCode",
      "error": "oauthError",
      "error_description": "oauthErrorDesc"
    }
  }
}
```

If OAuth provider returns error:
```
http://localhost:3737/oauth-callback?error=access_denied&error_description=User+cancelled
```

FlowSphere displays:
```
❌ OAuth Error: access_denied
   User cancelled authentication

[Retry] [Cancel] [Enter Code Manually]
```

**4. Single-Use Callback:**
- Callback endpoint accepts only ONE request
- Subsequent requests ignored (prevents replay attacks)
- Callback handler unregistered after capture

**Benefits:**

**For Studio Users:**
- ✅ Seamless OAuth testing - zero manual steps
- ✅ Professional UX - just like real OAuth apps
- ✅ Leverages existing Express server (no extra setup)
- ✅ CSRF protection built-in
- ✅ User-friendly success/error pages

**For CLI Users:**
- ✅ Optional enhancement via `--enable-oauth-callback` flag
- ✅ Automated OAuth flows in CI/CD pipelines
- ✅ Temporary HTTP server (auto-cleanup)
- ✅ Fully backward compatible (manual entry still works)
- ✅ Works with any OAuth provider

**For All Users:**
- ✅ Eliminates error-prone copy/paste
- ✅ Faster OAuth testing iterations
- ✅ Validates state for security
- ✅ Handles errors gracefully
- ✅ Timeout protection prevents hanging

**Use Cases:**

**1. GitHub OAuth Flow:**
```json
{
  "nodes": [
    {
      "id": "githubAuth",
      "method": "GET",
      "url": "https://github.com/login/oauth/authorize",
      "body": {
        "client_id": "{{ .vars.githubClientId }}",
        "redirect_uri": "{{ $oauthCallbackUrl }}",
        "scope": "repo user",
        "state": "{{ $guid }}"
      },
      "waitForCallback": {
        "enabled": true,
        "captureParams": { "code": "authCode" }
      }
    },
    {
      "id": "githubToken",
      "method": "POST",
      "url": "https://github.com/login/oauth/access_token",
      "headers": { "Accept": "application/json" },
      "body": {
        "client_id": "{{ .vars.githubClientId }}",
        "client_secret": "{{ .vars.githubClientSecret }}",
        "code": "{{ .input.authCode }}",
        "redirect_uri": "{{ $oauthCallbackUrl }}"
      }
    }
  ]
}
```

**2. Google OAuth Flow:**
```json
{
  "nodes": [
    {
      "id": "googleAuth",
      "method": "GET",
      "url": "https://accounts.google.com/o/oauth2/v2/auth",
      "body": {
        "client_id": "{{ .vars.googleClientId }}",
        "redirect_uri": "{{ $oauthCallbackUrl }}",
        "response_type": "code",
        "scope": "openid email profile",
        "state": "{{ $guid }}"
      },
      "waitForCallback": {
        "enabled": true,
        "timeout": 600,
        "captureParams": { "code": "authCode" }
      }
    }
  ]
}
```

**3. Custom SSO Provider:**
```json
{
  "nodes": [
    {
      "id": "ssoAuth",
      "method": "POST",
      "url": "https://sso.company.com/authorize",
      "body": {
        "client_id": "{{ .vars.ssoClientId }}",
        "redirect_uri": "{{ $oauthCallbackUrl }}",
        "response_type": "code",
        "state": "{{ $guid }}"
      },
      "validations": [
        { "httpStatusCode": 302 },
        { "header": "Location", "exists": true }
      ],
      "launchBrowser": "headers.Location",
      "waitForCallback": {
        "enabled": true,
        "validateState": true,
        "captureParams": {
          "code": "authCode",
          "session_id": "sessionId"
        }
      }
    }
  ]
}
```

**Success Criteria:**
- ✅ Studio automatically captures OAuth callbacks without user intervention
- ✅ CLI supports optional OAuth callback server with `--enable-oauth-callback` flag
- ✅ State parameter validated for CSRF protection
- ✅ Timeout handling prevents indefinite waiting
- ✅ Error responses captured and displayed clearly
- ✅ User-friendly success page shown in browser after callback
- ✅ Manual entry fallback always available
- ✅ Fully backward compatible (existing configs work unchanged)
- ✅ Single-use callback prevents replay attacks
- ✅ Works with all major OAuth providers (GitHub, Google, Azure, custom SSO)

### Test Execution with Proxy (Bypass CORS)

**Status:** ✅ Completed

**Completed:**
- ✅ Express server endpoint with Server-Sent Events (SSE)
- ✅ Flow Runner UI with real-time streaming execution
- ✅ User input prompts during execution flow
- ✅ Browser launch for OAuth flows (opens URLs in modal iframe)
- ✅ Execution log saving and download functionality
- ✅ CLI-like compact result display with expandable details
- ✅ Re-run capability
- ✅ Highlight substituted variables in request/response views
  - Shows which values were replaced from variable references
  - Color-coded highlighting: green for variables, purple for dynamic values, blue for responses, yellow for user input
  - Hover tooltips show original placeholder syntax

Add a proxy endpoint to the FlowSphere Studio Express server to enable direct API testing from the browser without CORS restrictions.

**Current Problem:**
- Studio runs in browser (client-side only)
- Direct API calls from browser hit CORS restrictions
- Can't test sequences live without running CLI separately

**Solution:**
Now that Studio is served via Express (Node.js), add an endpoint that:
1. Receives config from browser
2. Uses the existing execution module (same code as CLI)
3. Returns execution results with full logs
4. **Zero code duplication** - same logic for CLI and Studio

**Benefits:**
- ✅ **Zero code duplication** - Studio uses the exact same execution engine as CLI
- ✅ Test API sequences directly in Studio UI without leaving browser
- ✅ Bypass CORS restrictions (browser → localhost → external API)
- ✅ See real responses while building configs
- ✅ Validate configs immediately without running CLI
- ✅ Debug API issues faster with live feedback
- ✅ No need to switch between Studio and terminal
- ✅ Changes to executor/validator/conditions automatically work in both CLI and Studio
- ✅ Identical output format for CLI and Studio (execution logs)

**Proposed UI:**
```
[Config Editor]
  Node 1: Login
  Node 2: Get Profile
  Node 3: Create Resource

[▶ Run Sequence] [⏸ Pause] [⏹ Stop] [Clear Results]

[Live Results Panel]
Step 1: Login ✅ (200 OK) - 234ms
  Response: { "token": "eyJ..." }

Step 2: Get Profile ✅ (200 OK) - 156ms
  Response: { "id": 123, "name": "John" }

Step 3: Create Resource ⏳ Running...
```

**Express API Implementation (Reuses Existing Code):**

The implementation reuses the existing executor module for zero code duplication. Write config to temp file and use the EXACT SAME executor as CLI to return execution logs in the same format as CLI log files.

**Note:** Current executor returns results after full sequence completion. For real-time streaming, we'd need to add event emitters to the executor. This is optional - the basic endpoint works perfectly fine for most use cases.

**Key Advantage:** Any changes to the executor, validator, conditions, etc. automatically work in both CLI and Studio. No duplicate code!

**Studio Client-Side Usage (Simple API Call):**

Call the API endpoint (uses existing executor), then display results from the execution log (same format as CLI logs).

**That's it!** No need to reimplement:
- ❌ Variable substitution
- ❌ Condition evaluation
- ❌ Validation logic
- ❌ HTTP request handling
- ❌ Timeout management
- ❌ User input prompts
- ❌ Browser launching

Everything is handled by the existing executor module.

**UI Controls:**

1. **Run Button:**
   - Executes entire sequence from start
   - Shows progress with status indicators
   - Displays results in collapsible panels

2. **Step-by-Step Mode:**
   - Execute one step at a time
   - Inspect response before continuing
   - Useful for debugging

3. **Results Panel:**
   - Shows request/response for each step
   - Highlights validation failures
   - Displays timing information
   - Collapsible/expandable sections

4. **User Input Prompts:**
   - Modal dialogs for user prompts
   - Pre-filled with values from config
   - Save input for re-runs

**Security Considerations:**

- ⚠️ Only allow proxy when running localhost (not production)
- Rate limiting on proxy endpoint (prevent abuse)
- Timeout limits (max 120 seconds)
- URL validation (no file:// or internal network access)
- Optional: Whitelist allowed domains in config

**Example Security Implementation:**

Proxy middleware with security checks including invalid URL scheme blocking and internal network access blocking.

**User Workflow:**

1. Open Studio
2. Create or load config
3. Click **"Run Sequence"** button
4. Watch steps execute in real-time
5. View responses and validations
6. Fix any issues and re-run
7. Download final config when satisfied

**Advanced Features:**

- **Save Execution Results:** Export results as JSON for sharing/debugging
- **Compare Runs:** Side-by-side comparison of multiple runs
- **Request History:** Keep history of last N executions
- **Variable Inspector:** See all available variables at each step
- **Breakpoints:** Pause execution at specific steps

**Implementation Phases:**

**Phase 1 - API Endpoint (Backend):**
- Add endpoint
- Wire up existing executor module
- Handle temp file creation/cleanup
- Return execution log in JSON format
- Test with curl/Postman

**Phase 2 - Studio Integration (Frontend):**
- Add "Run Sequence" button to Studio UI
- Create test runner module
- Call API
- Display results in simple alert/console
- Test end-to-end

**Phase 3 - Results UI:**
- Build collapsible results panel
- Show request/response for each step
- Highlight validations and errors
- Display timing information
- Match CLI output format

**Phase 4 - Advanced Execution:**
- Add step-by-step execution mode (--start-step option)
- Real-time progress updates (SSE/WebSockets)
- Handle user input prompts (modals)
- Support browser launch callback
- Save/export results

**Phase 5 - Polish & Features:**
- Execution history browser
- Variable inspector panel
- Comparison view (multiple runs)
- Security hardening (if exposing publicly)
- Performance metrics

### Try it Out - Individual Node Testing

**Depends on:** Test Execution with Proxy (Bypass CORS)

Add the ability to test individual nodes in isolation without running the entire sequence, with intelligent mocking of dependencies and optional response schema storage for enhanced autocomplete.

**Benefits:**
- ✅ Test single nodes in isolation without running entire sequence
- ✅ Rapid iteration and debugging workflow
- ✅ Immediate validation feedback (success/failure)
- ✅ Inspect actual API responses before building the full flow
- ✅ Enhanced autocomplete with real response field names and types
- ✅ No sensitive data stored (schemas only, not full responses)
- ✅ Portable schemas shared with team via config file

**Core Features:**

**1. Try it Out Button**
- Each node in Studio gets a "Try it Out" button
- Executes the node using the proxy endpoint
- Applies full execution logic: variable substitution, conditions, validations
- Shows real-time success/failure based on validation results
- Displays the actual response in a modal or panel

**2. Intelligent Dependency Mocking**
When a node references previous responses (e.g., response references), show a field-by-field modal:

```
This node needs values from previous responses:

{{ .responses.authenticate.token }}
[Enter mock value: _______________]

{{ .responses.getProfile.userId }}
[Enter mock value: _______________]

[Run] [Cancel]
```

**Why field-by-field instead of JSON editor:**
- Clear and simple - users see exactly what's needed
- No JSON syntax errors
- Guides users to provide minimal required data
- Better UX for non-technical users

**3. Store Response Schema (Optional)**

After successful execution, offer to save the response structure:

```
✅ Request successful!

Would you like to store the response schema for enhanced autocomplete?
- Only the structure is saved (field names and types)
- No sensitive data is stored
- Enables smart autocomplete for this node's response

[Store Schema] [Skip]
```

**Storage Format:**
Separate `responseSchemas` section in config file (keeps `nodes` array clean and readable).

**Why separate section:**
- Keeps `nodes` array human-readable and understandable
- Easy to delete entire section if needed
- Portable - shared with team, version controlled
- Compact - schemas are 10-50x smaller than full responses
- CLI can safely ignore this section (metadata only)

**4. Enhanced Autocomplete with Types**

When schemas are stored, autocomplete shows field names **with types**:

```
Type {{ to see suggestions:

{{ .responses.authenticate.
  ├─ token            (string)
  ├─ expiresAt        (number)
  ├─ user             (object) → expand
  ├─ roles            (array)  → expand
  └─ active           (boolean)
```

**Why show types:**
- Helps choose correct operators (equals vs greaterThan)
- Guides array access syntax (.[0] or .| length)
- Understands nested objects (drill deeper with dot notation)
- Better validation rule creation (know what comparisons are valid)

**Type-based suggestions:**
- `string` → suggests `equals`, `notEquals`, `exists`
- `number` → suggests `greaterThan`, `lessThan`, `greaterThanOrEqual`, `lessThanOrEqual`, `equals`
- `array` → suggests `.[0]`, `.[1]`, `.| length`
- `object` → suggests drilling deeper with `.fieldName`
- `boolean` → suggests `equals` with `true`/`false`

**Visual Treatment:**
Types could be color-coded or styled differently (grayed out, or green for string, blue for number, etc.)

**Proposed UI Flow:**

**Step 1 - User clicks "Try it Out" on a node:**
```
[Config Editor]
  Node 2: Get Profile
  [Edit] [Try it Out] [Delete]
```

**Step 2 - If node has dependencies, show mocking modal:**
```
┌─────────────────────────────────────────────┐
│ Mock Required Values                        │
├─────────────────────────────────────────────┤
│ This node references previous responses:   │
│                                             │
│ {{ .responses.authenticate.token }}        │
│ [mock-token-abc123___________________]     │
│                                             │
│ {{ .responses.authenticate.userId }}       │
│ [12345_______________________________]     │
│                                             │
│         [Run Request] [Cancel]              │
└─────────────────────────────────────────────┘
```

**Step 3 - Execute request and show results:**
```
┌─────────────────────────────────────────────┐
│ ✅ Request Successful - Get Profile         │
├─────────────────────────────────────────────┤
│ Status: 200 OK                              │
│ Duration: 234ms                             │
│                                             │
│ Validations:                                │
│ ✅ HTTP status code is 200                  │
│ ✅ Field .id exists                         │
│ ✅ Field .email exists                      │
│                                             │
│ Response Body:                              │
│ {                                           │
│   "id": 12345,                              │
│   "email": "user@example.com",              │
│   "name": "John Doe",                       │
│   "active": true                            │
│ }                                           │
│                                             │
│ [Store Response Schema] [Close]             │
└─────────────────────────────────────────────┘
```

**Step 4 - If validation fails:**
```
┌─────────────────────────────────────────────┐
│ ❌ Request Failed - Get Profile             │
├─────────────────────────────────────────────┤
│ Status: 401 Unauthorized                    │
│ Duration: 187ms                             │
│                                             │
│ Validations:                                │
│ ❌ Expected status 200, got 401             │
│                                             │
│ Response Body:                              │
│ {                                           │
│   "error": "Invalid token"                  │
│ }                                           │
│                                             │
│ [Close]                                     │
└─────────────────────────────────────────────┘
```

**Implementation Details:**

**1. Dependency Detection:**
Scan URL, headers, body for response references.

**2. Mocking Modal:**
Create modal with field-by-field inputs for each dependency. Collect mock data and pass to execution.

**3. Execute with Mocked Data:**
Prepare config with mocked responses and call proxy endpoint.

**4. Schema Extraction:**
Extract type information from response body recursively, supporting objects, arrays, and primitives.

**5. Store Schema:**
After successful execution, offer to save the response structure. Store in separate `responseSchemas` section.

**6. Enhanced Autocomplete with Types:**
Modify existing autocomplete to read from `responseSchemas`, generate suggestions with types from stored schemas, add type styling (colors, descriptions), show operator suggestions based on type, support nested object navigation.

**UI Enhancements:**

**1. Add "Try it Out" button to each node in rendering**

**2. Add CSS for type styling with color-coded types**

**Backend Support (Express Endpoint):**

Add new endpoint for single node execution. Create temporary responses object with mocked data. Execute single node using existing executor logic.

**Implementation Phases:**

**Phase 1 - Basic Try it Out:**
- Add "Try it Out" button to each node in Studio
- Implement dependency detection (scan for response references)
- Create mocking modal with field-by-field inputs
- Execute node via endpoint
- Display success/failure results with validation output

**Phase 2 - Response Schema Storage:**
- Implement schema extraction from response bodies
- Add "Store Schema" prompt after successful execution
- Save schemas to `responseSchemas` section in config
- Add UI to view/delete stored schemas
- Studio option to "Clear all stored schemas"

**Phase 3 - Enhanced Autocomplete:**
- Modify autocomplete to read from `responseSchemas`
- Generate suggestions with types from stored schemas
- Add type styling (colors, descriptions)
- Show operator suggestions based on type
- Support nested object navigation

**Phase 4 - Polish & Advanced Features:**
- Preview stored schema before saving
- Edit/update existing schemas manually
- Diff view when response schema changes
- Import schemas from OpenAPI/Swagger definitions
- Export schemas separately for documentation

**CLI Compatibility:**
- CLI **ignores** the `responseSchemas` section (metadata only)
- Schemas are purely for Studio enhancement
- No breaking changes to existing configs
- Can revisit later if CLI use case emerges (e.g., enhanced error messages)

### Execution Log Visualizer

A visual interface for exploring, analyzing, and comparing execution logs with rich filtering, search, and export capabilities.

**Benefits:**
- ✅ Visual understanding of execution flow and timing
- ✅ Quick identification of failures and bottlenecks
- ✅ Compare multiple executions to spot differences
- ✅ Filter and search through large execution logs
- ✅ Performance analysis with metrics and insights
- ✅ Export visualizations for documentation and sharing
- ✅ Works standalone (CLI) and integrated (Studio)
- ✅ Plug-and-play Studio module (optional feature)

**Three Integration Points:**

**1. Standalone CLI Command:**
Launches Express server with visualization UI and automatically opens browser.

**2. Studio Plug-and-Play Module:**
- Optional feature toggle in Studio settings
- When enabled, adds "Log Visualizer" tab to Studio interface
- Load and visualize any log file from directory
- Browse historical logs with file picker

**UI Structure:**
```
[Config Editor] [Execution Results] [Log Visualizer]
                                     ↑ New tab when enabled
```

**3. Post-Execution Prompt:**
After running a sequence (CLI or Studio), offer immediate visualization:

**CLI:**
```
✅ Sequence completed successfully!
   5 steps executed, 1 skipped
   Total duration: 2.4s
📝 Log saved to: logs/execution_log_20250128_143022.json

Would you like to visualize the execution log? (y/n)
> y

📊 Launching visualizer...
🌐 Server: http://localhost:54321
```

**Studio:**
```
┌────────────────────────────────────────┐
│ ✅ Sequence Completed Successfully     │
├────────────────────────────────────────┤
│ 5 steps executed, 1 skipped            │
│ Total duration: 2.4s                   │
│                                        │
│ Log saved to:                          │
│ logs/execution_log_20250128_143022.json│
│                                        │
│ [Visualize Log] [Close]                │
└────────────────────────────────────────┘
```

**Core Visualization Features:**

**1. Summary Panel:**
```
┌─────────────────────────────────────────────────────────┐
│ Execution Summary                                       │
├─────────────────────────────────────────────────────────┤
│ Status: ✅ Success                                      │
│ Steps: 5 executed, 1 skipped, 0 failed                 │
│ Duration: 2.4s (2400ms)                                 │
│ Started: 2025-01-28 14:30:22                           │
│ Config: examples/config-simple.json                     │
├─────────────────────────────────────────────────────────┤
│ Performance:                                            │
│ - Fastest: Step 1 (120ms)                              │
│ - Slowest: Step 3 (1200ms)                             │
│ - Average: 480ms per step                               │
└─────────────────────────────────────────────────────────┘
```

**2. Timeline/Waterfall View:**
Visual representation of execution flow with duration bars:

```
┌─────────────────────────────────────────────────────────┐
│ Timeline                                   Total: 2.4s  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 0s    0.5s   1.0s   1.5s   2.0s   2.5s                 │
│ ├─────┼──────┼──────┼──────┼──────┼                    │
│ █████ Step 1: Login (120ms)                            │
│      ████ Step 2: Get Profile (200ms)                   │
│          ⊘ Step 3: Create Post (skipped)               │
│             █████████████ Step 4: Fetch Posts (1200ms) │
│                          ████████ Step 5: Logout (300ms)│
└─────────────────────────────────────────────────────────┘
```

**3. Step Cards (Expandable):**
```
┌─────────────────────────────────────────────────────────┐
│ ✅ Step 1: Login                             120ms  [▼] │
├─────────────────────────────────────────────────────────┤
│ Request:                                                │
│   POST https://api.example.com/auth/login               │
│   Headers: { "Content-Type": "application/json" }      │
│   Body: { "username": "user", "password": "***" }      │
│                                                         │
│ Response:                                               │
│   Status: 200 OK                                        │
│   Body: {                                               │
│     "token": "eyJhbGc...",                              │
│     "userId": 12345                                     │
│   }                                                     │
│                                                         │
│ Validations:                                            │
│   ✅ HTTP status code is 200                            │
│   ✅ Field .token exists                                │
│   ✅ Field .userId exists                               │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ ⊘ Step 3: Create Post                      skipped [▼] │
├─────────────────────────────────────────────────────────┤
│ Skip Reason:                                            │
│   Condition not met: .responses.getProfile.isAdmin     │
│   Expected: true                                        │
│   Actual: false                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ ❌ Step 5: Logout                            300ms  [▼] │
├─────────────────────────────────────────────────────────┤
│ Request:                                                │
│   POST https://api.example.com/auth/logout              │
│                                                         │
│ Response:                                               │
│   Status: 401 Unauthorized                              │
│   Body: { "error": "Invalid token" }                   │
│                                                         │
│ Validations:                                            │
│   ❌ Expected status 200, got 401                       │
└─────────────────────────────────────────────────────────┘
```

**4. Filter & Search:**
```
┌─────────────────────────────────────────────────────────┐
│ [🔍 Search steps...]                                    │
│                                                         │
│ Status: [✅ Success] [❌ Failed] [⊘ Skipped] [All]     │
│ Duration: [< 100ms] [100-500ms] [> 500ms] [All]       │
│ Method: [GET] [POST] [PUT] [DELETE] [All]              │
└─────────────────────────────────────────────────────────┘
```

**5. Performance Metrics:**
```
┌─────────────────────────────────────────────────────────┐
│ Performance Insights                                    │
├─────────────────────────────────────────────────────────┤
│ Bottlenecks:                                            │
│ • Step 4 took 50% of total execution time (1200ms)     │
│ • Consider adding timeout or optimization               │
│                                                         │
│ Step Duration Distribution:                             │
│ [████████████████        ] 0-500ms:   3 steps          │
│ [████                    ] 500-1000ms: 1 step          │
│ [████                    ] 1000ms+:    1 step          │
│                                                         │
│ Success Rate: 80% (4/5 steps)                          │
└─────────────────────────────────────────────────────────┘
```

**Advanced Features:**

**1. Compare Logs (Side-by-Side Diff View):**

Load two log files and visualize differences:

```
┌─────────────────────────────────────────────────────────┐
│ Compare Executions                                      │
├─────────────────────────────────────────────────────────┤
│ Log A: execution_log_20250128_143022.json              │
│ Log B: execution_log_20250128_144500.json              │
│                                                         │
│ [Load Log A] [Load Log B] [Compare]                    │
└─────────────────────────────────────────────────────────┘

┌──────────────────────────────┬──────────────────────────────┐
│ Log A (14:30:22)            │ Log B (14:45:00)             │
├──────────────────────────────┼──────────────────────────────┤
│ Duration: 2.4s              │ Duration: 3.1s ⚠️ +0.7s      │
│ Success: 4/5 steps          │ Success: 5/5 steps ✅         │
│                             │                              │
│ ✅ Step 1: Login (120ms)    │ ✅ Step 1: Login (150ms) +30 │
│ ✅ Step 2: Profile (200ms)  │ ✅ Step 2: Profile (180ms)-20│
│ ⊘ Step 3: Create (skipped)  │ ✅ Step 3: Create (400ms) ℹ️  │
│ ✅ Step 4: Fetch (1200ms)   │ ✅ Step 4: Fetch (1300ms)+100│
│ ❌ Step 5: Logout (300ms)   │ ✅ Step 5: Logout (280ms) ✅  │
└──────────────────────────────┴──────────────────────────────┘

Differences Detected:
• Step 3 was skipped in Log A but executed in Log B
  Reason: Condition .responses.getProfile.isAdmin changed (false → true)
• Step 5 failed in Log A (401) but succeeded in Log B (200)
• Total execution time increased by 700ms (+29%)
```

**Use cases:**
- Compare before/after changes to API
- Identify performance regressions
- Debug conditional execution differences
- Verify fixes resolved issues

**2. Export Options:**

**HTML Export:**
Self-contained HTML file with inline CSS/JS (can be opened in any browser)

**PDF Export:**
Static PDF report with all visualizations

**Share Link:**
Generate shareable URL (if hosted) - expires in 7 days, password protected

**Export UI:**
```
┌─────────────────────────────────────────────────────────┐
│ Export Visualization                                    │
├─────────────────────────────────────────────────────────┤
│ Format:                                                 │
│ ( ) HTML - Self-contained, opens in browser            │
│ ( ) PDF  - Static report with screenshots              │
│ ( ) JSON - Raw log data (original format)              │
│                                                         │
│ Options:                                                │
│ [x] Include request/response bodies                     │
│ [x] Include performance metrics                         │
│ [x] Include timeline visualization                      │
│ [ ] Redact sensitive data (tokens, passwords)          │
│                                                         │
│ [Export] [Cancel]                                       │
└─────────────────────────────────────────────────────────┘
```

**3. Filter & Search:**

**Search capabilities:**
- Search by step name (fuzzy matching)
- Search by URL pattern
- Search in request/response bodies
- Search by validation message

**Filter options:**
- Status: Success ✅ / Failed ❌ / Skipped ⊘
- Duration: < 100ms / 100-500ms / 500-1000ms / 1000ms+
- HTTP Method: GET / POST / PUT / DELETE / PATCH
- Status Code: 2xx / 4xx / 5xx
- Custom date/time range

**UI:**
```
┌─────────────────────────────────────────────────────────┐
│ [🔍 Search: "auth"_______________] [Clear]             │
├─────────────────────────────────────────────────────────┤
│ Filters Active: 2                                       │
│ • Status: ✅ Success, ❌ Failed                          │
│ • Duration: > 500ms                                     │
│ [Clear All Filters]                                     │
├─────────────────────────────────────────────────────────┤
│ Showing 2 of 5 steps                                    │
│                                                         │
│ ✅ Step 1: Login (120ms)                                │
│ ❌ Step 5: Logout (300ms)                               │
└─────────────────────────────────────────────────────────┘
```

**4. Performance Metrics:**

**Bottleneck Detection:**
- Identify steps taking > 30% of total time
- Flag steps with timeouts
- Highlight duplicate/redundant requests

**Duration Analysis:**
- Min/max/average/median step duration
- Percentile breakdown (p50, p90, p95, p99)
- Duration distribution histogram

**Success Rate Tracking:**
- Overall success rate percentage
- Per-step success rate (if multiple logs)
- Validation pass/fail breakdown

**Trend Analysis (if comparing multiple logs):**
- Performance trend over time
- Failure rate trends
- Step duration changes

**UI:**
```
┌─────────────────────────────────────────────────────────┐
│ Performance Metrics                                     │
├─────────────────────────────────────────────────────────┤
│ Duration Statistics:                                    │
│ • Min:     120ms (Step 1)                              │
│ • Max:    1200ms (Step 4) ⚠️ BOTTLENECK                 │
│ • Average: 480ms                                        │
│ • Median:  300ms                                        │
│ • P95:     1100ms                                       │
│                                                         │
│ Duration Distribution:                                  │
│ 0-200ms   ██████████████ (40%)                         │
│ 200-500ms ███████       (20%)                          │
│ 500-1s    ███████       (20%)                          │
│ 1s+       ███████       (20%)                          │
│                                                         │
│ Recommendations:                                        │
│ • Step 4 (Fetch Posts) is slow - consider:            │
│   - Adding pagination to reduce response size          │
│   - Increasing timeout threshold                       │
│   - Checking server-side performance                   │
└─────────────────────────────────────────────────────────┘
```

**Visual Design: Simple & Fast (Bootstrap)**

**Technology Stack:**
- Bootstrap 5 for UI components
- Vanilla JavaScript (no heavy frameworks)
- Responsive design (works on mobile/tablet)
- Minimal dependencies for fast loading

**Key UI Components:**
- Bootstrap cards for step details
- Bootstrap collapse for expandable sections
- Bootstrap badges for status indicators
- Bootstrap progress bars for timeline
- Bootstrap tables for structured data
- Bootstrap alerts for warnings/errors

**Color Scheme:**
- Success (✅): Green (#28a745)
- Failed (❌): Red (#dc3545)
- Skipped (⊘): Gray (#6c757d)
- Warning (⚠️): Yellow (#ffc107)
- Info (ℹ️): Blue (#17a2b8)

**Implementation Details:**

**1. Visualizer HTML Structure:**
Main visualizer page with Bootstrap components for navbar, summary panel, timeline visualization, filter & search, step cards, and performance metrics.

**2. Load and Parse Log:**
Load log asynchronously and render visualization including summary, timeline, steps, and metrics.

**3. Backend Support (Express Endpoints):**
Add visualizer endpoints for serving UI, loading log files, listing available logs, and exporting visualization as HTML.

**4. CLI Command:**
Add visualize command that launches Express server and opens browser automatically.

**5. Post-Execution Prompt (CLI):**
Modify prompt to offer visualization after saving log. Spawn child process to launch visualizer without blocking.

**6. Studio Integration (Plug-and-Play Module):**

**Feature Toggle:**
Features enabled/disabled via localStorage with initialization function to load modules.

**Studio Tab Structure:**
Add Log Visualizer tab to Studio interface with file browser and controls.

**Post-Execution Modal (Studio):**
After running sequence, if log visualizer is enabled, show modal prompt to visualize the execution log. Load log in visualizer and switch to tab.

**Implementation Phases:**

**Phase 1 - Basic Visualizer:**
- Create standalone visualizer HTML/CSS/JS (Bootstrap-based)
- Implement summary panel with basic stats
- Render step cards with expand/collapse
- Add filter by status (success/failed/skipped)
- CLI command for visualization

**Phase 2 - Timeline & Metrics:**
- Implement timeline/waterfall view with duration bars
- Add performance metrics panel (min/max/avg/median)
- Bottleneck detection and recommendations
- Duration distribution visualization

**Phase 3 - Search & Advanced Filtering:**
- Full-text search across step names and URLs
- Advanced filters (duration ranges, HTTP methods, status codes)
- Filter combination logic (AND/OR)
- Show filtered count and clear filters button

**Phase 4 - Compare Logs:**
- Side-by-side diff view for two log files
- Highlight differences (duration changes, status changes, new/removed steps)
- Condition evaluation comparison
- Performance regression detection

**Phase 5 - Export Functionality:**
- Export as self-contained HTML file
- Export as PDF report (using html2pdf or similar)
- Optional: Share link generation (if hosted service exists)
- Redact sensitive data option (tokens, passwords)

**Phase 6 - Studio Integration:**
- Add as plug-and-play module (feature toggle)
- Create "Log Visualizer" tab in Studio
- File browser for logs directory
- Post-execution prompt to visualize
- Load historical logs from Studio UI

**Phase 7 - Polish & Advanced Features:**
- Keyboard shortcuts (arrow keys to navigate steps, Space to expand/collapse)
- Print-friendly CSS for HTML export
- Dark mode support
- Responsive design for mobile/tablet
- Copy step details to clipboard
- Bookmark/favorite logs

**File Structure:**
Organized directory with main HTML, CSS, JS modules for core, compare, export, filters, and templates.

**Dependencies:**
- Bootstrap 5 (CSS framework)
- Bootstrap Icons (optional, for better icons)
- No heavy JavaScript frameworks (vanilla JS only)
- Optional: Chart.js for advanced metrics visualizations (Phase 7)

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
- Option to keep variable syntax for runtime resolution
- Smart detection of dynamic values to preserve as placeholders

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
- Global variables to environment file
- Response references to Postman test script with environment set
- Dynamic placeholders to Postman dynamic variables

**Validation to Test Script Conversion:**
FlowSphere validation format converts to Postman test scripts with status checks and field existence checks, saving values for next request.

**Condition to Pre-request Script Conversion:**
FlowSphere condition format converts to Postman pre-request script that checks environment values and skips request if condition not met.

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
- Collection file with all requests and tests
- Environment file with all variables
- README with notes about variable dependencies and execution order

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
- Global installation via npm
- Programmatic API for automated testing frameworks
- Better debugging with JavaScript tooling
- Access to npm ecosystem for future extensions

**Integrated Visual Editor:**
- Bundle FlowSphere Studio (config editor) in the npm package
- Launch with studio command
- Single installation for both CLI and visual editor
- Versions always in sync (no separate deployment)

**CI/CD & Integration:**
- Native Node.js integration in modern pipelines
- Use as a library in existing test suites
- No system dependencies beyond Node.js

### Package Structure

Organized directory with CLI entry point, core execution modules, bundled config editor, example configs, test configs, and documentation.

### CLI Commands

Install globally via npm. Run config files with optional start-step parameter. Launch visual config editor (opens browser). Display version and help.

### Programmatic API

Use as a library in test suites. Run config files with options and callbacks. Run from config object without file.

### Visual Editor Integration

Launch studio function creates Express server and serves the bundled config editor, automatically opening browser.

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
- Test studio command
- Publish to npm registry

**Phase 4: Cutover (Week 6)**
- Replace Bash script with Node.js CLI
- Move Bash version to legacy folder temporarily
- Update all documentation and README
- Announce migration to users

**Phase 5: Cleanup (Week 7+)**
- Monitor for issues, gather feedback
- Remove Bash script after validation period
- Archive Bash version in git history

### Critical Requirements

**100% Config File Compatibility:**
- All existing config files must work unchanged
- All example, test, and scenario configs
- User configs

**Feature Parity:**
- Dynamic variables with placeholders
- Global variables
- Response references
- User input
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
- Use native Node.js modules
- Choose cross-platform npm packages only
- Test on Windows, macOS, Linux
- No shell commands unless absolutely necessary
- Handle file paths properly everywhere

### Core Dependencies (All Cross-Platform)

Dependencies include HTTP client, Express server, cross-platform browser launcher, and optional CLI argument parsing.

### package.json Configuration

Configuration includes package name, description, main entry point, bin command, files to include, keywords, and minimum Node.js version.

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
| Installation | Manual (git clone) | npm install -g ✅ |
| Dependencies | curl, jq, bash | Node.js only ✅ |

### Success Criteria

- ✅ All existing config files run identically
- ✅ Works on Windows without WSL
- ✅ Published to npm registry
- ✅ Config editor launches with studio command
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
- Variable substitution engines
- Dynamic placeholder handlers
- Condition evaluators
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
Gherkin feature file showing API authentication flow scenario with Given/When/Then steps for login, response validation, and profile retrieval.

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
- Global variables
- Response references
- User input
- Dynamic placeholders (new UUID per occurrence), timestamp
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
Input config showing authentication flow with global variables, defaults, login step with validations, and profile retrieval step with authorization header using response reference and conditions.

**Generated Python Code:**
Complete Python implementation with APISequence class including variable substitution, condition evaluation, step execution with HTTP requests, validations, browser launching, and pytest test function.

### Example: Python BDD with behave (Cucumber)

**Generated Gherkin Feature File:**
Gherkin feature file for API sequence execution with background setup for base URL, timeout, and default headers. Scenario for authentication and user profile retrieval with POST/GET requests, status code validation, field existence checks, and response storage.

**Generated Step Definitions:**
Complete Python behave step definitions with APIContext class for shared state, variable substitution, field extraction, and step definitions for setting base URL, timeout, default headers, making requests with body/headers, checking status codes, field existence, and storing responses.

**Run with:**
Install dependencies and run BDD tests using behave.

### Usage Example

AI agent uses MCP server to generate code from configs in different languages and frameworks including Cucumber BDD.

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
HTML showing base UI core modules (required) and optional feature modules loaded on demand with data-feature attributes.

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
