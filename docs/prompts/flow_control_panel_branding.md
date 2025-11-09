# 🎛️ Flow Execution Mode — Branding Prompt (Sonnet 4.5, Motion & Interaction Spec)

## 💡 Purpose
To brand the **Flow Execution Modal** during **Step-by-Step** and **Auto-Step** modes, aligning with FlowSphere’s identity of **industrial precision**, **mechanical rhythm**, and **controlled flow**.

---

## 🧭 Modal Title
**Title:** `Flow Paused`
**Icon:** `bi-pause-circle`

**Description:**
> Indicates a temporary precision state — the flow awaits user command or automated continuation.

---

## 🧩 Step-by-Step Mode (Manual Precision)
**Header Line:**
> `Flow Paused — Awaiting Manual Continue`

**Tagline:**
> “Precision in motion — your flow awaits command.”

**Visual & Behavior Notes:**
- **Header Accent Bar:** Accent color `#FF4C29` animates subtly when paused.
- **Primary Button:** `Continue to Next Step`  
  - Color: Calm blue (`#0D6EFD`)
  - Icon: `bi-play-circle`
  - Tooltip: “Engage next node.”
- **Secondary Button:** `Interrupt the Flow`  
  - Color: Red accent (`#DC3545`)
  - Icon: `bi-stop-circle`
  - Tooltip: “Abort current sequence safely.”

**User Input Card:**
- Label: `Node Calibration Required`
- Subtext: “User input required. Click here when ready to provide data.”
- Icon: `bi-pencil-square`
- Button: `Click to Continue`
- Tooltip: “Apply and engage the next node.”

---

## ⏱️ Auto-Step Mode (Rhythmic Automation)
**Header Line:**
> `Flow Paused — Auto-continuing in {n}s`

**Tagline:**
> “Automation with rhythm — each step engineered for flow.”

**Visual & Behavior Notes:**
- **Countdown Indicator:** Pulses gently with each second.
- **Primary Button:** `Continue Now`  
  - Icon: `bi-play-fill`
  - Tooltip: “Skip interval and proceed immediately.”
- **Secondary Button:** `Interrupt the Flow`  
  - Icon: `bi-stop-circle`
  - Tooltip: “Halt automation and regain control.”
- **Next Node Preview:** `Next: Get User Profile (Using Global Variable)`  
  Icon: `bi-diagram-3`

---

## 🧠 Branding Voice & Microcopy
- “Awaiting your signal.”
- “Automation in cadence.”
- “Flow paused for calibration.”
- “Step complete — ready for next.”

---

# 🎞️ Motion & Interaction Specification

## 🌀 1. Progress Bar Animation
**Behavior:**
- **Full Throttle:** Smooth continuous fill (linear motion).
- **Step-by-Step:** Animates per node (0.8s forward ease).
- **Auto-Step:** Pulses rhythmically with countdown.

```css
.progress-bar {
  height: 4px;
  background-color: #FF4C29;
  transition: width 0.8s ease-in-out;
}

.progress-bar.pulse {
  animation: flowPulse 1s infinite ease-in-out;
}

@keyframes flowPulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}
```
🧭 *Effect:* Feels like energy circulating through the system.

---

## ⏱️ 2. Countdown Pulse (Auto-Step)
**Behavior:** Countdown number pulses each second with accent glow.

```css
.auto-countdown {
  color: #FF4C29;
  font-weight: 600;
  animation: countdownPulse 1s infinite ease-in-out;
}

@keyframes countdownPulse {
  0%, 100% { text-shadow: 0 0 4px #FF4C29; }
  50% { text-shadow: 0 0 10px #FF4C29; }
}
```
🧩 *Effect:* Conveys calm, rhythmic automation — not urgency.

---

## ⚙️ 3. Node Completion Feedback
**Behavior:**
- Node border flashes with success color on completion.
- Checkmark (`bi-check-circle-fill`) fades in.

```css
.node-card.completed {
  border-color: #28A745;
  box-shadow: 0 0 6px rgba(40, 167, 69, 0.4);
  transition: border-color 0.3s, box-shadow 0.3s;
}
```

---

## 🎛️ 4. Button Motion Feedback
| Button | Animation | Branding Purpose |
|--------|------------|------------------|
| **Continue to Next Step** | slight scale-up (1.03x) + glow | Encourages precise action |
| **Interrupt the Flow** | subtle shake | Signals caution |
| **Continue Now** | pulse synced with countdown | Reflects timing awareness |

```css
button.primary:hover {
  transform: scale(1.03);
  box-shadow: 0 0 10px rgba(255, 76, 41, 0.4);
}

button.danger:hover {
  animation: shake 0.3s ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-3px); }
  75% { transform: translateX(3px); }
}
```

---

## 🧩 Motion Principles
- **Mechanical Precision:** No chaotic effects — controlled transitions only.
- **Energy Flow:** Use pulses, not flashes.
- **Temporal Clarity:** Every animation conveys a meaningful state.

---

### ✨ Summary
The **Flow Execution Modal** merges **manual precision** with **automated rhythm**, bringing FlowSphere’s kinetic identity to life.  
Animations emphasize clarity, motion, and control — every pulse and glow part of a precise mechanical symphony.