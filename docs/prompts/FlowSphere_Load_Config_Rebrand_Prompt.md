# 🧭 Prompt for Sonnet 4.5  
**Title:** Rebrand “Load Configuration” Modal & Button — Add “New Config” Option  

## Goal  
Rebrand the *Load Configuration* experience to a more streamlined and confident design under the **FlowSphere** identity.  
Replace “Load Config” with **“Start”**, and extend the modal to include a **“Start from Scratch”** option alongside the existing import methods.

---

## 🎯 Tasks

### 1. Primary Button Rebrand
- Replace **“Load Config”** text with:  
  **“Start”**
- Icon: `bi-rocket-takeoff` or `bi-gear-fill` (depending on tone preference).  
- Tooltip: “Start a new FlowSphere session — create or import configuration.”

### 2. Button Visibility Rule
- The **“Start”** button is **only visible when no configuration is currently loaded**.  
- Once a configuration is active (created or imported), the **“Start”** button disappears.  
- Other contextual actions (e.g., “Run Flow”, “Save Config”, “Export Config”) replace it in the toolbar.  
- Purpose: keep the interface context-aware and prevent accidental resets.

### 3. Modal Header
- Title: **“Start Configuration”**  
- Subtitle: “Begin a new setup or load an existing configuration file.”  
- Icon: `bi-diagram-3` (symbolizing structured flow).

### 4. Modal Sections

#### A. Start from Scratch
- Section Title: **“🧱 Start from Scratch”**
- Description: “Create a blank FlowSphere configuration with no nodes or connections.”  
- Button: **“New Config”** (Primary, accent color `#FF4C29`, rounded 6 px radius).  
- Button Icon: `bi-file-earmark-plus`.

#### B. Import Existing Configuration
- Section Title: **“Import Configuration”**
- Description: “Load an existing FlowSphere configuration file or Postman collection.”  
- Keep existing import options, but rename top radio button to:  
  **“FlowSphere JSON Config”** → *“Import FlowSphere Config”*  
  with subtext: “Open a saved .json configuration file.”  

### 5. Bottom Buttons
- Left: **Cancel**
- Right: context-based dynamic label  
  - “Create Config” when “Start from Scratch” is selected  
  - “Load Config” when “Import” is selected  

### 6. Visual Details
- Background: `#121826`  
- Headings: Roboto Condensed Bold, uppercase  
- Body: Source Sans Pro  
- Text Primary: `#E6EDF3`, Text Secondary: `#AAB4C4`  
- Buttons: rounded 6 px, solid/accent styles  
- Animation: subtle fade + slide-up when modal opens  

### 7. Empty State Alignment
When no configuration is loaded, the screen displays:

> **No configuration active.**  
> Start a new FlowSphere setup or import an existing one.

- Icon: `bi-gear-wide-connected`  
- Optional: add a **slow pulse animation** behind the “Start” button to subtly guide attention.  
- The term “Load Config” should be **fully removed** from all empty-state text and replaced with “Start”.  

### 8. Tone & Microcopy
- Confident, structured, minimal.  
- Example copy:  
  > “Ready to engineer your next flow?  
  > Start fresh or load your previous configuration.”

---

## Deliverable  
Generate the updated **HTML and Bootstrap-compatible UI** (button + modal + empty state) consistent with FlowSphere’s visual identity and tone.
