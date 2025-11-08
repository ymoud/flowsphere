# Visual Workflow Storytelling & Export

**Status:** Planned

**Priority:** 6

## Overview

An **animated workflow storytelling tool** that generates interactive, beautiful flowchart diagrams showing how API integrations work. Create shareable, self-contained HTML presentations that bring your workflows to life with smooth animations, data flow visualization, and narrative storytelling.

**Purpose:** Help teams **explain and share** API integrations through engaging visual narratives, not just document what happened during execution.

## Vision Statement

> "Turn your API workflows into shareable animated stories that anyone can understand - no FlowSphere installation required, no technical knowledge needed."

## The Problem We're Solving

**Current Challenge:**
- Explaining complex API workflows to stakeholders is hard
- Screenshots and diagrams don't show the flow of data
- Sharing requires FlowSphere installation or lengthy documentation
- Non-technical people struggle to understand API integrations

**Our Solution:**
- **Animated flowcharts** that show data flowing between steps
- **Story Mode** that explains what happens in plain language
- **Self-contained HTML files** anyone can open in a browser
- **Fun but professional** animations that engage viewers

## Core Differentiator

**NOT an execution analysis tool** (that's the Execution Log Visualizer)

**IS a storytelling and presentation tool** for:
- Product demos and pitches
- Onboarding new team members
- Documenting API integrations
- Sharing with non-technical stakeholders
- Creating visual API documentation

## Key Features

### 1. Animated Data Flow Visualization 🌊

**The Star of the Show** - Data flowing between nodes brings the story to life!

**What Users See:**
```
┌─────────────┐
│   Login     │ ──→ Sends: { username, password }
└─────────────┘
       ↓
   Returns token: "eyJhbGc..."
       ↓ (animated flow with particle effect)
   💾 Saved as {{ .responses.login.token }}
       ↓
       ↓ (flows along connector)
       ↓
┌─────────────┐
│ Get Profile │ ──→ Uses token in Authorization header
└─────────────┘
       ↓
   Returns: { userId: 12345, name: "John" }
       ↓ (animated flow)
   💾 Saved as {{ .responses.profile.userId }}
       ↓
       ↓ (flows along connector)
       ↓
┌─────────────┐
│ Create Post │ ──→ Uses userId in request body
└─────────────┘
```

**Animation Details:**
- **Particle Flow**: Small dots/pulses travel along connectors showing data movement
- **Variable Bubbles**: Show `{{ .responses.login.token }}` transforming into actual values
- **Highlight Cascade**: Nodes light up as data arrives
- **Smooth Transitions**: Ease-in-out animations (not jarring linear movements)
- **Timing**: Synchronized with timeline scrubber

**Data Flow Types:**
1. **Response Extraction**: Node → Variable bubble → Storage
2. **Variable Substitution**: Storage → Variable bubble → Next node
3. **Conditional Logic**: Decision diamond → Branch selection
4. **Skipped Paths**: Faded/greyed out flow showing what didn't execute

### 2. Story Mode vs Debug Mode 📖

**Two Views, Two Purposes:**

#### Story Mode (Default for Presentations)

**Purpose:** Explain what the workflow does and why

**Characteristics:**
- Clean, simplified interface
- **Narrative descriptions** replace technical details
  - "Authenticate user with credentials" instead of "POST /auth/login"
  - "Fetch user profile data" instead of "GET /api/users/{{userId}}"
- Data flow emphasized over request/response bodies
- Auto-generated timeline narration
- Fun animations and visual personality
- Technical details collapsed by default

**Example Story Mode Node:**
```
╔════════════════════════════════╗
║  🔐 Authenticate User          ║
║                                ║
║  Sends username and password   ║
║  Returns authentication token  ║
║                                ║
║  ✅ Completed in 234ms         ║
╚════════════════════════════════╝
     ↓ token flows to next step
```

#### Debug Mode (Toggle for Technical Details)

**Purpose:** Analyze execution details for debugging

**Characteristics:**
- Full technical view
- Raw HTTP methods and endpoints
- Complete request/response bodies (expandable)
- Validation results
- Error stack traces
- Performance metrics
- Like current "Execution Log Visualizer" concept

**Example Debug Mode Node:**
```
╔════════════════════════════════╗
║  POST /auth/login              ║
║                                ║
║  Request Headers:              ║
║    Content-Type: application/  ║
║    json                        ║
║                                ║
║  Request Body:                 ║
║    { username: "john@..." }    ║
║                                ║
║  Response (200 OK):            ║
║    { token: "eyJhbGc..." }     ║
║                                ║
║  Validations: ✅ 3/3 passed   ║
║  Duration: 234ms               ║
╚════════════════════════════════╝
```

**Toggle Control:**
```
[📖 Story Mode] / [🔍 Debug Mode]  ← Simple toggle at top
```

### 3. Interactive Timeline Scrubber with Narration 🎬

**Timeline Bar:**
- Horizontal timeline showing execution sequence
- Proportional duration bars for each step
- Time markers (0s, 1s, 2s, etc.)
- Clickable step indicators

**Playback Controls:**
- ▶️ **Play**: Auto-animate through workflow (smooth progression)
- ⏸️ **Pause**: Stop at current step
- ⏮️ **Previous**: Jump to previous step
- ⏭️ **Next**: Jump to next step
- 🔄 **Restart**: Go back to beginning
- **Scrubber Handle**: Drag to any point (with snap-to-step)

**Auto-Generated Narration (Story Mode):**

As timeline plays, captions appear:
```
Timeline Narration Panel:

00:00s → "First, we authenticate with the API using user credentials"
00:23s → "Using the authentication token, we fetch the user's profile"
01:12s → "With the user ID from the profile, we create a new post"
02:45s → "Finally, we verify the post was created successfully"
```

**Narration Generation Logic:**
- Step 1: "First, we [step description]"
- Step 2-N: "Then, we [step description]" or "Using [variable], we [step description]"
- Last step: "Finally, we [step description]"
- Conditional: "If [condition], we [step description]"
- Skipped: "Since [condition not met], we skip [step description]"

### 4. Variable Substitution Storytelling 🔄

**Make the "Magic" Visible** - Show how data transforms and flows

**Example Visualization:**

```
Step 1: Login ✅
  ┌─────────────────────────────┐
  │ Response:                   │
  │ { "token": "abc123xyz" }    │
  └─────────────────────────────┘
         ↓ (extraction animation)
  ┌─────────────────────────────┐
  │ 💾 Variable Stored:         │
  │ .responses.login.token      │
  │ = "abc123xyz"               │
  └─────────────────────────────┘

Step 2: Get Profile
  ┌─────────────────────────────┐
  │ 📥 Needs:                   │
  │ {{ .responses.login.token }}│
  └─────────────────────────────┘
         ↓ (substitution animation)
  ┌─────────────────────────────┐
  │ ✅ Substituted:             │
  │ Authorization: Bearer       │
  │ "abc123xyz"                 │
  └─────────────────────────────┘
```

**Animation Sequence:**
1. Response arrives → JSON field highlights
2. Value extracts into bubble → Floats up
3. Bubble stores with label → "💾 .responses.login.token"
4. Next step needs value → Placeholder highlights `{{ }}`
5. Bubble flows from storage → To placeholder
6. Substitution happens → Placeholder morphs into actual value
7. Request sent → With substituted value

**Visual Cues:**
- **Variable bubbles**: Floating pills with variable names and values
- **Highlighting**: Fields glow when extracted or substituted
- **Flow lines**: Dotted lines connecting storage to usage
- **Color coding**: Same color for variable throughout its journey

### 5. Visual Personality - Fun but Professional ✨

**The "Delightful Details" that make it memorable**

#### Animation Polish

**Smooth Easing:**
- All transitions use ease-in-out curves (no harsh linear movements)
- Stagger animations (domino effect, not simultaneous)
- Spring physics for playful but controlled bounce
- Gentle momentum (things don't stop abruptly)

**Node Interactions:**
- **Hover**: Gentle scale-up (1.05x) + soft glow
- **Active**: Subtle "breathing" pulse animation
- **Success**: Quick sparkle/flash on completion ✨
- **Failure**: Gentle shake + red pulse 🔴
- **Skipped**: Fade out with slight blur
- **Loading**: Spinner with personality (not boring circle)

**Data Flow Effects:**
- **Particles**: Small dots flow along connectors (like electricity)
- **Variable bubbles**: Gentle float/drift animation
- **Value substitution**: Morph effect (old value → new value)
- **Conditional split**: Branches unfold with animation

#### Color Palette - Professional with Personality

**Node Status Colors:**
- 🟢 **Success**: Vibrant green with subtle gradient (#10b981 → #059669)
- 🔴 **Failed**: Warm red, not harsh (#ef4444 → #dc2626)
- 🟡 **Warning**: Sunny yellow/amber (#f59e0b → #d97706)
- ⚪ **Skipped**: Cool grey with transparency (#94a3b8, 50% opacity)
- 🔵 **Active**: Electric blue with glow (#3b82f6 → #2563eb)
- 🟣 **Conditional**: Purple for decision nodes (#8b5cf6 → #7c3aed)

**Background & Accents:**
- Soft gradients instead of flat colors
- Subtle shadows for depth
- Light/dark theme support
- Smooth theme transitions

#### Micro-Interactions

**Small touches that delight:**
- Connector lines draw in (not just appear)
- Nodes fade in with slight upward motion
- Timeline scrubber has magnetic snap points
- Play button morphs into pause (animated icon transition)
- Tooltips slide in smoothly (not pop)
- Copy button shows checkmark animation on click ✓
- Search results highlight with yellow glow pulse

### 6. Conditional Logic & Skipped Paths 🔀

**Show the Roads Not Taken**

**Visual Treatment:**
```
     ┌──────────────┐
     │  Get User    │
     └──────────────┘
            ↓
     ╔══════════════╗
     ║ Is Admin?    ║  ← Decision diamond (purple)
     ╚══════════════╝
       ↙         ↘
    Yes          No
     ↓            ↓ (faded/greyed)
┌─────────┐   ┌─────────┐
│ Delete  │   │ View    │  ← Skipped path (transparent)
│ Users   │   │ Profile │
└─────────┘   └─────────┘
   (executed)    (skipped)
```

**Skip Reason Display:**
- Hover over skipped node → Tooltip: "Skipped: User is admin = false (expected true)"
- Subtle icon on skipped node: ⊘
- Skipped connectors shown as dashed lines

### 7. Self-Contained HTML Export 📦

**One File to Rule Them All**

**Export Characteristics:**
- **Single HTML file** with everything embedded
- **No external dependencies** (works offline)
- **No CDN requirements** (all libraries inlined)
- **Works anywhere**: Email, documentation, file sharing, web hosting
- **Version-agnostic**: Always works, regardless of FlowSphere version

**What's Included:**
- Complete execution data (JSON embedded in `<script>`)
- All JavaScript (Mermaid.js, D3.js, custom animation engine)
- All CSS (inline styles, animations, themes)
- FlowSphere branding (optional footer)
- Instructions text (how to use controls)

**File Size Optimization:**
- Minified JavaScript and CSS
- Optional: Exclude request/response bodies for smaller file
- Compression-friendly format
- Target: <5MB for typical workflows, <10MB maximum

**Export Options Dialog:**
```
┌────────────────────────────────────────┐
│  Export Visual Story                   │
├────────────────────────────────────────┤
│                                        │
│  Mode:                                 │
│   ● Story Mode (recommended)           │
│   ○ Debug Mode                         │
│   ○ Both modes (toggle available)      │
│                                        │
│  Include:                              │
│   ☑ Timeline narration                 │
│   ☑ Data flow animations               │
│   ☑ Request/response bodies            │
│   ☐ Redact sensitive data              │
│                                        │
│  Theme:                                │
│   ● Auto (respects system preference)  │
│   ○ Light                              │
│   ○ Dark                               │
│                                        │
│  Animation Speed:                      │
│   ○ Slow (good for presentations)      │
│   ● Normal                             │
│   ○ Fast (quick demos)                 │
│                                        │
│  [Preview] [Cancel] [Export HTML]      │
└────────────────────────────────────────┘
```

## Integration with Current Architecture

### Data Source

Uses existing execution log format from `lib/logger.js`:

```json
{
  "metadata": {
    "config_file": "examples/config-simple.json",
    "execution_status": "success",
    "timestamp": "2025-01-28T14:30:22.000Z",
    "executed_steps": 5
  },
  "steps": [
    {
      "step": 1,
      "id": "login",
      "name": "Login to API",
      "method": "POST",
      "url": "https://api.example.com/auth/login",
      "status": "completed",
      "duration": "0.234",
      "request": { /* full request */ },
      "response": { /* full response */ },
      "validations": [ /* validation results */ ],
      "substitutions": [ /* variable substitutions */ ]
    }
  ]
}
```

**Additional Data Needed** (enhance logger if not present):
- `substitutions` array showing what variables were replaced
- `skipReason` for skipped steps (already exists)
- `conditions` array showing conditional logic (already in config)

### Studio Integration

**Location:** Flow Runner results modal (after execution completes)

**New Button:**
```
Modal Footer:
[💾 Save Logs]  [🎬 Create Visual Story]  [🔄 Re-Engage]  [🚪 Close]
                     ↑ NEW
```

**User Flow:**
1. User runs workflow: "Go with the Flow"
2. Execution completes → Results modal appears
3. User clicks "🎬 Create Visual Story"
4. Preview modal opens showing animated diagram
5. User customizes export options
6. User clicks "Export as HTML"
7. Browser downloads self-contained HTML file
8. User shares file with team/stakeholders

### Backend Support

**New Endpoint: `/api/generate-visual-story`**

```javascript
POST /api/generate-visual-story
Body: {
  executionLog: [ /* array of step results */ ],
  executionResult: { /* metadata */ },
  config: { /* original config for node descriptions */ },
  options: {
    mode: 'story' | 'debug' | 'both',
    includeNarration: true,
    includeRequestBodies: true,
    includeResponseBodies: true,
    redactSensitive: false,
    theme: 'auto' | 'light' | 'dark',
    animationSpeed: 'slow' | 'normal' | 'fast'
  }
}

Response: {
  success: true,
  html: "<!DOCTYPE html>...", // Complete HTML file
  filename: "workflow_story_20250128_143022.html",
  fileSize: 2456789 // bytes
}
```

**Backend Implementation:**
```
lib/visual-story-generator.js
├── generateHTML() - Main orchestrator
├── generateStoryNarration() - Auto-generate captions
├── processDataFlow() - Extract variable substitutions
├── buildFlowchartData() - Create node/edge structure
├── inlineAssets() - Embed JS/CSS/fonts
└── minifyOutput() - Compress final HTML
```

### File Structure

```
studio/
├── templates/
│   ├── visual-story-template.html       # Main template
│   ├── story-mode-layout.html           # Story mode UI
│   └── debug-mode-layout.html           # Debug mode UI
├── js/
│   ├── visual-story-modal.js            # Studio integration
│   ├── visual-story-preview.js          # Preview before export
│   ├── export-options.js                # Export customization dialog
│   └── embedded/ (code that goes in exported HTML)
│       ├── flowchart-renderer.js        # Mermaid.js wrapper
│       ├── data-flow-animator.js        # Particle/bubble animations
│       ├── timeline-controller.js       # Scrubber + playback
│       ├── narration-generator.js       # Auto captions
│       └── story-debug-toggle.js        # Mode switching
└── css/
    ├── visual-story.css                 # Studio styles
    └── embedded/
        ├── story-mode.css               # Embedded: Story Mode styles
        ├── debug-mode.css               # Embedded: Debug Mode styles
        └── animations.css               # Embedded: Animation keyframes

bin/flowsphere.js
└── Add POST /api/generate-visual-story endpoint

lib/
└── visual-story-generator.js            # Backend export generator
```

## Technology Stack

**Visualization & Animation:**
- **Mermaid.js** (inlined): Base flowchart structure
  - Generates initial SVG node layout
  - Handles automatic node positioning
  - Clean, professional appearance

- **D3.js** (inlined): Animation layer
  - Data flow particle effects
  - Variable bubble animations
  - Smooth transitions
  - Interactive elements

**Alternative (Consider):**
- **Anime.js**: Lightweight animation library (smaller than D3.js)
- **GSAP**: Professional-grade animations (licensing consideration)
- **Custom CSS animations**: For simple effects (no library needed)

**Data Format:**
- Execution log JSON (already exists)
- Embedded directly in `<script>` tag
- No separate data files

**Browser Support:**
- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES6+ JavaScript
- SVG support required
- CSS Grid/Flexbox for layout
- No IE11 support (can show message if detected)

## Implementation Phases

### Phase 1 - Story Mode with Data Flow 🎯

**Goal:** Create the core storytelling experience

**Features:**
- Basic flowchart with Mermaid.js
- **Animated data flow between nodes** (particles/pulses)
- **Variable substitution visualization** (bubbles showing `{{ }}` → value)
- Story Mode UI with narrative descriptions
- Color-coded status indicators
- Self-contained HTML export
- "Create Visual Story" button in Studio

**No Debug Mode yet** - Keep it simple, Story Mode only

**Deliverables:**
- HTML template with Mermaid.js + D3.js inlined
- Data flow animation engine
- Variable bubble visualization
- Backend endpoint `/api/generate-visual-story`
- Studio UI integration (button + basic preview)
- Export as single HTML file

**Acceptance Criteria:**
- ✅ Flowchart shows all steps with clean design
- ✅ Data flows visually between nodes (animated particles)
- ✅ Variable substitutions shown as bubbles with transformations
- ✅ Story Mode hides technical details, shows "what it does"
- ✅ Exported HTML works offline in any browser
- ✅ Smooth animations (60fps target)
- ✅ Fun but professional appearance

### Phase 2 - Timeline & Narration 🎬

**Goal:** Add interactive timeline scrubber and auto-generated narration

**Features:**
- Interactive timeline scrubber at bottom
- Play/pause/previous/next controls
- Auto-generated narrative captions
- Step-by-step animated playback
- Current step highlighting synchronized with timeline
- Scrubber drag-and-drop seeking

**Deliverables:**
- Timeline component (HTML/CSS/JS)
- Playback controls UI
- Narration generation algorithm
- Animation synchronization engine
- Smooth step transitions

**Acceptance Criteria:**
- ✅ Timeline shows all steps proportionally by duration
- ✅ Play button smoothly animates through workflow
- ✅ Scrubber allows seeking to any step
- ✅ Narrative captions auto-generate and display
- ✅ Current step highlighted in diagram and timeline
- ✅ Pause/resume works seamlessly

### Phase 3 - Visual Polish & Personality ✨

**Goal:** Add delightful micro-animations and professional polish

**Features:**
- Smooth easing functions (ease-in-out, spring physics)
- Node hover effects (scale, glow, breathing)
- Success/failure/skip animations (sparkle, shake, fade)
- Staggered entrance animations
- Connector line draw-in effects
- Copy button animations
- Tooltip slide-ins
- Theme support (light/dark/auto)

**Deliverables:**
- Animation library/utilities
- CSS animation keyframes
- Theme switcher
- Hover/interaction polish
- Micro-interaction details

**Acceptance Criteria:**
- ✅ All animations smooth and delightful
- ✅ Hover effects feel responsive
- ✅ Success/failure states have personality
- ✅ Theme switching works seamlessly
- ✅ Professional appearance maintained
- ✅ 60fps on typical hardware

### Phase 4 - Debug Mode & Export Options 🔍

**Goal:** Add Debug Mode toggle and advanced export customization

**Features:**
- Debug Mode toggle (shows technical details)
- Story Mode ↔ Debug Mode switching
- Export options dialog (what to include, theme, redaction)
- Sensitive data redaction (tokens, passwords)
- Request/response body expansion
- Validation result display
- Performance metrics (in Debug Mode)

**Deliverables:**
- Debug Mode UI layout
- Mode toggle component
- Export options modal
- Data redaction logic
- Request/response viewers with syntax highlighting

**Acceptance Criteria:**
- ✅ Debug Mode shows all technical details
- ✅ Toggle between modes works smoothly
- ✅ Export options customize output
- ✅ Sensitive data can be redacted
- ✅ Request/response bodies properly formatted
- ✅ File size stays reasonable with options

### Phase 5 - Conditional Logic & Advanced Features 🔀

**Goal:** Visualize conditional branches, skipped paths, and add search

**Features:**
- Conditional decision diamonds (purple)
- Branching visualization (yes/no paths)
- Skipped path display (faded, dashed connectors)
- Skip reason tooltips
- Search by step name/URL
- Search in request/response bodies
- Filter by status
- Highlight search results

**Deliverables:**
- Conditional node renderer
- Branch visualization
- Skip reason display
- Search UI component
- Filter controls
- Result highlighting

**Acceptance Criteria:**
- ✅ Conditionals shown as decision diamonds
- ✅ Branches clearly visualized
- ✅ Skipped paths faded but visible
- ✅ Skip reasons accessible on hover/click
- ✅ Search finds matches in all data
- ✅ Filters work correctly
- ✅ Results highlight in diagram

## User Workflows

### Workflow 1: Create and Share Visual Story

**Use Case:** Developer wants to explain new API integration to product team

1. Developer builds workflow in Studio
2. Runs workflow: "Go with the Flow"
3. Execution completes successfully
4. Clicks "🎬 Create Visual Story"
5. Preview modal shows animated diagram
6. Customizes export:
   - Mode: Story Mode
   - Include narration: Yes
   - Animation speed: Normal
   - Theme: Auto
7. Clicks "Export as HTML"
8. Browser downloads `login_flow_story.html`
9. Developer emails file to product team
10. Product team opens in browser, watches animated story
11. Team understands how authentication flow works
12. No questions needed - visual story explained it all!

### Workflow 2: Present API Integration in Meeting

**Use Case:** Demo new feature to stakeholders

1. Open exported HTML file before meeting
2. Share screen in video call
3. Click Play button
4. Timeline animates through workflow step-by-step
5. Narration appears: "First, we authenticate..."
6. Data flows visually between nodes
7. Stakeholders see variables transforming
8. Pause at interesting steps to discuss
9. Scrub back to review specific parts
10. Meeting ends with clear understanding

### Workflow 3: Debug Issue, Then Share Solution

**Use Case:** Found bug, fixed it, want to show before/after

1. Run broken workflow → Generate visual story (Mode: Debug)
2. Shows where it failed, error details visible
3. Fix bug in config
4. Run fixed workflow → Generate visual story (Mode: Story)
5. Now shows success with data flowing correctly
6. Share both HTML files with team:
   - `before_fix_debug.html` - Shows technical error
   - `after_fix_story.html` - Shows working flow
7. Team sees problem and solution clearly

## Success Criteria

**Storytelling Effectiveness:**
- ✅ Non-technical stakeholders understand workflow without explanation
- ✅ Data flow is visually obvious (not just implied)
- ✅ Auto-generated narration makes sense and flows well
- ✅ Users describe it as "fun" and "engaging" (not boring)

**Technical Quality:**
- ✅ Exported HTML files work in all modern browsers
- ✅ No external dependencies required (fully self-contained)
- ✅ Animations smooth at 60fps on typical hardware
- ✅ File size reasonable (<5MB typical, <10MB max)
- ✅ Fast load time (<2 seconds)

**Visual Appeal:**
- ✅ Professional appearance suitable for presentations
- ✅ Fun animations without being childish
- ✅ Color palette is pleasant and accessible
- ✅ Dark/light themes both look polished
- ✅ Print-friendly (if needed)

**Usability:**
- ✅ Timeline controls intuitive (no tutorial needed)
- ✅ Story Mode hides complexity effectively
- ✅ Debug Mode accessible when needed
- ✅ Easy to find and share specific steps
- ✅ Mobile-friendly viewing (responsive design)

## Relationship to Other Features

### vs Execution Log Visualizer (Priority 2)

**Different Tools, Different Jobs:**

| Execution Log Visualizer | Visual Storytelling & Export |
|--------------------------|------------------------------|
| **Purpose:** Analyze and debug | **Purpose:** Present and share |
| **Audience:** Developers | **Audience:** Everyone (including non-technical) |
| **Focus:** Technical details, metrics, filtering | **Focus:** Data flow, narrative, visual appeal |
| **UI:** Studio integrated, analysis tools | **UI:** Exported HTML, presentation mode |
| **Data:** Multiple logs comparison | **Data:** Single execution story |
| **Feeling:** Professional debugging tool | **Feeling:** Engaging presentation |

**Both are valuable!** Use Log Visualizer for development, Visual Story for communication.

**Shared Foundation:**
- Both use same execution log data
- Can potentially share some visualization code
- Could reference each other (Debug Mode → "Open in Log Visualizer")

### Potential Integration

After both features exist:
- Log Visualizer could have "Export as Story" button
- Visual Story Debug Mode could have "Open in Analyzer" link
- Shared theme/styling for consistency

## Future Enhancements

**Potential Phase 6+ Features:**
- **Live Execution Mode**: Watch workflow execute in real-time (not just replay)
- **Video Export**: Generate MP4/WebM animation for embedding in videos
- **Presentation Mode**: Full-screen with speaker notes
- **Custom Branding**: Company logo, colors, footer text
- **Collaborative Annotations**: Add notes/comments to specific steps
- **Voice Narration**: Text-to-speech reading narration
- **Interactive Playground**: Edit values and see flow change
- **Embed Widget**: Iframe-embeddable version for documentation sites
- **GIF Export**: Short animated preview for social media
- **Step-by-Step Tutorial Mode**: For onboarding/training

## Notes

**Design Philosophy:**
> "Make complex workflows feel simple through visual storytelling. Delight users with smooth animations. Empower teams to share knowledge effortlessly."

**Key Principles:**
1. **Story First**: Always prioritize narrative over technical details
2. **Show, Don't Tell**: Data flow animations > text explanations
3. **Delight Users**: Fun touches make it memorable
4. **Zero Friction Sharing**: One file, no dependencies, works anywhere
5. **Professional Quality**: Suitable for client presentations

**Why This Matters:**
- API integrations are hard to explain verbally
- Visual stories transcend technical barriers
- Shareable artifacts increase FlowSphere's value
- Memorable tool = more users, more adoption
- Differentiation from competitors (unique feature!)
