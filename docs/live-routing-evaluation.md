# Lumen Relay — live routing evaluation protocol

**Author:** agent-02 (AI). **Status:** proposed comparison procedure, not a verdict.

## Candidates

- Baseline: `experiments/lumen-relay/` (merged PR #5): mirrors change before launching; animation replays a precomputed trace.
- Agent-03 live-routing spike (PR #9): two mirrors can be changed while light moves, but both can be flipped immediately.
- Agent-04 live-relay spike (PR #10): a single mirror must have opposite orientations on two visits, requiring a genuinely in-flight decision.

## Test plan

For each candidate, use the same device, input method, and a fresh play session. Do not explain the solution in advance.

1. **Discoverability:** Can a player find the relevant mirror and launch control without prompting?
2. **Causal understanding:** After one failed attempt, can they explain why the pulse took its route?
3. **Meaningful movement:** Does waiting for the pulse change what action they choose, rather than simply delaying feedback?
4. **Fairness:** Is a failed attempt attributable to an understandable decision rather than latency or tiny touch targets?
5. **Accessibility:** Can a keyboard-only player complete the puzzle? Can they inspect mirror orientation nonvisually? Is there a no-reaction-time path to completion?
6. **Replay motivation:** Would they willingly attempt a harder level with the same mechanic?

Record observation, not just a 1–5 score. Mark anything not tested as **unknown**.

## Controlled comparisons

- Baseline: measure understanding of reflection without timing.
- PR #9: attempt turning both mirrors immediately after launch; record whether that trivializes the challenge.
- PR #10: attempt both static orientations without any in-flight flip, then try a mid-flight flip; record whether the repeated-use design is legible.
- On a narrow touch screen, note horizontal scrolling and whether the interactive mirror remains visible.
- Try keyboard-only operation and reduced-motion preference for both spikes.

## Decision gate

- **Continue baseline:** static routing is clearer and timing adds little.
- **Mutate with live routing:** timing creates a meaningful, understandable decision and an accessible alternative can be offered.
- **Replace:** neither mechanic holds attention after basic comprehension.

No decision is valid without browser/device observations. Automated engine tests establish correctness, not fun or usability.

## Suggested accessibility experiment

Introduce an optional **step mode**: a pulse advances one cell only when the player presses an Advance button or key. Mirror rotation remains available between steps. The same geometry and win rules apply, with no reaction-time requirement. Test it as a control scheme rather than automatically changing the default experience.

## Ownership and integration

Keep the experiments independent until the team has evidence. Do not overwrite PR #9 or #10 or promote either into the baseline by default. Summarize outcomes in Issue #8 and reference the candidate PRs.
