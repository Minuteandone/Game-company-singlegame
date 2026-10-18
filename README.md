# Game Company — Single Game

A collaborative game-development experiment built by four independent AI agents working through one shared repository.

## Current shared prototype: Lumen Relay

**Lumen Relay** is a small browser puzzle about rotating mirrors to route a light pulse to a flower receiver.

The current repository contains:

- a three-level **baseline** puzzle with deterministic route tracing;
- **Relay Window**, a live-routing experiment where mirror changes affect a pulse already in flight;
- **Double Pass**, a stricter live-routing fixture where the same mirror is visited twice and must change orientation between visits;
- **Relay Step**, a player-paced live-routing control mode with an explicit Advance-one-cell action and no reaction-time requirement;
- automated engine, integration, UI-parse, and authored-level audit tests;
- shared design and evaluation documents.

The prototype is intentionally reversible. The repository does **not** yet record a final decision to keep static routing, mutate the game around live routing, or replace the concept.

## Play locally

No build step or third-party runtime dependency is required for the browser prototype.

```sh
cd experiments/lumen-relay
python3 -m http.server 8000
```

Then open:

| Variant | Local page | Purpose |
| --- | --- | --- |
| Baseline | `http://localhost:8000/` | Static mirror planning and precomputed pulse playback |
| Relay Window | `http://localhost:8000/spikes/live-routing.html` | Simple in-flight mirror changes |
| Double Pass | `http://localhost:8000/spikes/double-pass.html` | Forced between-visits mirror change |
| Relay Step | `http://localhost:8000/spikes/step-routing.html` | Player-paced live routing without reaction-time pressure |\n| Playtest recorder | `http://localhost:8000/evaluate.html` | Local-only structured observation capture for Issue #8 |

A different local static-file server works too; the pages use browser ES modules, so opening the HTML directly from `file://` is not recommended.

## Run tests

Run the Lumen Relay test suite:

```sh
cd experiments/lumen-relay
npm test
```

Or run every discoverable experiment test package from the repository root:

```sh
node scripts/verify.mjs
```

The repository also has GitHub Actions checks for the Lumen Relay package and the repository-wide verifier.

## Evaluation status

Implementation correctness is tested, but correctness is not the same thing as fun or usability.

The current decision gate is documented in:

- [Lumen Relay design & playtest contract](docs/lumen-relay-design-contract.md)
- [Live-routing evaluation protocol](docs/live-routing-evaluation.md)
- [Live-routing experiment notes](experiments/lumen-relay/spikes/README.md)

The live-routing experiment is currently **ready for evaluation**. A Continue / Mutate / Replace verdict should wait for actual browser/device observations about discoverability, timing fairness, keyboard and touch use, nonvisual state information, and whether players prefer the mechanic.

## Repository map

```text
experiments/lumen-relay/       Shared playable prototype and mechanic experiments
docs/                          Shared design and evaluation documents
scripts/verify.mjs             Repository-wide test discovery/runner
storage/shared/                Shared company storage
storage/personal/agent-*/      Agent-specific organizational workspaces
.github/workflows/             Automated checks
```

Personal storage is public and organizational, not private.

## Collaboration

The four agents contribute through branches, issues, pull requests, reviews, tests, and repository documents. Agent identities are recorded in contribution text and commit messages so work remains attributable even though the repository account is shared.

No agent has permanent authority over the others. Experiments may be proposed, challenged, combined, or discarded based on evidence and the shared objective of building one game.
