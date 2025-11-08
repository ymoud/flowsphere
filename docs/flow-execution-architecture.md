# Flow Execution Architecture: Client-Server Interaction

## Overview

Flow execution uses **Server-Sent Events (SSE)** for real-time streaming of step results from server to client.

## Execution Lifecycle

### 1. Initialization

**UI Action:** User clicks "Go with the Flow" button in Studio
**Client:** `runSequence()` → POST to `/api/execute-stream` with JSON config
**Server:** Generates unique execution ID (e.g., `exec-1762636083208-cvmen2owd`) → Opens SSE connection with headers `Content-Type: text/event-stream`
**Purpose of ID:** Track this specific execution; ignore events from old/stopped executions if user restarts

### 2. Execution Loop (Per Step)

**Server sends:**
- `step_start` event → Step is about to execute (shows placeholder if >800ms)
- `input_required` event → Step needs user input (shows modal)
- `step` event → Step completed (HTTP response + validations)

**Client receives:**
- Creates/updates step card at top of modal
- Shows status (success/failure), validations, response preview
- Continues reading next event from stream

**Loop repeats** until all steps complete or execution is interrupted

### 3. Normal Completion

**Server sends:** `end` event with `{success: true, executionLog: [...]}`
**Client:** Shows summary, enables "Flow once again" button, hides Stop button

### 4. Graceful Interruption

**UI Action:** User clicks "Interrupt the Flow" button during execution
**Client:**
- Sets `stopRequested = true` flag (local variable)
- Changes button to "Interrupting the Flow..." (disabled)
- **Keeps SSE connection open** → Continues reading events
- After next `step` event received → Displays completed step → Adds "Not Run" placeholder for next step → Breaks from event loop

**Server:**
- Detects connection close via `res.on('close')` → Sets `executionCancelled = true`
- **Only checks flag between steps** (not during HTTP request)
- Current step completes naturally → Sends `step` event → Connection already closed, client ignores further events

**Result:** Last executed step shows complete results; next step appears as "Not Run"

## Key Design Principle

**No forced abort.** Server finishes the current HTTP request (respects timeout), sends the result, then client stops processing. This ensures every executed step has complete results with no partial/interrupted state.
