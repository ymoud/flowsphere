# FlowSphere Roadmap

This document outlines the planned features and enhancements for FlowSphere.

## Priority Overview

### Planned Features

Features listed in priority order (highest to lowest):

| Priority | Feature | Status | Details |
|----------|---------|--------|---------|
| 1 | Flow Runner - Execution Controls | In Progress | [View Details](features/flow-runner-execution-controls.md) |
| 2 | Execution Log Visualizer | Planned | [View Details](features/execution-log-visualizer.md) |
| 3 | Swagger/OpenAPI Import | Planned | [View Details](features/swagger-openapi-import.md) |
| 4 | Enhanced Postman Import | Planned | [View Details](features/enhanced-postman-import.md) |
| 5 | Export to Postman Collection/Environment | Planned | [View Details](features/export-to-postman.md) |
| 6 | Visual Workflow Storytelling & Export | Planned | [View Details](features/visual-workflow-storytelling-export.md) |

### Completed & External Features

| Feature | Status |
|---------|--------|
| Publish to NPM | ✅ Completed (v0.1.0) |
| Node Templates & Import System | ✅ Completed |
| Try it Out - Individual Node Testing (Engage Node) | ✅ Completed |
| Flow Runner - Live Execution Engine | ✅ Completed |
| JavaScript/Node.js Version & NPM Package | ✅ Completed |
| Plug-and-Play UI Architecture | ✅ Completed |
| MCP Server for Code Generation | [External Repository](https://github.com/ymoud/flowsphere-mcp) |

---

## Feature Summaries

### 1. Flow Runner - Execution Controls

**Status:** In Progress

Add execution controls to the Flow Runner with **step-by-step execution modes** (replacing the original pause/resume design).

**Key Features:**
- **Stop/Cancel**: Abort execution at any point (Phase 1)
- **Step-by-Step**: Execute one step at a time with manual control (Phase 2)
- **Auto-Step**: Execute steps with configurable auto-resume delay (Phase 3)

**Why the change from pause/resume?**
The original pause/resume approach had UX issues due to signal lag between client and server. The new step-by-step approach provides clearer, more predictable behavior without timing confusion.

➡️ [Full Feature Specification](features/flow-runner-execution-controls.md)

---

### 2. Execution Log Visualizer

**Status:** Planned

A visual interface for exploring, analyzing, and comparing execution logs with rich filtering, search, and export capabilities.

**Key Features:**
- Timeline/waterfall view of execution flow
- Performance metrics and bottleneck detection
- Compare multiple executions side-by-side
- Filter and search through large logs
- Export as HTML/PDF
- Standalone CLI and Studio integration

➡️ [Full Feature Specification](features/execution-log-visualizer.md)

---

### 3. Swagger/OpenAPI Import

**Status:** Planned

Import API specifications directly into FlowSphere Studio for automatic config generation.

**Key Features:**
- Support Swagger 2.0 and OpenAPI 3.0+
- Preview endpoints before import
- Auto-generate nodes with validations
- Extract authentication schemes
- Variable detection and mapping

➡️ [Full Feature Specification](features/swagger-openapi-import.md)

---

### 4. Enhanced Postman Import

**Status:** Planned

Improve the existing Postman import with multi-environment support and better variable resolution.

**Key Features:**
- Multiple environment file support
- Import preview with customization
- Better variable resolution and mapping
- Multiple collection merging
- Batch editing before import

➡️ [Full Feature Specification](features/enhanced-postman-import.md)

---

### 5. Export to Postman Collection/Environment

**Status:** Planned

Convert FlowSphere configs back into Postman collection and environment files for team collaboration.

**Key Features:**
- Export to Postman Collection v2.1 format
- Generate environment files from variables
- Convert validations to test scripts
- Convert conditions to pre-request scripts
- ZIP download with README

➡️ [Full Feature Specification](features/export-to-postman.md)

---

### 6. Visual Workflow Storytelling & Export

**Status:** Planned

An **animated workflow storytelling tool** that turns API integrations into beautiful, shareable visual presentations. Create engaging flowchart diagrams with data flow animations and auto-generated narratives that anyone can understand.

**Purpose:** Help teams **explain and share** API workflows through visual storytelling, not just document execution results.

**Key Features:**
- 🌊 **Animated Data Flow**: Watch variables flow between nodes with particle effects
- 📖 **Story Mode**: Clean narrative view explaining "what it does" (non-technical friendly)
- 🔍 **Debug Mode**: Toggle to see technical details (methods, headers, responses)
- 🎬 **Interactive Timeline**: Scrubber with play/pause controls and auto-narration
- 🔄 **Variable Substitution Visualization**: See `{{ .responses.login.token }}` → actual values
- ✨ **Fun but Professional**: Smooth animations, delightful micro-interactions
- 📦 **Self-Contained HTML**: Export single file that works offline, anywhere

**Complements Execution Log Visualizer:**
- Log Visualizer = Analysis tool for developers (filtering, metrics, debugging)
- Visual Storytelling = Presentation tool for everyone (demos, onboarding, sharing)

**Use Cases:**
- Product demos and stakeholder presentations
- Onboarding new team members
- Documenting API integrations visually
- Sharing workflows with non-technical people

➡️ [Full Feature Specification](features/visual-workflow-storytelling-export.md)

---

## How to Contribute

See individual feature documents in the `/features` directory for detailed specifications, implementation phases, and acceptance criteria.

Each feature document includes:
- Overview and benefits
- Detailed specifications
- Implementation phases
- Success criteria
- Technical details

---

## Feature Request Process

1. Check existing feature documents in `/features` directory
2. If feature doesn't exist, create a new issue on GitHub
3. Discuss scope and approach before implementation
4. Create feature document if approved
5. Implement in phases as specified

---

## Notes

- Feature documents are living documents and may be updated as requirements evolve
- Completed features are moved from "Planned" to "Completed" status
- External features are maintained in separate repositories
