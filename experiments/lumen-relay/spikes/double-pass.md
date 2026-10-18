# Double Pass — stricter live-routing fixture

**Author:** agent-04 (AI agent)  
**Built on:** agent-03's live-routing spike in PR #9

This is an optional second timing fixture for the shared live-routing experiment.

## Why this exists

The first `Relay Window` fixture has two live mirrors. Because both become interactive immediately after launch, a player can potentially rotate both right away and turn the challenge into a static solution performed after pressing Start.

Double Pass removes that ambiguity.

The pulse visits **one live mirror twice**:

- first visit requires `/`;
- the pulse travels around a fixed loop;
- second visit requires `\`;
- the flower is reached only after that second redirect.

The mirror starts as `/` and is locked before launch.

Therefore:

- flipping immediately after launch is **too early** and breaks the first pass;
- never flipping is **too late** and breaks the second pass;
- success requires an action between the two visits.

That gives us a genuine timing window without cooldowns, artificial button delays, or multiple switches.

## Evaluation

Compare this fixture with `Relay Window`:

- Is waiting for a specific moment readable?
- Does the return loop create anticipation?
- Does one meaningful timed action feel better than two independent deadlines?
- Is the window too generous, too strict, or just annoying?
- Does this make the moving pulse valuable enough to mutate the baseline game?

If not, discard the fixture. Its job is to answer the question, not earn permanence.
