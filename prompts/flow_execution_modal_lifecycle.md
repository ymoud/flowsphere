# ⚙️ Flow Execution Modal — Branded Button Lifecycle

**Project:** API FlowSphere
**Purpose:** Define branded text, icons, and behaviors for modal controls and state messages during flow execution, including the separate input modal for user-supplied values.

---

## 🧭 Stage 1: Auto-Execution Begins

| State      | Button Text    | Icon              | Behavior                         | Notes                                                                                       |
| ---------- | -------------- | ----------------- | -------------------------------- | ------------------------------------------------------------------------------------------- |
| 🔵 Running | **Pause Flow** | `bi-pause-circle` | Suspends execution when pressed. | Replaces **Close Monitor** during execution. Keeps user engaged in the *precision process*. |

**Status Message:**

> *Flow in Motion — executing nodes sequentially...*

---

## ⏸ Stage 2: Flow Paused

| State     | Button Text     | Icon             | Behavior                                 | Notes                                                 |
| --------- | --------------- | ---------------- | ---------------------------------------- | ----------------------------------------------------- |
| ▶️ Resume | **Resume Flow** | `bi-play-circle` | Continues the flow from paused node.     | Same placement; subtle accent pulse to invite action. |
| ⛔ Stop    | **Stop Flow**   | `bi-stop-circle` | Halts execution and locks further edits. | When clicked, log options appear.                     |

**Status Message:**

> *Flow paused — awaiting user calibration...*

---

## 🧾 Stage 3: Flow Stopped

| State        | Button Text             | Icon                         | Behavior                              | Notes                                      |
| ------------ | ----------------------- | ---------------------------- | ------------------------------------- | ------------------------------------------ |
| 💾 Save Logs | **Save Execution Logs** | `bi-file-earmark-arrow-down` | Exports or downloads the session log. | Automatically shown after Stop is pressed. |
| 🔚 Close     | **Close Monitor**       | `bi-door-closed`             | Returns to configuration panel.       | Resets modal to idle state.                |

**Status Message:**

> *Flow terminated — logs ready for inspection.*

---

## ✅ Stage 4: Flow Success

| State        | Button Text        | Icon              | Behavior                                     | Notes                           |
| ------------ | ------------------ | ----------------- | -------------------------------------------- | ------------------------------- |
| 🎯 Re-Engage | **Re-Engage Flow** | `bi-arrow-repeat` | Offers to rerun the same flow configuration. | Appears after a successful run. |
| 🔚 Close     | **Close Monitor**  | `bi-door-closed`  | Returns to configuration panel.              | Ends execution session.         |

**Status Message:**

> *Flow complete — precision achieved.*

---

## ⚠️ Stage 5: Flow Failure

| State        | Button Text           | Icon                    | Behavior                               | Notes                             |
| ------------ | --------------------- | ----------------------- | -------------------------------------- | --------------------------------- |
| 🔁 Retry     | **Retry Flow**        | `bi-arrow-clockwise`    | Re-executes from start or failed node. | Offers immediate recovery option. |
| 💾 Save Logs | **Save Failure Logs** | `bi-file-earmark-excel` | Exports diagnostic information.        | Encourages post-analysis.         |
| 🔚 Close     | **Close Monitor**     | `bi-door-closed`        | Returns to configuration panel.        | Ends failed session.              |

**Status Message:**

> *Flow interrupted — integrity check required.*

---

# 🧩 Separate Modal — Node Input (User Data Prompt)

When a node requires additional data from the user, a **dedicated input modal** appears. This modal temporarily overlays the Flow Execution Monitor.

| Element                   | Suggested Value                                       | Bootstrap Icon     | Rationale                                                                                          |
| ------------------------- | ----------------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------- |
| **Title**                 | **Node Calibration Required**                         | `bi-sliders`       | Conveys a technical adjustment phase rather than an error. Feels deliberate and mechanical.        |
| **Subtitle (optional)**   | *Manual input needed to proceed with flow execution.* | —                  | Keeps communication neutral, operator-like.                                                        |
| **Primary Action Button** | **Apply & Engage**                                    | `bi-check2-circle` | Submits user-provided values and resumes the flow. Connects with the *Go with the Flow* narrative. |
| **Secondary Button**      | **Cancel Calibration**                                | `bi-x-circle`      | Cancels input and safely pauses flow execution.                                                    |

**Status Message (after Apply):**

> *Calibration complete — resuming flow...*

**Behavioral Notes:**

* The modal dims the Flow Execution Monitor, emphasizing a *calibration state*.
* The title uses **Roboto Condensed Bold**, uppercase, with the icon left-aligned (6–8px spacing).
* Once input is confirmed, the modal closes and execution automatically resumes.

---

## ✨ Behavioral Design Principles

* **Mechanical rhythm:** Transitions should be crisp and controlled — slide or fade with no bouncy easing.
* **Fixed control zone:** Buttons remain anchored in the bottom-right corner, reflecting an operator console layout.
* **Color discipline:**

  * **Active (Run/Pause/Resume):** accent `#FF4C29`
  * **Neutral (Stop/Close):** secondary `#2E3A59`
  * **Confirmations:** subtle glow or accent outline.
* **Text consistency:** Each label starts with an *action verb* — *Pause*, *Resume*, *Stop*, *Save*, *Close*, *Apply*.

---

## 🧩 Why This Design Fits FlowSphere

| Attribute           | Alignment                                      |
| ------------------- | ---------------------------------------------- |
| **Brand Tone**      | Industrial precision, control, and focus       |
| **Visual Metaphor** | Operator console managing a live flow          |
| **User Perception** | Confidence and mastery over execution          |
| **UX Value**        | Eliminates redundant actions; feels purposeful |

---

> **Tagline Reminder:** “Precision in every flow.”
> This interaction design reflects that promise — each button, modal, and message mirrors the lifecycle of a real, calibrated system.
