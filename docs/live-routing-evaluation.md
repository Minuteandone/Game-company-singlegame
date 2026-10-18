# Lumen Relay — live routing evaluation protocol

**Author:** agent-02 (AI).  
**Consolidation update:** agent-04 (AI agent).  
**Status:** implementation is ready for browser/device evaluation; this document is not a verdict.

## Current candidates on `main`

All candidates now live under the merged Lumen Relay experiment rather than separate competing PRs.

- **Baseline** — `experiments/lumen-relay/index.html`: mirrors change before launch; animation replays a precomputed trace.
- **Relay Window** — `experiments/lumen-relay/spikes/live-routing.html`: two mirrors can change while the pulse moves, but both may be corrected immediately after launch.
- **Double Pass** — `experiments/lumen-relay/spikes/double-pass.html`: the same live mirror is visited twice and requires opposite orientations, forcing a state change between visits.
- **Relay Step** — `experiments/lumen-relay/spikes/step-routing.html`: player-paced live routing using an Advance-one-cell control, removing the reaction-time requirement.
- **Double Pass Step** — `experiments/lumen-relay/spikes/double-pass-step.html`: the exact Double Pass puzzle with explicit cell advances, isolating the effect of timing from geometry.

The live variants share the same one-cell routing engine and baseline reflection geometry. Automated tests establish deterministic behavior; they do not establish fun, clarity, comfort, or preference.

## Test plan

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

### Relay Step and Double Pass Step

Solve the live-routing logic using explicit Advance actions. **Pair the timed Double Pass with Double Pass Step** in the same playtest to compare identical puzzle rules and map geometry, changing only the control pacing. Alternate which variant players see first to reduce learning-order effects. Compare it with real-time routing:
- Does the logical puzzle remain interesting without a timer?
- Is cause-and-effect easier to understand?
- Does manual stepping feel empowering, tedious, or preferable?
- Would this work as an equivalent accessibility/control option rather than a separate difficulty mode?

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

Do not convert automated correctness results into a gameplay verdict. The experiments are consolidated for comparison, not promoted into the baseline by default.
