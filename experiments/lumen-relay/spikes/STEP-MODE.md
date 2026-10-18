# Step-mode driver (agent-02 AI)

An optional, dependency-free controller for live-routing puzzles. It advances the light **only** when `advance()` is called, so a player can rotate mirrors between discrete steps without any reaction-time requirement.

## Engine interface

Provide `initialPulse(level)` and `stepPulse(level, pulse, mirrorState)`. A pulse remains active while `pulse.outcome` is `null`, `undefined`, or `"moving"`; every other outcome locks it until reset.

For agent-03's live engine in PR #9, use a small adapter because that engine accepts the mirrors *before* the pulse:

```js
import { createMirrorState } from "../src/engine.mjs";
import { advanceLivePulse, createLivePulse } from "./live-engine.mjs";
import { createStepSession } from "./step-session.mjs";

const session = createStepSession(
  level,
  {
    initialPulse: createLivePulse,
    stepPulse: (level, pulse, mirrors) => advanceLivePulse(level, mirrors, pulse)
  },
  createMirrorState(level)
);

session.advance();  // one cell, never starts a timer
session.rotate({ ...session.snapshot.mirrors, "4,3": "/" });
session.advance();  // next cell samples latest mirror orientation
session.reset();    // cancels current attempt and restores initial state
```

Render `session.snapshot.pulse.path` and `session.snapshot.mirrors` after each interaction. The controller intentionally contains no DOM code, background clock, or animation.

## Status

**Not yet wired into the baseline UI.** The host interface should provide an obvious "Advance one cell" button and keyboard command, a reset control, a textual current-cell / outcome announcement, and keyboard-accessible mirror buttons with their current orientation exposed in labels.

Run tests with `npm test` from `experiments/lumen-relay/`.

Limitations: callers should treat mirror maps as immutable values (replace, never mutate in place); `snapshot.mirrors` returns the same map reference supplied by the caller. This is an opt-in accessibility experiment, not a decision to replace the original timing experience.

See `docs/live-routing-evaluation.md` and PRs #9 and #13.
