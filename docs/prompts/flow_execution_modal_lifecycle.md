# ⚙️ Flow Execution Modal — Branded Button Lifecycle

**Project:** API FlowSphere
**Purpose:** Define branded text, icons, and behaviors for modal controls and state messages during flow execution, including the separate input modal for user-supplied values.

---

## 🧭 Stage 1: Auto-Execution Running

| State      | Button Text       | Icon             | Behavior                        | Notes                                                                   |
| ---------- | ----------------- | ---------------- | ------------------------------- | ----------------------------------------------------------------------- |
| 🔵 Running | **Close Monitor** | `bi-door-closed` | Closes modal (execution continues). | Available during execution. User can close modal and return to config. |

**Status Message:**

> *Flow in Motion — executing nodes sequentially...*

---

## 🧩 Stage 2: User Input Required (Paused for Calibration)

When a node requires additional data from the user (via `userPrompts`), the flow **pauses automatically** and shows input form.

**Status Message:**

> *Flow paused — awaiting user calibration...*

### Separate Modal — Node Input (User Data Prompt)

When a node requires additional data from the user, a **dedicated input modal** appears. This modal temporarily overlays the Flow Execution Monitor.

| Element                   | Suggested Value                                       | Bootstrap Icon     | Rationale                                                                                          |
| ------------------------- | ----------------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------- |
| **Title**                 | **Node Calibration Required**                         | `bi-sliders`       | Conveys a technical adjustment phase rather than an error. Feels deliberate and mechanical.        |
| **Subtitle (optional)**   | *Manual input needed to proceed with flow execution.* | —                  | Keeps communication neutral, operator-like.                                                        |
| **Primary Action Button** | **Apply & Engage**                                    | `bi-check2-circle` | Submits user-provided values and resumes the flow. Connects with the *Go with the Flow* narrative. |
| **Secondary Button**      | **Cancel Calibration**                                | `bi-x-circle`      | Cancels input and safely stops flow execution.                                                     |

**Status Message (after Apply):**

> *Calibration complete — resuming flow...*

**Behavioral Notes:**

* The modal dims the Flow Execution Monitor, emphasizing a *calibration state*.
* The title uses **Roboto Condensed Bold**, uppercase, with the icon left-aligned (6–8px spacing).
* Once input is confirmed, the modal closes and execution automatically resumes.

---

## ✅ Stage 3: Flow Success

| State        | Button Text             | Icon                         | Behavior                                     | Notes                                      |
| ------------ | ----------------------- | ---------------------------- | -------------------------------------------- | ------------------------------------------ |
| 💾 Save Logs | **Save Execution Logs** | `bi-file-earmark-arrow-down` | Exports or downloads the session log.        | Automatically shown after completion.      |
| 🎯 Re-Engage | **Re-Engage Flow**      | `bi-arrow-repeat`            | Offers to rerun the same flow configuration. | Appears after a successful run.            |
| 🔚 Close     | **Close Monitor**       | `bi-door-closed`             | Returns to configuration panel.              | Ends execution session.                    |

**Status Message:**

> *Flow complete — precision achieved.*

---

## ⚠️ Stage 4: Flow Failure

| State        | Button Text           | Icon                    | Behavior                               | Notes                             |
| ------------ | --------------------- | ----------------------- | -------------------------------------- | --------------------------------- |
| 🔁 Retry     | **Retry Flow**        | `bi-arrow-clockwise`    | Re-executes from start.                | Offers immediate recovery option. |
| 💾 Save Logs | **Save Failure Logs** | `bi-file-earmark-excel` | Exports diagnostic information.        | Encourages post-analysis.         |
| 🔚 Close     | **Close Monitor**     | `bi-door-closed`        | Returns to configuration panel.        | Ends failed session.              |

**Status Message:**

> *Flow interrupted — integrity check required.*

---

## ✨ Behavioral Design Principles

* **Mechanical rhythm:** Transitions should be crisp and controlled — slide or fade with no bouncy easing.
* **Fixed control zone:** Buttons remain anchored in the bottom-right corner, reflecting an operator console layout.
* **Color discipline:**

  * **Active (Run/Re-Engage):** accent `#FF4C29`
  * **Neutral (Close):** secondary `#2E3A59`
  * **Confirmations:** subtle glow or accent outline.
* **Text consistency:** Each label starts with an *action verb* — *Save*, *Close*, *Apply*, *Re-Engage*.

---

## 🧩 Why This Design Fits FlowSphere

| Attribute           | Alignment                                      |
| ------------------- | ---------------------------------------------- |
| **Brand Tone**      | Industrial precision, control, and focus       |
| **Visual Metaphor** | Operator console managing a live flow          |
| **User Perception** | Confidence and mastery over execution          |
| **UX Value**        | Eliminates redundant actions; feels purposeful |

---

> **Tagline Reminder:** "Precision in every flow."
> This interaction design reflects that promise — each button, modal, and message mirrors the lifecycle of a real, calibrated system.

---

## 📝 Notes on Execution States

**Current Implementation:**

- **`idle`**: No execution, ready to start
- **`loading`**: Initial setup, preparing to execute
- **`running`**: Actively executing steps
- **`paused`**: Waiting for user input (userPrompts) - NOT manual pause
- **`completed`**: All steps finished successfully
- **`failed`**: Execution failed (validation, timeout, network error)

**Important:** The `paused` state is ONLY used when a node has `userPrompts` and requires manual input. There is no manual pause/resume functionality. Users can close the modal during execution and it will continue in the background.

**Future Execution Controls (Planned):**

See `features/flow-runner-execution-controls.md` for planned execution control features:
- Phase 1: Stop/Cancel button
- Phase 2: Step-by-Step execution mode
- Phase 3: Auto-Step with configurable delay

These features will be added in future updates but are not currently implemented.
