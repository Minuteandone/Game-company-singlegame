import { createMirrorState, positionKey, rotateMirror } from "../src/engine.mjs";
import { advanceLivePulse, createLivePulse } from "./live-engine.mjs";
import { selectStepLevel } from "./step-level.mjs";
const LIVE_LEVEL = selectStepLevel(window.location.search);
import { createStepSession } from "./step-session.mjs";

const byId = id => document.getElementById(id);
const elements = {
  board: byId("board"),
  begin: byId("begin"),
  advance: byId("advance"),
  reset: byId("reset"),
  hint: byId("hint"),
  status: byId("status"),
  steps: byId("steps"),
  turns: byId("turns"),
  levelTitle: byId("level-title"),
  levelSubtitle: byId("level-subtitle")
};

const liveKeys = new Set(LIVE_LEVEL.liveMirrorKeys);
const sessionEngine = Object.freeze({
  initialPulse: createLivePulse,
  stepPulse: (level, pulse, mirrors) => advanceLivePulse(level, mirrors, pulse)
});
let session = createStepSession(
  LIVE_LEVEL,
  sessionEngine,
  createMirrorState(LIVE_LEVEL)
);

const state = {
  begun: false,
  turns: 0
};

let tiles = new Map();
const headingNames = { N: "north", E: "east", S: "south", W: "west" };

elements.levelTitle.textContent = LIVE_LEVEL.name;
elements.levelSubtitle.textContent = LIVE_LEVEL.subtitle;
document.title = "Lumen Relay — " + LIVE_LEVEL.name + " Step Mode";
for (const link of document.querySelectorAll("[data-step-level]")) {
  if (link.dataset.stepLevel === LIVE_LEVEL.id) link.setAttribute("aria-current", "page");
}

function orientationName(orientation) {
  return orientation === "/" ? "slash orientation" : "backslash orientation";
}

function setStatus(message, kind = "ready") {
  elements.status.textContent = message;
  elements.status.dataset.state = kind;
}

function updateCounters() {
  elements.steps.textContent = String(session.snapshot.steps);
  elements.turns.textContent = String(state.turns);
}

function mirrorLabel(x, y, key, fixed = false) {
  const snapshot = session.snapshot;
  const prefix = fixed ? "Fixed mirror" : "Live mirror";
  const action = fixed
    ? "This mirror cannot be turned."
    : (state.begun && !snapshot.pulse.outcome
        ? "Activate to turn it before advancing again."
        : "Available after step mode begins.");
  return prefix + ", " + orientationName(snapshot.mirrors[key]) +
    ", column " + (x + 1) + ", row " + (y + 1) + ". " + action;
}

function renderBoard() {
  const snapshot = session.snapshot;
  const sourceKey = positionKey(LIVE_LEVEL.source.x, LIVE_LEVEL.source.y);
  const goalKey = positionKey(LIVE_LEVEL.goal.x, LIVE_LEVEL.goal.y);
  const fragment = document.createDocumentFragment();
  tiles = new Map();

  elements.board.style.gridTemplateColumns =
    "repeat(" + LIVE_LEVEL.width + ", minmax(0, 1fr))";
  elements.board.style.gridTemplateRows =
    "repeat(" + LIVE_LEVEL.height + ", minmax(0, 1fr))";
  elements.board.style.aspectRatio = LIVE_LEVEL.width + " / " + LIVE_LEVEL.height;

  for (let y = 0; y < LIVE_LEVEL.height; y += 1) {
    for (let x = 0; x < LIVE_LEVEL.width; x += 1) {
      const key = positionKey(x, y);
      const isMirror = Object.hasOwn(snapshot.mirrors, key);
      const isLive = liveKeys.has(key);
      const tile = document.createElement(isMirror && isLive ? "button" : "div");
      tile.className = "tile";
      tile.dataset.key = key;

      if (isMirror) {
        tile.classList.add("tile--mirror");
        tile.classList.add(isLive ? "tile--live" : "tile--fixed");
        tile.textContent = snapshot.mirrors[key] === "/" ? "╱" : "╲";
        tile.setAttribute("aria-label", mirrorLabel(x, y, key, !isLive));

        if (isLive) {
          tile.type = "button";
          tile.disabled = !state.begun || Boolean(snapshot.pulse.outcome);
          tile.addEventListener("click", () => {
            const current = session.snapshot;
            if (!state.begun || current.pulse.outcome) return;

            session.rotate(rotateMirror(current.mirrors, x, y));
            state.turns += 1;

            const next = session.snapshot;
            tile.textContent = next.mirrors[key] === "/" ? "╱" : "╲";
            tile.setAttribute("aria-label", mirrorLabel(x, y, key));
            updateCounters();
            setStatus("Mirror changed. The next Advance action will use its new orientation.");
          });
        }
      } else if (key === sourceKey) {
        tile.classList.add("tile--source");
        tile.textContent = "◉";
        tile.setAttribute("aria-label", "Pulse sender");
      } else if (key === goalKey) {
        tile.classList.add("tile--goal");
        tile.textContent = "✿";
        tile.setAttribute("aria-label", "Sleeping flower");
      }

      tiles.set(key, tile);
      fragment.appendChild(tile);
    }
  }

  elements.board.replaceChildren(fragment);
  paintPulse();
}

function paintPulse() {
  const pulse = session.snapshot.pulse;
  for (const tile of tiles.values()) tile.classList.remove("lit", "current");
  for (const position of pulse.path) {
    const tile = tiles.get(positionKey(position.x, position.y));
    if (tile) tile.classList.add("lit");
  }
  const current = tiles.get(positionKey(pulse.x, pulse.y));
  if (current) current.classList.add("current");
}

function syncControls() {
  const snapshot = session.snapshot;
  const finished = Boolean(snapshot.pulse.outcome);
  elements.begin.disabled = state.begun && !finished;
  elements.begin.textContent = finished ? "Begin new step run" : "Begin step mode";
  elements.advance.disabled = !state.begun || finished;

  for (const [key, tile] of tiles) {
    if (tile.tagName === "BUTTON") {
      tile.disabled = !state.begun || finished;
      const [x, y] = key.split(",").map(Number);
      tile.setAttribute("aria-label", mirrorLabel(x, y, key));
    }
  }
}

function reset() {
  session.reset(createMirrorState(LIVE_LEVEL));
  state.begun = false;
  state.turns = 0;
  renderBoard();
  updateCounters();
  syncControls();
  setStatus("Begin the run. After that, mirrors can be changed between any two pulse steps.");
}

function begin() {
  session.reset(createMirrorState(LIVE_LEVEL));
  state.begun = true;
  state.turns = 0;
  renderBoard();
  updateCounters();
  syncControls();
  setStatus("Step mode active. Rotate any live mirror, then choose Advance one cell.");
}

function advance() {
  const before = session.snapshot;
  if (!state.begun || before.pulse.outcome) return;

  const snapshot = session.advance();
  paintPulse();
  updateCounters();

  if (snapshot.pulse.outcome === "won") {
    setStatus("Relay complete with no reaction-time requirement. ✿", "win");
  } else if (snapshot.pulse.outcome) {
    const outcome = snapshot.pulse.outcome === "timeout"
      ? "The pulse timed out."
      : snapshot.pulse.outcome === "blocked"
        ? "The pulse hit a blocker."
        : "The pulse escaped the board.";
    setStatus(outcome + " Begin a new run and try a different sequence.", "fail");
  } else {
    const { x, y, dir } = snapshot.pulse;
    setStatus(
      "Pulse at column " + (x + 1) + ", row " + (y + 1) +
      ", heading " + headingNames[dir] + "." +
      (liveKeys.has(positionKey(x, y)) ? " This cell has a live mirror." : "") +
      " Rotate a mirror or advance one cell."
    );
  }

  syncControls();
}

elements.begin.addEventListener("click", begin);
elements.advance.addEventListener("click", advance);
elements.reset.addEventListener("click", reset);
elements.hint.addEventListener("click", () => setStatus(LIVE_LEVEL.hint));

document.addEventListener("keydown", event => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
  if (event.code === "KeyA") {
    event.preventDefault();
    advance();
  } else if (event.code === "KeyR") {
    event.preventDefault();
    reset();
  }
});

reset();
