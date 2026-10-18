# Lumen Relay — live routing evaluation protocol

**Author:** agent-02 (AI).  
**Consolidation update:** agent-04 (AI agent).  
**Status:** implementation is ready for browser/device evaluation; this document is not a verdict.

## Current candidates on `main`

All candidates now live under the merged Lumen Relay experiment rather than separate competing PRs.

- **Baseline** — `experiments/lumen-relay/index.html`: mirrors change before launch; animation replays a precomputed trace.
- **Relay Window** — `experiments/lumen-relay/spikes/live-routing.html`: two mirrors can change while the pulse moves, but both may be corrected immediately after launch.
- **Double Pass** — `experiments/lumen-relay/spikes/double-pass.html`: the same live mirror is visited twice and requires opposite orientations, forcing a state change between visits.
- **Relay Window · Step Mode** — `experiments/lumen-relay/spikes/step-routing.html`: player-paced Relay Window using an Advance-one-cell control.
- **Double Pass · Step Mode** — `experiments/lumen-relay/spikes/step-routing.html?level=double-pass`: the exact Double Pass geometry and solution rules, but every pulse cell advances explicitly on player input.

The live variants share the same one-cell routing engine and baseline reflection geometry. Automated tests establish deterministic behavior; they do not establish fun, clarity, comfort, or preference.

## Test plan

When serving `experiments/lumen-relay/` locally, open `evaluate.html` for a local-only observation recorder aligned to this protocol. It can open each candidate, save sessions in browser local storage, copy a structured Issue #8 report, and copy a **coverage summary** of all locally saved sessions. The summary distinguishes records that were merely saved from sessions that were actually completed, attempted, or observed. Neutral `not recorded` placeholders do **not** count toward matched Double Pass coverage, environment coverage, or evidence-direction counts. The summary does not score qualitative notes, upload anything, or choose a verdict automatically.

For each candidate, use the same device, input method, and a fresh play session. Do not explain the solution in advance.

1. **Discoverability:** Can a player find the relevant mirror and launch/advance control without prompting?
2. **Causal understanding:** After one failed attempt, can they explain why the pulse took its route?
3. **Meaningful movement:** Does waiting for the pulse change what action they choose, rather than simply delaying feedback?
4. **Fairness:** Is a failed attempt attributable to an understandable decision rather than latency, unclear state, or tiny touch targets?
5. **Accessibility:** Can a keyboard-only player complete the puzzle? Can mirror orientation be inspected nonvisually? Is there a no-reaction-time path to completion?
6. **Replay motivation:** Would they willingly attempt a harder level using the same mechanic?

Record observations, not just a 1–5 score. Mark anything not tested as **unknown**.

## Controlled comparisons

### Baseline

Measure whether reflection and route planning are understandable without timing pressure. Record whether the pulse animation feels useful feedback or merely waiting.

### Relay Window

Try turning both live mirrors immediately after launch. Record whether that trivializes the timing challenge. Then retry while waiting to act near each arrival and compare how the rhythm feels.

### Double Pass

Try:
- never changing the live mirror;
- changing it too early and leaving it changed;
- changing it after the first pass but before the return;
- changing it after the second arrival.

Record whether the repeated visit is legible before reading the hint, and whether the successful timing window feels like anticipation rather than a reaction-speed test.

### Step Mode

Solve the live-routing logic using explicit Advance actions. Compare Relay Window with its step-mode version, then compare timed Double Pass directly against **Double Pass · Step Mode**.

For the Double Pass pair, keep the geometry and solution constant and change only pacing:
- Is the repeated-mirror rule understandable in both modes?
- Does real-time timing add anticipation, or mostly input pressure?
- Does player-paced stepping make cause-and-effect clearer?
- Does manual stepping feel empowering, tedious, or preferable?
- Would step mode work as an equivalent accessibility/control option rather than a separate difficulty mode?

## Input and display checks

For each applicable variant:

- try keyboard-only operation;
- inspect the mirror orientation information exposed by control labels;
- enable reduced-motion preference;
- try a narrow touch-sized viewport and note scrolling, target size, and whether the next interactive mirror stays visible;
- record any failure that seems caused by input latency or presentation rather than a decision.

## Decision gate

Choose only after browser/device observations exist.

- **Continue baseline:** static routing is clearer and timing adds little.
- **Mutate with live routing:** timing creates a meaningful, understandable decision and the player-paced alternative preserves the underlying puzzle.
- **Replace:** neither static nor live routing holds attention after basic comprehension.

A mixed result is valid. For example, the company could keep live-state routing while preferring player-paced turns over real-time deadlines.

## Evidence handling

Summarize actual observations in Issue #8. Include:
- candidate/page tested;
- device or viewport class;
- input method;
- what the player did without prompting;
- notable failure/retry behavior;
- accessibility/control observations;
- whether the evidence favors Continue, Mutate, Replace, or remains inconclusive.

The local recorder formats these fields into a ready-to-paste Issue #8 comment, but the tester still decides whether to share it. When multiple sessions exist, its local evidence summary can be used to check whether both sides of the matched Double Pass comparison and relevant device/input classes have actually been **observed**, rather than merely saved with unknown/default fields, before interpreting the qualitative notes.

Do not convert automated correctness results into a gameplay verdict. The experiments are consolidated for comparison, not promoted into the baseline by default.
