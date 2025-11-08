# Execution Log Visualizer

**Status:** Planned

**Priority:** 2

## Overview

A visual interface for exploring, analyzing, and comparing execution logs with rich filtering, search, and export capabilities.

## Benefits

- ✅ Visual understanding of execution flow and timing
- ✅ Quick identification of failures and bottlenecks
- ✅ Compare multiple executions to spot differences
- ✅ Filter and search through large execution logs
- ✅ Performance analysis with metrics and insights
- ✅ Export visualizations for documentation and sharing
- ✅ Works standalone (CLI) and integrated (Studio)
- ✅ Plug-and-play Studio module (optional feature)

## Core Features

### Summary Panel
- Overall execution status (success/failed/stopped)
- Step counts (executed/skipped/failed)
- Total duration and timing stats
- Performance insights (fastest/slowest steps)

### Timeline/Waterfall View
- Visual representation of execution flow
- Duration bars showing time spent per step
- Skipped steps indication
- Bottleneck highlighting

### Step Cards (Expandable)
- Request/response details
- Validation results
- Skip reasons
- Error messages
- Performance metrics per step

### Filter & Search
- Filter by status (success/failed/skipped)
- Filter by duration ranges
- Filter by HTTP method/status code
- Full-text search in step names/URLs
- Search in request/response bodies

### Performance Metrics
- Duration statistics (min/max/avg/median)
- Distribution histogram
- Bottleneck detection
- Success rate tracking
- Recommendations for slow steps

### Compare Logs (Advanced)
- Side-by-side diff view for two logs
- Highlight differences (duration/status/conditions)
- Performance regression detection
- Identify new/removed/modified steps

### Export Options
- Self-contained HTML file
- PDF report
- Raw JSON log
- Optional sensitive data redaction

## Integration Points

### 1. Standalone CLI Command
```bash
flowsphere visualize logs/execution_log_20250128_143022.json
```
Launches Express server and opens browser automatically.

### 2. Studio Plug-and-Play Module
- Optional feature toggle in Studio settings
- Adds "Log Visualizer" tab to Studio interface
- Load and visualize any log file
- Browse historical logs with file picker

### 3. Post-Execution Prompt
After running a sequence (CLI or Studio), offer immediate visualization option.

## Implementation Phases

### Phase 1 - Basic Visualizer
- Create standalone visualizer HTML/CSS/JS (Bootstrap-based)
- Summary panel with basic stats
- Step cards with expand/collapse
- Filter by status
- CLI command for visualization

### Phase 2 - Timeline & Metrics
- Timeline/waterfall view
- Performance metrics panel
- Bottleneck detection
- Duration distribution visualization

### Phase 3 - Search & Advanced Filtering
- Full-text search
- Advanced filters (duration, methods, status codes)
- Filter combination logic
- Show filtered count

### Phase 4 - Compare Logs
- Side-by-side diff view
- Highlight differences
- Condition evaluation comparison
- Performance regression detection

### Phase 5 - Export Functionality
- Export as HTML/PDF
- Share link generation (optional)
- Redact sensitive data option

### Phase 6 - Studio Integration
- Add as plug-and-play module
- Create "Log Visualizer" tab
- File browser for logs
- Post-execution prompt
- Load historical logs

### Phase 7 - Polish & Advanced Features
- Keyboard shortcuts
- Print-friendly CSS
- Dark mode support
- Responsive design
- Copy step details to clipboard

## Technology Stack

- Bootstrap 5 for UI components
- Vanilla JavaScript (no heavy frameworks)
- Responsive design (mobile/tablet support)
- Minimal dependencies for fast loading
- Optional: Chart.js for advanced visualizations (Phase 7)

## Success Criteria

- Quick visual understanding of execution results
- Easy identification of failures and performance issues
- Useful for debugging and documentation
- Fast loading and responsive UI
- Works in both Studio and standalone CLI mode
