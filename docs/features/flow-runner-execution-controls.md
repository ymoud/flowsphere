# Flow Runner - Execution Controls

**Status:** ✅ Complete (All 3 Phases)

**Priority:** 1

## Overview

Add execution controls to the Flow Runner for better debugging and workflow management through step-by-step execution modes.

## Design Evolution

### Original Approach (Abandoned)
Initially planned pause/resume/stop controls with server-side session management. This approach was abandoned due to:
- **UX Confusion**: Pause signal lag causes mismatch between what user sees and actual execution state
- **Implementation Complexity**: Requires complex session management and SSE pause/resume coordination
- **Timing Issues**: Cannot pause immediately during step execution, only between steps

### New Approach: Step-by-Step Execution Modes
Instead of pause/resume, implement three distinct execution modes that give users full control without timing confusion.

---

## Execution Modes

### 1. Full Speed (Default)
- Runs all steps continuously without stopping
- No pauses between steps
- Fastest execution
- Current behavior

### 2. Step-by-Step (Manual)
- Executes one step at a time
- Pauses and waits for user to click "Continue"
- Perfect for debugging and learning
- User has complete control

### 3. Auto-Step (Configurable Delay)
- Executes one step
- Pauses for X seconds (shows countdown timer)
- Automatically continues to next step after delay
- User can click "Continue Now" to skip countdown
- User can click "Stop" during countdown to abort execution

---

## Implementation Phases

### Phase 1: Stop/Cancel Functionality

**Goal:** Allow users to cleanly abort execution at any point with graceful completion of in-flight requests.

**Philosophy: Graceful Interruption**
- Stop flag is set immediately when user clicks Stop
- Current step executes to completion (HTTP request + validations)
- Execution halts before starting the next step
- No partial/interrupted nodes - all executed steps have complete results

**Features:**
- Add "Stop" button during execution
- Graceful stop: let current step finish, don't start next
- Different behavior for HTTP requests vs user input
- Button state feedback during interruption
- Save partial execution log
- Show "Execution Interrupted" state
- Enable "Re-run" option

**UI:**

**Button States:**
```
During execution:
[▶ Run (disabled)]  [Stop]  [Clear Results (disabled)]

During interruption (waiting for current step):
[▶ Run (disabled)]  [Interrupting the flow...] (disabled)  [Clear Results (disabled)]

After interrupted:
[▶ Re-run]  [Clear Results]
```

**Stop Behavior:**

**1. During HTTP Request Execution:**
- User clicks Stop → Button changes to "Interrupting the flow..." (disabled)
- Wait for HTTP request to complete (respects timeout, 1-30s)
- Show step result (success/failure) normally
- Don't start next step
- Final message: "⊗ Execution interrupted after Step 3 of 12"

**2. During User Input Modal:**
- User clicks Stop → Immediately close input modal
- No HTTP request to wait for
- Final message: "⊗ Execution interrupted after Step 2 of 12"

**3. Between Steps:**
- User clicks Stop → Immediate interruption
- Final message: "⊗ Execution interrupted after Step 3 of 12"

**Backend:**
- No session management needed
- Check `executionCancelled` flag ONLY after step completes, before next iteration
- During user input: if cancelled, send `interrupted` event instead of waiting
- Server detects SSE connection close via `res.on('close')` handler
- Send final event: `{type: 'interrupted', lastCompletedStep: i, totalSteps: nodes.length}`

**Client:**
- `stopExecution()` disables button and changes text to "Interrupting the flow..."
- Remove `markExecutingStepAsStopped()` - steps complete naturally
- Handle `interrupted` event type
- During input: check `stopRequested` before sending input

**Execution Messages:**
- ✅ Success: "✓ Flow completed successfully - All 12 steps executed"
- ⊗ Interrupted: "⊗ Execution interrupted after Step 3 of 12"
- ✗ Error: "✗ Flow failed at Step 5 of 12: [error message]"

**Acceptance Criteria:**
- ✅ Stop button appears during execution
- ✅ Clicking Stop sets flag and changes button to "Interrupting the flow..."
- ✅ Current HTTP request completes before stopping (waits for timeout if needed)
- ✅ User input stops immediately (no waiting)
- ✅ Last executed step shows complete results (no interrupted state)
- ✅ Execution stops before starting next step
- ✅ Partial execution log is saved and downloadable
- ✅ Re-run button appears after interruption
- ✅ Clear message "⊗ Execution interrupted after Step X of Y"
- ✅ Button disabled during interruption prevents double-clicks

---

### Phase 2: Step-by-Step Execution

**Goal:** Allow users to execute one step at a time with manual control.

**Features:**
- Add execution mode selector before running
- Execute single steps via API
- Pause between steps and wait for user
- Show "Continue to Next Step" button
- Display next step preview

**UI:**

**Mode Selector (before execution):**
```
┌─────────────────────────────────────────────────────┐
│ Execution Mode:                                     │
│  ● Full Speed    - Run all steps without stopping  │
│  ○ Step-by-Step  - Pause after each step (manual)  │
└─────────────────────────────────────────────────────┘

[▶ Start Flow]
```

**During Step-by-Step Execution:**
```
┌─────────────────────────────────────────────────────┐
│ ⏸️  Step 3 Completed - Waiting for Continue         │
├─────────────────────────────────────────────────────┤
│ Progress: ████████░░░░░░░░░░░░ (43%)               │
│                                                     │
│ ✅ Step 3: Get User Profile (200 OK) - 234ms       │
│    Response: { "id": 123, "name": "John Doe" }     │
│                                                     │
│ Next: Step 4 - Create Resource                     │
│                                                     │
│ [▶ Continue to Next Step]  [⏹ Stop Execution]     │
└─────────────────────────────────────────────────────┘
```

**Backend:**
```javascript
// New endpoint for single-step execution
POST /api/execute-step
Body: {
  config: { /* full config */ },
  stepIndex: 3,
  responses: [ /* previous responses */ ],
  userInput: { /* if needed */ }
}

Response: {
  success: true,
  step: { /* step result */ },
  response: { /* HTTP response */ },
  validations: [ /* validation results */ ]
}
```

**Client-Side Flow:**
```javascript
async function runStepByStep(config) {
  for (let i = 0; i < config.nodes.length; i++) {
    // Execute single step
    const result = await executeSingleStep(config, i, responses);

    // Display result
    updateModalWithStep(result, i);

    // Wait for user to click Continue
    await waitForUserContinue();

    // Check if user clicked Stop
    if (stopRequested) break;
  }
}
```

**Acceptance Criteria:**
- ✅ Mode selector appears before execution starts
- ✅ In Step-by-Step mode, execution pauses after each step
- ✅ "Continue to Next Step" button is clearly visible
- ✅ Next step is previewed before continuing
- ✅ Stop button works during pause
- ✅ All step results are preserved and visible

---

### Phase 3: Auto-Step with Configurable Delay

**Goal:** Add automatic continuation with configurable delay for hands-free step-by-step debugging.

**Features:**
- Add "Auto-Step" mode with delay selector
- Show countdown timer during pause
- Allow "Continue Now" to skip countdown
- Allow changing delay during execution
- Persist user's preferred delay

**UI:**

**Mode Selector (before execution):**
```
┌─────────────────────────────────────────────────────┐
│ Execution Mode:                                     │
│  ○ Full Speed    - Run all steps without stopping  │
│  ○ Step-by-Step  - Pause after each step (manual)  │
│  ● Auto-Step     - Auto-resume after delay         │
│                                                     │
│  Delay: [3 seconds ▼]                              │
│         1s, 2s, 3s, 5s, 10s, 30s                   │
└─────────────────────────────────────────────────────┘

[▶ Start Flow]
```

**During Auto-Step Countdown:**
```
┌─────────────────────────────────────────────────────┐
│ ⏱️  Step 3 Completed - Auto-continuing in 3s...     │
├─────────────────────────────────────────────────────┤
│ Progress: ████████░░░░░░░░░░░░ (43%)               │
│                                                     │
│ ✅ Step 3: Get User Profile (200 OK) - 234ms       │
│    Response: { "id": 123, "name": "John Doe" }     │
│                                                     │
│ Next: Step 4 - Create Resource                     │
│                                                     │
│ Countdown: ⏱️ 3... 2... 1...                        │
│                                                     │
│ [▶ Continue Now]  [⏹ Stop Execution]              │
└─────────────────────────────────────────────────────┘
```

**Settings Persistence:**
```javascript
// Save user preference
localStorage.setItem('flowsphere-execution-mode', 'auto-step');
localStorage.setItem('flowsphere-auto-step-delay', '3');
```

**Client-Side Flow:**
```javascript
async function runAutoStep(config, delay) {
  for (let i = 0; i < config.nodes.length; i++) {
    // Execute single step
    const result = await executeSingleStep(config, i, responses);

    // Display result
    updateModalWithStep(result, i);

    // Show countdown and wait (or skip if user clicks Continue Now)
    const userSkipped = await countdownAndWait(delay);

    // Check if user clicked Stop
    if (stopRequested) break;
  }
}

// Countdown with skip option
async function countdownAndWait(seconds) {
  return new Promise((resolve) => {
    let remaining = seconds;
    const interval = setInterval(() => {
      remaining--;
      updateCountdownUI(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        resolve(false); // Auto-continued
      }
    }, 1000);

    // User can click Continue Now to skip
    continueNowButton.onclick = () => {
      clearInterval(interval);
      resolve(true); // User skipped countdown
    };

    // User can click Stop to abort
    stopButton.onclick = () => {
      clearInterval(interval);
      stopRequested = true;
      resolve(false);
    };
  });
}
```

**Acceptance Criteria:**
- ✅ Auto-Step mode available in mode selector
- ✅ Delay dropdown with predefined options (1s, 2s, 3s, 5s, 10s, 30s)
- ✅ Countdown timer shows remaining seconds
- ✅ "Continue Now" button skips countdown
- ✅ Stop button aborts during countdown
- ✅ User's mode and delay preference persisted to localStorage
- ✅ Countdown is visually clear (animated or pulsing)

---

## Additional Features

### Quick Mode Switch During Execution
Allow switching from Auto-Step to Full Speed mid-execution:

```
During Auto-Step countdown:

[⚡ Switch to Full Speed] ← Skip all remaining pauses
```

### Visual State Indicators

**Execution States:**
- 🟢 **Running**: Green dot, actively executing
- ⏸️ **Paused (Manual)**: Blue pause icon, waiting for user
- ⏱️ **Paused (Auto-Step)**: Orange timer icon, countdown active
- 🔴 **Stopped**: Red dot, execution aborted
- ✅ **Completed**: Green checkmark, all steps done
- ❌ **Failed**: Red X, validation/error occurred

---

## Benefits of New Approach

### vs Original Pause/Resume Design:

**Advantages:**
- ✅ No pause signal lag or timing confusion
- ✅ Clear, predictable behavior
- ✅ Much simpler implementation (no session management)
- ✅ Better debugging experience (hands-free with Auto-Step)
- ✅ More flexible (3 modes vs 2 controls)
- ✅ Works perfectly with current SSE architecture

**What We Gain:**
- ✅ Inspection between steps (Step-by-Step)
- ✅ Controlled execution (manual or auto)
- ✅ Hands-free debugging (Auto-Step with delay)
- ✅ Clean abort (Stop button)
- ✅ No UX confusion

**What We Lose:**
- ❌ Cannot pause during a long-running HTTP request (but this wasn't reliable anyway)

---

## Implementation Complexity

**Original Pause/Resume:** 🔴🔴🔴🔴 (Very Complex)
- Session management
- SSE pause/resume coordination
- State synchronization
- Timing issues

**New Step-by-Step:** 🟢🟢 (Simple)
- Client-side delays and mode control
- Simple single-step API
- No state management
- Clear UX

---

## Success Criteria

**Phase 1 (Stop):**
- Users can abort execution at any point
- Partial logs are preserved
- Clear UI feedback on stopped state

**Phase 2 (Step-by-Step):**
- Users can execute one step at a time
- Perfect for learning and debugging
- Clear visual distinction between modes

**Phase 3 (Auto-Step):**
- Hands-free step-by-step debugging
- Configurable delays for different use cases
- Seamless user experience with countdown

---

## Future Enhancements

- **Breakpoints**: Set breakpoints on specific steps (pause only at marked steps)
- **Conditional Pauses**: Auto-pause on validation failures or specific status codes
- **Step Replay**: Re-execute a specific step without re-running entire sequence
- **Variable Inspector**: Show all available variables/responses during pause
