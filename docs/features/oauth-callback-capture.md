# OAuth Callback Capture (Studio)

**Status:** Planned

**Priority:** 8

## Overview

Enable FlowSphere Studio to act as an OAuth callback URL receiver, automatically capturing authorization codes and state parameters from OAuth providers without requiring manual user input.

## Problem Statement

**Current OAuth Flow (Manual):**
1. Node 1: Get authorization URL from API
2. `launchBrowser` opens authorization URL
3. User authenticates with OAuth provider
4. Provider redirects to callback URL (external app or localhost)
5. **User manually copies authorization code from URL**
6. **User pastes code into FlowSphere user input prompt**
7. Node 2: Exchange code for access token

**Pain Points:**
- Manual copy-paste is error-prone and tedious
- Breaks automation flow (requires human intervention)
- Difficult to test repeatedly during development
- Poor developer experience for OAuth workflows
- Cannot run OAuth flows in CI/CD or automated testing

## Solution

**Automated OAuth Flow with Callback Capture:**
1. Node 1: Get authorization URL, configure callback to Studio
2. `launchBrowser` opens authorization URL
3. User authenticates with OAuth provider
4. Provider redirects to FlowSphere Studio backend (`http://localhost:PORT/oauth/callback?code=...&state=...`)
5. **Studio automatically captures code, validates state, and stores parameters**
6. **Studio signals client that callback was received**
7. **Flow continues automatically to next node**
8. Node 2: Exchange code for access token (using captured code)

**Benefits:**
- Zero manual intervention after browser authentication
- Fully automated OAuth flows
- Better developer experience
- Enables automated testing of OAuth flows
- Reduces errors from manual copy-paste
- Supports complex multi-step OAuth patterns

## Key Features

### 1. Callback URL Registration

**Node Configuration:**
```json
{
  "id": "get-auth-url",
  "name": "Get OAuth authorization URL",
  "method": "POST",
  "url": "/oauth/authorize",
  "body": {
    "clientId": "{{ .vars.clientId }}",
    "redirectUri": "{{ $studioCallbackUrl }}/oauth/callback",
    "responseType": "code",
    "state": "{{ $guid }}"
  },
  "captureOAuthCallback": {
    "enabled": true,
    "timeout": 300,
    "captureParams": ["code", "state"],
    "storeAs": "authCallback"
  },
  "launchBrowser": ".authorizationUrl"
}
```

**New Dynamic Variable:**
- `{{ $studioCallbackUrl }}` - Resolves to Studio backend URL (e.g., `http://localhost:54321`)
- Only available when running in Studio mode
- Returns error if used in CLI mode

### 2. Automatic Callback Handling

**Backend Route:**
- Studio Express server adds route: `GET /oauth/callback`
- Captures query parameters from OAuth redirect
- Validates state parameter against expected value
- Stores captured parameters in memory associated with execution session
- Displays success page in browser
- Signals client via SSE that callback was received

**Success Page:**
```html
✓ Authorization Successful

FlowSphere has received your authorization code.

You may close this window and return to FlowSphere Studio.
```

### 3. Client-Server Communication

**Flow Execution Coordination:**
- When node has `captureOAuthCallback.enabled: true`:
  1. Node executes HTTP request (gets auth URL)
  2. Launches browser with auth URL
  3. Client sends "waiting for callback" event to server
  4. Server starts timeout countdown
  5. Server waits for `/oauth/callback` to be hit
  6. When callback received, server sends SSE event to client
  7. Client receives captured parameters
  8. Flow continues to next node

**SSE Event Structure:**
```json
{
  "event": "oauth-callback-received",
  "data": {
    "nodeId": "get-auth-url",
    "sessionId": "abc-123",
    "params": {
      "code": "captured_auth_code_xyz",
      "state": "expected_state_value"
    }
  }
}
```

### 4. Variable Injection

**Captured Parameters as Variables:**
- Stored in responses array under node ID
- Accessible via standard response syntax: `{{ .responses.get-auth-url.callback.code }}`
- Alternative syntax for `storeAs` field: `{{ .input.authCallback.code }}`

**Example - Token Exchange Node:**
```json
{
  "id": "exchange-token",
  "name": "Exchange code for access token",
  "method": "POST",
  "url": "/oauth/token",
  "body": {
    "code": "{{ .responses.get-auth-url.callback.code }}",
    "clientId": "{{ .vars.clientId }}",
    "clientSecret": "{{ .vars.clientSecret }}",
    "redirectUri": "{{ $studioCallbackUrl }}/oauth/callback",
    "grantType": "authorization_code"
  }
}
```

### 5. State Validation

**Security:**
- State parameter is generated and validated automatically
- If `body.state` or `url` contains state, Studio remembers expected value
- On callback, validates received state matches expected state
- Execution fails if state mismatch (prevents CSRF attacks)

**State Handling:**
- Auto-detect: If request contains `state` field with dynamic value, enable validation
- Manual: `captureOAuthCallback.validateState: true` forces state validation
- Error: If state mismatch, stop execution with clear error message

### 6. Timeout Handling

**Configuration:**
- `captureOAuthCallback.timeout` - Seconds to wait for callback (default: 300 = 5 minutes)
- If timeout expires before callback received:
  - Execution fails with timeout error
  - Error message: "OAuth callback not received within 300 seconds"
  - Suggested action: "Check if redirect URI is configured correctly in OAuth provider"

**UI Feedback:**
- Show countdown timer: "Waiting for OAuth callback... (4:23 remaining)"
- Cancel button: "Stop waiting and cancel execution"
- Success indicator: "✓ Callback received"

### 7. Multi-Session Support

**Session Isolation:**
- Each Flow Runner execution has unique session ID
- Callback URLs include session ID: `/oauth/callback?session=abc-123&code=...&state=...`
- Server routes callback to correct session
- Prevents callback from one execution affecting another

**Concurrent Flows:**
- Multiple users can run OAuth flows simultaneously
- Each execution isolated by session ID
- Callbacks routed correctly even if multiple flows use same OAuth provider

## UI/UX Design

### Node Configuration Panel

**New Section: "OAuth Callback Capture"**
```
┌─────────────────────────────────────────┐
│ ☐ Capture OAuth Callback               │
│                                         │
│   When enabled, this node will wait    │
│   for an OAuth redirect to FlowSphere   │
│   Studio before continuing.             │
│                                         │
│   Timeout: [300] seconds                │
│                                         │
│   Capture Parameters:                   │
│   ☑ code                                │
│   ☑ state                               │
│   ☐ Custom: [____________]              │
│                                         │
│   Store As: [authCallback]              │
│   (optional - variable name for input)  │
│                                         │
│   ⓘ Callback URL:                       │
│   {{ $studioCallbackUrl }}/oauth/callback│
│                                         │
│   Copy this URL to your OAuth provider  │
│   settings as the redirect URI.         │
└─────────────────────────────────────────┘
```

### Flow Runner - Waiting State

**During Callback Wait:**
```
┌─────────────────────────────────────────┐
│ ⏳ Step 1: Get OAuth Authorization URL  │
│                                         │
│    Status: 200 OK                       │
│    ✓ Validated status = 200             │
│    ✓ Extracted .authorizationUrl        │
│                                         │
│    🌐 Browser opened                     │
│                                         │
│    ⏱️  Waiting for OAuth callback...     │
│       (4:23 remaining)                  │
│                                         │
│    [Cancel]                             │
└─────────────────────────────────────────┘
```

**After Callback Received:**
```
┌─────────────────────────────────────────┐
│ ✓ Step 1: Get OAuth Authorization URL  │
│                                         │
│    Status: 200 OK                       │
│    ✓ Validated status = 200             │
│    ✓ Extracted .authorizationUrl        │
│                                         │
│    🌐 Browser opened                     │
│                                         │
│    ✅ Callback received (2.3s)           │
│       code: sk_test_xyz...              │
│       state: validated ✓                │
│                                         │
│    ▶ Continuing to next step...         │
└─────────────────────────────────────────┘
```

## Implementation Phases

### Phase 1 - Basic Callback Capture (Studio Only)

**Goals:**
- Basic `/oauth/callback` route in Studio backend
- Capture `code` and `state` query parameters
- Store captured params in execution session
- SSE notification to client when callback received
- Simple success page in browser

**Files to Create/Modify:**
- `studio/server.js` - Add `/oauth/callback` route
- `studio/js/flow-runner.js` - Handle waiting state, SSE events
- `lib/executor.js` - Add callback waiting logic (Studio mode only)
- `lib/substitution.js` - Add `{{ $studioCallbackUrl }}` variable

**Acceptance Criteria:**
- ✓ User can configure `captureOAuthCallback` in node
- ✓ Studio waits for callback before continuing
- ✓ Captured parameters available in subsequent nodes
- ✓ Success page displays in browser after callback
- ✓ Timeout after configured duration if no callback

### Phase 2 - State Validation & Security

**Goals:**
- Automatic state parameter validation
- CSRF protection
- Error handling for state mismatch
- Security best practices

**Enhancements:**
- Auto-detect state parameter in request
- Validate state on callback
- Clear error messages for security failures
- Documentation on OAuth security

**Acceptance Criteria:**
- ✓ State parameter auto-detected and validated
- ✓ Execution fails on state mismatch with clear error
- ✓ Security documentation added to README

### Phase 3 - Multi-Session & Advanced Features

**Goals:**
- Support concurrent OAuth flows
- Session isolation
- Custom parameter capture
- PKCE support

**Enhancements:**
- Session ID in callback URL
- Route callbacks to correct session
- Capture arbitrary query parameters
- Support PKCE code_challenge/code_verifier

**Acceptance Criteria:**
- ✓ Multiple users can run OAuth flows simultaneously
- ✓ Callbacks routed to correct execution
- ✓ Custom parameters captured correctly
- ✓ PKCE flows work end-to-end

### Phase 4 - UI Polish & Templates

**Goals:**
- Polished UI in Studio
- OAuth flow templates
- Better developer documentation

**Enhancements:**
- Visual callback capture configuration UI
- OAuth flow templates (Google, GitHub, Microsoft, etc.)
- Step-by-step wizard for OAuth setup
- Comprehensive examples in `/examples` directory

**Acceptance Criteria:**
- ✓ UI section for callback capture in node editor
- ✓ At least 3 OAuth provider templates included
- ✓ Documentation with screenshots and examples

## CLI Mode Considerations

**Challenge:**
- CLI mode doesn't have a persistent HTTP server
- Cannot receive OAuth callbacks without server

**Option 1 - Temporary Server (Recommended):**
- When CLI detects `captureOAuthCallback`, start temporary HTTP server
- Server runs on random available port
- Server shuts down after callback received or timeout
- Requires `--oauth-server` flag to enable

**Example:**
```bash
flowsphere config.json --oauth-server
# Starting temporary OAuth callback server on http://localhost:54321
# Waiting for OAuth callback...
# ✓ Callback received
# Server stopped
```

**Option 2 - Not Supported:**
- CLI mode shows error if `captureOAuthCallback` detected
- Error message directs user to use Studio mode for OAuth flows
- Simpler implementation, less maintenance

**Recommendation:** Start with Option 2 (error in CLI), add Option 1 in later phase if demand exists.

## Edge Cases & Error Handling

### Timeout Scenarios
- **No callback received:** Show clear error with troubleshooting steps
- **Multiple callbacks:** Accept first, ignore subsequent (log warning)
- **Callback after timeout:** Ignore, show "expired session" page

### State Mismatches
- **State parameter missing:** Fail with security error
- **State value mismatch:** Fail with CSRF warning
- **No state in original request:** Skip validation (backwards compatible)

### Network Issues
- **Studio server unreachable:** Show error immediately when node starts
- **Browser doesn't open:** Continue waiting (user can copy URL manually)
- **OAuth provider error:** Capture error parameters, fail with provider error message

### Concurrent Flows
- **Same session ID:** Should never happen (UUID collision), but log error
- **Orphaned sessions:** Cleanup after 1 hour of inactivity
- **Server restart:** Lost sessions show clear error on callback

## Security Considerations

### CSRF Protection
- Always use state parameter
- Validate state on callback
- Generate unpredictable state values (UUID)

### Code Exposure
- Authorization codes should be short-lived (handled by OAuth provider)
- Never log authorization codes in execution logs
- Clear captured codes from memory after token exchange

### Redirect URI Validation
- OAuth providers should validate redirect URI matches registered URI
- FlowSphere cannot bypass provider's security
- User must register Studio callback URL with provider

### HTTPS Considerations
- Studio runs on `http://localhost` (OAuth providers allow this for development)
- Production deployments should use HTTPS
- Document HTTPS setup for production use

## Success Criteria

- ✅ User can run complete OAuth flow without manual intervention
- ✅ Authorization code automatically captured from OAuth redirect
- ✅ State parameter validated for security
- ✅ Clear error messages for all failure scenarios
- ✅ Works with major OAuth providers (Google, GitHub, Microsoft)
- ✅ Concurrent flows don't interfere with each other
- ✅ Comprehensive documentation with examples
- ✅ At least 3 OAuth provider templates included

## Example Use Cases

### Google OAuth 2.0 Flow
```json
{
  "variables": {
    "clientId": "your-client-id.apps.googleusercontent.com",
    "clientSecret": "your-client-secret"
  },
  "nodes": [
    {
      "id": "google-auth",
      "name": "Get Google authorization",
      "method": "POST",
      "url": "https://accounts.google.com/o/oauth2/v2/auth",
      "body": {
        "client_id": "{{ .vars.clientId }}",
        "redirect_uri": "{{ $studioCallbackUrl }}/oauth/callback",
        "response_type": "code",
        "scope": "openid email profile",
        "state": "{{ $guid }}"
      },
      "captureOAuthCallback": {
        "enabled": true,
        "timeout": 300
      },
      "launchBrowser": ".authorizationUrl"
    },
    {
      "id": "exchange-token",
      "name": "Exchange code for tokens",
      "method": "POST",
      "url": "https://oauth2.googleapis.com/token",
      "body": {
        "code": "{{ .responses.google-auth.callback.code }}",
        "client_id": "{{ .vars.clientId }}",
        "client_secret": "{{ .vars.clientSecret }}",
        "redirect_uri": "{{ $studioCallbackUrl }}/oauth/callback",
        "grant_type": "authorization_code"
      }
    }
  ]
}
```

### GitHub OAuth Flow
```json
{
  "variables": {
    "clientId": "your-github-client-id",
    "clientSecret": "your-github-client-secret"
  },
  "nodes": [
    {
      "id": "github-auth",
      "name": "Get GitHub authorization",
      "method": "GET",
      "url": "https://github.com/login/oauth/authorize",
      "params": {
        "client_id": "{{ .vars.clientId }}",
        "redirect_uri": "{{ $studioCallbackUrl }}/oauth/callback",
        "scope": "user repo",
        "state": "{{ $guid }}"
      },
      "captureOAuthCallback": {
        "enabled": true,
        "timeout": 300
      },
      "launchBrowser": "{{ .url }}"
    },
    {
      "id": "exchange-token",
      "name": "Exchange code for access token",
      "method": "POST",
      "url": "https://github.com/login/oauth/access_token",
      "headers": {
        "Accept": "application/json"
      },
      "body": {
        "client_id": "{{ .vars.clientId }}",
        "client_secret": "{{ .vars.clientSecret }}",
        "code": "{{ .responses.github-auth.callback.code }}",
        "redirect_uri": "{{ $studioCallbackUrl }}/oauth/callback"
      }
    }
  ]
}
```

## Related Features

- **Enhanced Launch Browser** (Priority 2): Supports dynamic URL construction for OAuth
- **Flow Runner Execution Controls** (Completed): Provides step-by-step debugging for OAuth flows
- **Execution Log Visualizer** (Priority 3): Helps debug OAuth flow execution

## Technical Notes

- Requires Studio mode (Express server running)
- Uses SSE (Server-Sent Events) for client-server communication
- Session management in memory (could be Redis for production)
- Browser launch uses existing `launchBrowser` infrastructure
- Backwards compatible: Existing configs without `captureOAuthCallback` work unchanged
