# Enhanced Postman Import

**Status:** Planned

**Priority:** 4

## Overview

Improve the existing Postman import feature with multi-environment support, better variable resolution, and batch collection processing.

## Current Limitations

- Single collection file only
- No environment file support
- Manual variable resolution required
- No preview before import
- Limited customization options

## Proposed Improvements

### 1. Multiple Environment File Support

**UI:**
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

### 2. Multiple Collection Import

- Support uploading multiple collection files
- Merge related collections into single config
- Detect duplicate requests across collections
- Combine request chains from different collections

### 3. Better Variable Resolution

- Show preview of resolved vs unresolved variables
- Highlight which variables come from which environment
- Option to keep variable syntax for runtime resolution
- Smart detection of dynamic values to preserve as placeholders
- Map Postman variables to FlowSphere syntax

### 4. Import Preview & Customization

**Preview Features:**
- Show all discovered requests before importing
- Display resolved variable values
- Preview generated node structure
- Show which variables are unresolved

**Customization Options:**
- Edit node names and IDs before importing
- Rearrange request sequence with drag-and-drop
- Choose which requests to include/exclude
- Batch edit common properties (base URL, headers)

## User Workflow

1. Click "Import Config" → "From Postman Collection"
2. Upload collection file + multiple environment files
3. Select environment for variable resolution
4. Preview discovered requests with variable values
5. Customize node order, names, and selections
6. Click "Import" to generate config
7. Review and edit generated config in Studio

## Variable Mapping

### Postman → FlowSphere

| Postman | FlowSphere |
|---------|------------|
| `{{variableName}}` | `{{ .vars.variableName }}` |
| `{{$guid}}` | `{{ $guid }}` |
| `{{$timestamp}}` | `{{ $timestamp }}` |
| Collection variables | Global `variables` section |
| Environment variables | Global `variables` section |

## Implementation Phases

### Phase 1 - Environment File Support
- Parse environment files
- Merge environment variables with collection variables
- Environment selector UI

### Phase 2 - Import Preview
- Show preview dialog before import
- Display all requests with resolved variables
- Highlight unresolved variables

### Phase 3 - Customization
- Add/remove requests
- Reorder with drag-and-drop
- Edit node names/IDs
- Batch property editing

### Phase 4 - Multi-Collection
- Upload multiple collections
- Detect duplicates
- Merge into single config

## Success Criteria

- Import Postman collections with environment variables
- Variables are correctly resolved and mapped
- Users can preview and customize before import
- Multiple environments generate appropriate configs
- Unresolved variables are clearly indicated
