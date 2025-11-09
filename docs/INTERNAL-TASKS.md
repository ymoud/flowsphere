# Internal Tasks & Technical Improvements

This document tracks internal tasks, technical debt, code cleanup, and infrastructure improvements that are not user-facing features.

---

## High Priority

### 1. Debug Mode & Bug Reporting System

**Goal:** Make it easy for users to report bugs with complete debugging information.

**Components:**

**A. Debug Mode for Studio**
- Add `--debug` flag to `flowsphere studio` command
- Server-side debug logging:
  - Store detailed execution logs in `logs/debug/` directory
  - Log all SSE events, HTTP requests/responses, errors
  - Include timestamps, execution IDs, request/response payloads
  - Auto-cleanup logs older than 7 days
- Client-side debug logging:
  - Enable all `console.log()` statements (currently many are production-disabled)
  - Log all event processing, state changes, user actions
  - Show debug indicator in Studio UI (e.g., orange badge: "Debug Mode")

**B. Bug Report Documentation**
- Create `docs/reporting-bugs.md` with instructions:
  - **For Studio bugs:**
    - Run `flowsphere studio --debug`
    - Reproduce the bug
    - Collect: Browser console logs (F12), server logs from `logs/debug/`, screenshot
    - Report at: https://github.com/anthropics/flowsphere/issues
  - **For CLI bugs:**
    - Run with `--debug` flag: `flowsphere config.json --debug`
    - Collect: Terminal output, execution log from `logs/`, config file (sanitized)
    - Report at: https://github.com/anthropics/flowsphere/issues

**Implementation Notes:**
- Add `enableDebug` flag to server startup
- Conditionally enable Winston logger with file transport
- Client checks `window.DEBUG_MODE` or query param `?debug=true`

---

### 2. Internationalization (i18n) & Resource Management

**Goal:** Centralize all UI text in resource files for consistency and future multi-language support.

**Structure:**

```
studio/resources/
├── resources.en.json    # English (default)
├── resources.es.json    # Spanish (future)
├── resources.fr.json    # French (future)
└── resources.de.json    # German (future)
```

**Resources Format:**
```json
{
  "branding": {
    "flow": "Flow",
    "goWithFlow": "Go with the <em>Flow</em>",
    "flowInMotion": "<em>Flow</em> in Motion",
    "flowInterrupted": "<em>Flow</em> Interrupted",
    "flowComplete": "<em>Flow</em> Complete",
    "flowOnceAgain": "<em>Flow</em> once again"
  },
  "buttons": {
    "run": "Run",
    "stop": "Stop",
    "interruptFlow": "Interrupt the <em>Flow</em>",
    "interruptingFlow": "Interrupting the <em>Flow</em>...",
    "clearResults": "Clear Results",
    "closeMonitor": "Close Monitor",
    "saveLog": "Save Log"
  },
  "messages": {
    "userHadSecondThoughts": "User had second thoughts...",
    "userHadSecondThoughtsBeforeNode": "User had second thoughts just before node {nodeNumber} could be part of the <em>Flow</em>",
    "executionComplete": "All {totalSteps} steps executed",
    "executionInterrupted": "Execution interrupted after Step {stepNumber} of {totalSteps}"
  }
}
```

**Implementation:**
- Create `studio/js/resources.js` module:
  - `loadResources(lang)` - Fetch JSON file
  - `getString(key)` - Get localized string (supports dot notation: `resources.branding.flow`)
  - `formatString(key, params)` - Replace placeholders: `{nodeNumber}`, `{totalSteps}`
- Default to `en` if no language preference
- Store user preference in `localStorage.setItem('flowsphere-language', 'en')`
- Add language selector in Studio settings (future)

**Benefits:**
- Consistent branded terminology across UI
- Easy to update wording globally (e.g., changing all "Flow" capitalization)
- Foundation for community translations
- Easier to maintain than scattered string literals

**Migration Plan:**
1. Create `resources.en.json` with current English strings
2. Replace hardcoded strings gradually (module by module)
3. Priority: Flow Runner modal, buttons, status messages
4. Test with `resources.es.json` for validation

---

## Medium Priority

### 3. Code Review & Refactoring

**TODO:** Review and refactor key modules for maintainability:
- `studio/js/flow-runner.js` - Break into smaller modules (execution, UI, events)
- `bin/flowsphere.js` - Extract SSE logic into separate module
- Add JSDoc comments to all public functions
- Standardize error handling patterns

### 4. Automated Testing

**TODO:** Add test coverage for critical paths:
- Unit tests for variable substitution (`lib/substitution.js`)
- Unit tests for condition evaluation (`lib/conditions.js`)
- Unit tests for validation logic (`lib/validator.js`)
- Integration tests for Flow Runner execution
- E2E tests for Studio UI workflows

### 5. Performance Optimization

**TODO:** Optimize Studio performance:
- Lazy load config templates
- Debounce autocomplete suggestions
- Virtual scrolling for large step lists (>50 steps)
- Optimize JSON preview rendering

### 6. Version Display & Update Check in Settings

**Goal:** Help users identify their current version and know when updates are available.

**Components:**

**A. Display Current Version**
- Add version display to Settings panel → About page
- Read version from `package.json` via server endpoint
- Display format: `FlowSphere Studio v0.1.1`
- Show installation path/mode (global vs local npm install)

**B. Version Check (Optional Enhancement)**
- Check npm registry for latest published version
- Compare with current version (semver)
- If update available, show notification badge on Settings icon
- Display update notification in About page

**C. Update Instructions**
- If newer version detected, show clear instructions:
  ```
  Update Available: v0.2.0 (current: v0.1.1)

  To update FlowSphere:
  1. Stop the Studio server (Ctrl+C in terminal)
  2. Run: npm update -g flowsphere
  3. Restart: flowsphere studio

  What's new in v0.2.0:
  - [Link to release notes/changelog]
  ```
- Differentiate instructions for global vs local installs
- Include link to GitHub releases page

**Implementation Notes:**
- Add `/api/version` endpoint returning `package.json` version
- Add `/api/version/check` endpoint to query npm registry
- Cache version check results (check once per session)
- Store last check timestamp in localStorage
- Show "Check for Updates" button for manual check

**Benefits:**
- Users know what version they're running (helpful for bug reports)
- Clear upgrade path when updates available
- Reduces confusion about feature availability
- Professional polish for the application

**Priority:** Medium - Nice-to-have improvement, helpful for support/troubleshooting

---

## Low Priority

### 7. Developer Experience

**TODO:** Improve development workflow:
- Add `npm run dev` script with hot reload for Studio
- Create developer documentation in `docs/development.md`
- Add VS Code debug configurations (`.vscode/launch.json`)
- Document contribution guidelines

### 8. CI/CD Pipeline

**TODO:** Automate quality checks:
- GitHub Actions workflow for testing
- Automated lint checks on PR
- Automated npm publish on release tag
- Generate changelog from commits

---

## Completed

*(Tasks will be moved here when completed)*

---

## Notes

- Tasks in this file are **internal improvements**, not user-facing features
- User-facing features belong in `ROADMAP.md`
- When a task is substantial, create a separate document in `/docs/internal/`
