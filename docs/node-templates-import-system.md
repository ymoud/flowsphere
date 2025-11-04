# Technical Design: Node Templates & Import System

**Feature Priority:** 2
**Status:** Design Phase
**Target Version:** 0.2.0

---

## Executive Summary

Replace the current template system with a flexible two-button approach that separates "starting fresh" (Load Config) from "adding to existing work" (Import Nodes). This enables users to quickly add common API patterns to their flows without starting over or manually editing JSON.

---

## Problem Statement

### Current Limitations
1. **Mixed Templates**: The "New" button dropdown mixes complete templates with individual patterns
2. **No Incremental Building**: Users must load a full template and delete unwanted nodes to get specific features
3. **No Pattern Library**: No way to add common patterns (auth, user input) to an existing flow incrementally
4. **Tedious Workflow**: Building from scratch requires either starting empty or modifying templates

### User Pain Points
- "I want to add OAuth to my existing flow, but I have to start over with the OAuth template"
- "I need a user input prompt pattern, but templates only show complete workflows"
- "I can't reuse common authentication patterns across different flows"

---

## Proposed Solution

### Two-Button Architecture

**1. Load Config Button**
Opens a modal with three import options for replacing the entire current flow:
- Load FlowSphere JSON Config
- Import from Postman Files
- Import from Swagger File (future)

**2. Import Nodes Button**
Opens a modal showing categorized node templates that can be added to the current flow:
- Authentication patterns
- User interaction patterns
- Validation examples
- Conditional flow patterns

---

## Technical Architecture

### 1. Template Storage Structure

```
studio/
└── templates/
    ├── nodes/                      # Individual node templates
    │   ├── auth/
    │   │   ├── bearer-token.json
    │   │   ├── oauth-flow.json     # Multi-node template
    │   │   └── api-key.json
    │   ├── user-input/
    │   │   ├── username-password.json
    │   │   ├── verification-code.json
    │   │   └── custom-input.json
    │   ├── validation/
    │   │   ├── status-token-extract.json
    │   │   ├── paginated-response.json
    │   │   └── multi-field.json
    │   └── conditional/
    │       ├── premium-user.json
    │       └── skip-on-error.json
    └── config/                     # Full config templates (existing)
        ├── empty.json
        ├── simple.json
        ├── oauth.json
        └── user-input.json
```

### 2. Node Template Format

Each template is a JSON file containing either:
- **Single node**: One node object
- **Multi-node**: Array of node objects (e.g., OAuth flow = 2 nodes)

**Example: `auth/bearer-token.json`**
```json
{
  "templateName": "Bearer Token Authentication",
  "description": "Simple login with token extraction",
  "category": "auth",
  "requiredVariables": ["apiUsername", "apiPassword"],
  "nodes": [
    {
      "id": "authenticate",
      "name": "Login with Bearer Token",
      "method": "POST",
      "url": "/auth/login",
      "body": {
        "username": "{{ .vars.apiUsername }}",
        "password": "{{ .vars.apiPassword }}"
      },
      "validations": [
        { "httpStatusCode": 200 },
        { "jsonpath": ".token", "exists": true }
      ]
    }
  ]
}
```

**Example: `auth/oauth-flow.json` (Multi-node)**
```json
{
  "templateName": "OAuth 2.0 Flow",
  "description": "Two-step OAuth authentication with browser launch",
  "category": "auth",
  "requiredVariables": ["clientId", "clientSecret", "redirectUri"],
  "nodes": [
    {
      "id": "oauth-get-url",
      "name": "Get OAuth Authorization URL",
      "method": "POST",
      "url": "/oauth/authorize",
      "body": {
        "client_id": "{{ .vars.clientId }}",
        "redirect_uri": "{{ .vars.redirectUri }}",
        "response_type": "code",
        "scope": "read write"
      },
      "launchBrowser": ".authorizationUrl",
      "validations": [
        { "httpStatusCode": 200 },
        { "jsonpath": ".authorizationUrl", "exists": true }
      ]
    },
    {
      "id": "oauth-exchange-code",
      "name": "Exchange Code for Access Token",
      "method": "POST",
      "url": "/oauth/token",
      "userPrompts": {
        "authCode": "Enter the authorization code from browser:"
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
        { "jsonpath": ".access_token", "exists": true },
        { "jsonpath": ".token_type", "equals": "Bearer" }
      ]
    }
  ]
}
```

### 3. Smart Features Implementation

#### A. Variable Auto-Creation

**Behavior:**
When importing a node template that references variables (e.g., `{{ .vars.clientId }}`), the system will:

1. **Scan the template** for all variable references using the pattern `{{ .vars.* }}`
2. **Compare with existing variables** in the current config
3. **Auto-create missing variables** with placeholder values in format: `YOUR_{VARNAME}_HERE`
4. **Notify the user** with a message listing all auto-created variables
5. **Highlight the Variables section** to guide user to update values

**Example:**
- Template references: `{{ .vars.clientId }}` and `{{ .vars.apiKey }}`
- Current config has: `clientId` only
- System auto-creates: `apiKey: "YOUR_APIKEY_HERE"`
- User sees notification: "Added variable 'apiKey' to your config. Update the value in Variables section."

**Benefits:**
- No broken references after import
- Clear placeholder values guide the user
- Immediate visibility of required configuration
- Works for all variable types (.vars references)

#### B. ID Auto-Rename

**Behavior:**
When importing a node template whose ID already exists in the current flow, the system will:

1. **Detect ID conflicts** by checking against existing node IDs
2. **Auto-rename with incremental suffix**: append `-2`, `-3`, `-4`, etc.
3. **Notify the user** about the rename with before/after ID names
4. **Preserve all functionality** - the renamed node works identically

**Example:**
- Current flow has node: `id: "authenticate"`
- Importing template with: `id: "authenticate"`
- System renames to: `id: "authenticate-2"`
- User sees notification: "Renamed node ID to 'authenticate-2' to avoid conflict."

**Benefits:**
- No ID collisions ever occur
- Predictable naming scheme (easy to understand)
- User can manually rename later if desired
- Preserves all references and relationships

#### C. Node Placement with Highlighting

**Behavior:**
When nodes are successfully imported, the system will:

1. **Add nodes to the end** of the current flow (preserving existing sequence)
2. **Re-render the UI** to show updated node list
3. **Highlight newly added nodes** with a green border and subtle background color
4. **Auto-scroll** to the first newly added node
5. **Fade out highlight** after 3 seconds, returning to normal appearance

**Visual Feedback:**
- Newly added nodes display with green border and light green background
- Animation smoothly fades from highlighted to normal state over 3 seconds
- User can immediately identify which nodes were just added
- Highlight persists long enough to be noticed but doesn't require dismissal

**Benefits:**
- Clear visual indicator of what changed
- Prevents confusion about where new nodes went
- Non-intrusive (auto-fades without user action)
- Works with both single and multi-node templates

---

## UI/UX Design

### Import Nodes Modal

```
┌─────────────────────────────────────────────────────────┐
│  Import Nodes                                        × │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Select node template to add:                          │
│                                                         │
│  🔐 Authentication                                      │
│   ┌──────────────────────────────────────────────────┐│
│   │ [+] Bearer Token Auth                            ││
│   │     Simple login with token extraction           ││
│   │                                                   ││
│   │ [+] OAuth 2.0 Flow (2 nodes)                     ││
│   │     Complete OAuth flow with browser launch      ││
│   │                                                   ││
│   │ [+] API Key Header                               ││
│   │     Static API key in request headers            ││
│   └──────────────────────────────────────────────────┘│
│                                                         │
│  👤 User Interaction                                    │
│   ┌──────────────────────────────────────────────────┐│
│   │ [+] Username/Password Prompt                     ││
│   │     Interactive credential collection            ││
│   │                                                   ││
│   │ [+] Verification Code Input                      ││
│   │     2FA/MFA code prompt                          ││
│   │                                                   ││
│   │ [+] Custom User Input                            ││
│   │     Generic template for custom prompts          ││
│   └──────────────────────────────────────────────────┘│
│                                                         │
│  ✅ Validation Examples                                 │
│  🔀 Conditional Flow                                    │
│                                                         │
│  ℹ️  Nodes will be added to the end of your flow      │
│                                                         │
│                                    [Cancel]             │
└─────────────────────────────────────────────────────────┘
```

### Load Config Modal

```
┌─────────────────────────────────────────────────────────┐
│  Load Config                                         × │
├─────────────────────────────────────────────────────────┤
│  Choose import source:                                  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │  📄 FlowSphere JSON Config                        │ │
│  │  Load an existing FlowSphere configuration file   │ │
│  │                                        [Choose File]│ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │  📮 Postman Collection                            │ │
│  │  Import from Postman collection + environment     │ │
│  │                                        [Choose File]│ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │  📋 Swagger/OpenAPI Spec              🔜 Coming   │ │
│  │  Generate config from API specification           │ │
│  │                                                    │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
│  ⚠️  This will replace your current flow.              │
│      Save before proceeding.                            │
│                                                         │
│                                    [Cancel]             │
└─────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Template Storage & Structure (Week 1)

**Tasks:**
1. Create `studio/templates/nodes/` directory structure
2. Create initial node templates:
   - `auth/bearer-token.json`
   - `auth/oauth-flow.json`
   - `auth/api-key.json`
   - `user-input/username-password.json`
   - `user-input/verification-code.json`
   - `validation/status-token-extract.json`
   - `conditional/premium-user.json`

**Acceptance Criteria:**
- [ ] Directory structure exists
- [ ] 7+ working node templates created
- [ ] Each template has proper metadata (name, description, category, requiredVariables)
- [ ] Templates validated against JSON schema

---

### Phase 2: Backend API Support (Week 1)

**File:** `bin/flowsphere.js`

**New API Endpoints:**

1. **GET `/api/templates/nodes`** - List all available node templates
   - Returns templates grouped by category (auth, user-input, validation, conditional)
   - Each template includes: id, name, description, category, requiredVariables, nodes
   - Reads from `studio/templates/nodes/` directory structure

2. **GET `/api/templates/nodes/:category/:id`** - Get specific template
   - Returns full template JSON for the requested category and id
   - Example: `/api/templates/nodes/auth/bearer-token`
   - Returns 404 if template doesn't exist

**Response Format:**
```json
{
  "auth": [
    {
      "id": "bearer-token",
      "templateName": "Bearer Token Authentication",
      "description": "Simple login with token extraction",
      "category": "auth",
      "requiredVariables": ["apiUsername", "apiPassword"],
      "nodes": [...]
    }
  ],
  "user-input": [...],
  "validation": [...],
  "conditional": [...]
}
```

**Acceptance Criteria:**
- [ ] `/api/templates/nodes` endpoint returns all templates grouped by category
- [ ] `/api/templates/nodes/:category/:id` endpoint returns specific template
- [ ] Error handling for missing templates (404 response)
- [ ] Tested with curl/Postman
- [ ] Templates cached in memory for performance

---

### Phase 3: Frontend - Import Nodes Modal (Week 2)

**File:** `studio/js/import-nodes.js`

**State Management Integration:**
- **Critical**: Must integrate with existing Studio state management system
- Studio uses a global `config` variable declared in `state.js` (not `window.currentConfig`)
- All modifications must update this global `config` object directly
- After modifying config, trigger UI re-render using `renderEditor()` function
- Variables must be added to `config.variables` and rendered with `renderGlobalVariables()`

**Module Responsibilities:**

1. **Template Management**
   - Fetch available templates from `/api/templates/nodes` on initialization
   - Cache templates in memory for quick access
   - Group templates by category for display

2. **Modal UI**
   - Create modal HTML structure with Bootstrap components
   - Render categorized sections (collapsible/expandable)
   - Display each template as a clickable card showing:
     - Template name
     - Description
     - Number of nodes (e.g., "2 nodes" for OAuth flow)
     - Icon based on category

3. **Import Workflow**
   - User clicks template card
   - Fetch full template from API
   - Process template with smart features:
     - Detect missing variables → auto-create with placeholders
     - Detect ID conflicts → auto-rename with suffix
   - Add processed nodes to **global `config` object** (from state.js)
   - Trigger UI re-render via `renderEditor()`
   - Highlight newly added nodes
   - Show notifications for auto-actions
   - Close modal

4. **Smart Processing**
   - **Variable Detection**: Scan template nodes for `{{ .vars.* }}` patterns
   - **Variable Creation**: Add missing variables to `config.variables` with placeholder values
   - **ID Conflict Detection**: Check if node IDs exist in `config.nodes`
   - **ID Renaming**: Append `-2`, `-3` suffix until unique
   - **Notification**: Alert user of all auto-actions taken

5. **Visual Feedback**
   - Add `newly-added` CSS class to imported nodes using `data-node-index` attribute
   - Auto-scroll to first imported node
   - Remove highlight class after 3 seconds
   - Notifications stack vertically with unique IDs to prevent overlap

**Acceptance Criteria:**
- [ ] Modal opens with categorized template list
- [ ] Templates display name, description, and node count
- [ ] Clicking template imports it successfully
- [ ] Nodes added to global `config.nodes` array
- [ ] Missing variables auto-created in `config.variables`
- [ ] UI re-renders to show new nodes and variables
- [ ] Conflicting IDs auto-renamed
- [ ] Notifications shown for auto-actions (with clear messages)
- [ ] Notifications stack properly and auto-dismiss
- [ ] Newly added nodes highlighted for 3 seconds
- [ ] Modal closes automatically after successful import
- [ ] Works only when config is loaded (shows warning otherwise)

---

### Phase 4: Frontend - Load Config Modal Refactor (Week 2)

**File:** `studio/js/load-config.js`

**Refactor Objective:**
Rename existing "New" button to "Load Config" and restructure the modal to clearly show three distinct import sources.

**Changes:**

1. **Button Rename**
   - Change button text from "New" to "Load Config"
   - Update icon to folder-open icon
   - Keep existing primary button styling

2. **Modal Structure**
   - Show three clearly separated import source options:
     - **FlowSphere JSON Config** (existing functionality)
     - **Postman Collection** (existing functionality)
     - **Swagger/OpenAPI Spec** (placeholder - disabled with "Coming Soon" badge)
   - Each option displays as a card with:
     - Icon
     - Title
     - Description
     - File upload button or disabled state

3. **Warning Behavior**
   - Before loading any config, check if current flow has unsaved changes
   - Show confirmation dialog: "This will replace your current flow. Continue?"
   - Only proceed if user confirms
   - Keep existing auto-save to localStorage functionality

4. **User Experience**
   - Make it clear this action replaces the entire flow (not additive)
   - Contrast with "Import Nodes" which is additive
   - Keep existing template functionality (Empty, Simple, OAuth, User Input)

**Acceptance Criteria:**
- [ ] "New" button renamed to "Load Config"
- [ ] Modal shows three import sources as distinct cards
- [ ] FlowSphere JSON import works (existing functionality preserved)
- [ ] Postman import works (existing functionality preserved)
- [ ] Swagger option visible but disabled with "🔜 Coming Soon" badge
- [ ] Warning shown before replacing current flow
- [ ] Confirmation dialog prevents accidental replacement
- [ ] No breaking changes to existing functionality

---

### Phase 5: UI Integration & Polish (Week 3)

**Changes to Studio Header:**

1. **Button Updates** (`studio/index.html`)
   - Replace existing "New" button with "Load Config" button
   - Add new "Import Nodes" button next to it
   - Use Bootstrap button classes for consistency
   - Icons: folder-open for Load Config, plus-circle for Import Nodes
   - Colors: primary (blue) for Load Config, success (green) for Import Nodes

2. **Layout Adjustments**
   - Position buttons side-by-side in the toolbar
   - Maintain existing button spacing and alignment
   - Ensure buttons work on mobile (stack vertically on small screens)

**CSS Styling** (`studio/css/styles.css`)

1. **Import Nodes Modal Styles**
   - Category sections with proper spacing and visual hierarchy
   - Category headers with icons and bold text
   - Template cards with:
     - Clean borders and rounded corners
     - Hover effect: green border + subtle slide animation
     - Proper padding and typography
     - Visual distinction between name, description, and metadata

2. **Newly Added Node Highlight**
   - Green border (2px solid)
   - Light green background
   - Smooth fade animation over 3 seconds
   - Returns to normal styling after animation completes
   - Works in both light and dark themes

3. **Responsive Design**
   - Modal scrolls on small screens
   - Template cards stack properly
   - Touch-friendly tap targets (minimum 44px height)
   - Proper spacing on mobile devices

**Acceptance Criteria:**
- [ ] Two distinct buttons: "Load Config" and "Import Nodes"
- [ ] Buttons have appropriate icons and colors (folder-open, plus-circle)
- [ ] Button positioning and spacing matches existing UI style
- [ ] Template cards styled correctly with proper hierarchy
- [ ] Hover effects work smoothly (color change + slide animation)
- [ ] Newly added nodes highlight animation works (3s green fade)
- [ ] Responsive design works on mobile (buttons stack, cards scroll)
- [ ] Dark theme support (all colors use CSS variables)
- [ ] Accessibility: keyboard navigation works in modal

---

### Phase 6: Testing & Documentation (Week 3)

**Test Cases:**
1. **Import single-node template**
   - Template imported successfully
   - Node added to end of flow
   - Node highlighted for 3 seconds

2. **Import multi-node template (OAuth)**
   - Both nodes imported in correct order
   - Both nodes highlighted
   - IDs unique if conflicts exist

3. **Variable auto-creation**
   - Missing variables detected
   - Variables added to config with placeholders
   - Notification shown to user

4. **ID conflict handling**
   - Conflicting ID detected
   - New ID auto-generated with -2 suffix
   - Notification shown to user
   - References updated correctly

5. **Load Config (replacement)**
   - Warning shown before replacing
   - Current flow replaced with new config
   - No conflicts with Import Nodes

**Documentation:**
- [ ] Update README.md with Import Nodes feature
- [ ] Add screenshots to docs
- [ ] Create video tutorial (optional)
- [ ] Update CLAUDE.md with new feature details

---

## Success Criteria

### User Experience
- ✅ Users can add common patterns without manual JSON editing
- ✅ No ID conflicts or broken variable references after import
- ✅ Clear separation between "start fresh" and "add to existing"
- ✅ Import workflow takes < 10 seconds from click to added nodes

### Technical
- ✅ 10+ high-quality templates covering essential patterns
- ✅ Auto-variable creation works for all templates
- ✅ Auto-ID rename handles all conflict scenarios
- ✅ Newly added nodes clearly indicated visually
- ✅ Backward compatible (existing configs work unchanged)
- ✅ All templates validated and tested

### Performance
- ✅ Template loading < 100ms
- ✅ Import operation < 500ms
- ✅ UI remains responsive during import

---

## Future Enhancements

### Phase 7: Custom Templates (v0.3.0)
- Allow users to save their own node patterns as templates
- Template sharing via GitHub Gist or file export
- Template marketplace (community-contributed)

### Phase 8: Smart Template Suggestions (v0.4.0)
- Analyze current flow and suggest relevant templates
- "Users who added this template also added..." recommendations
- Auto-detect authentication patterns and suggest next steps

### Phase 9: Template Variables UI (v0.5.0)
- Visual preview of required variables before import
- Inline variable editing during import
- Variable value suggestions based on context

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Template quality varies | Medium | Establish template guidelines and validation schema |
| ID conflicts not detected | High | Comprehensive testing of ID rename logic |
| Variable auto-creation creates too many vars | Low | Only create variables actually referenced in imported nodes |
| UI becomes cluttered with many templates | Medium | Categorization + search/filter functionality |
| Templates become outdated | Low | Version templates and show compatibility warnings |

---

## Dependencies

- **None** - This is a pure frontend + template feature
- Uses existing config structure (no breaking changes)
- Leverages existing Studio UI components

---

## Timeline

**Total: 3 weeks**

- Week 1: Template creation + Backend API
- Week 2: Frontend modals (Import Nodes + Load Config refactor)
- Week 3: UI polish + Testing + Documentation

**Target Release:** v0.2.0 (2 weeks after v0.1.0)

---

## Approval & Sign-off

**Technical Lead:** [ ]
**Product Owner:** [ ]
**QA Lead:** [ ]

**Approved for Implementation:** [ ] Yes / [ ] No
**Date:** _____________
