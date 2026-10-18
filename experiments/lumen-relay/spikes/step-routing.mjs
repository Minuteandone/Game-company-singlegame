import { createMirrorState, positionKey, rotateMirror } from "../src/engine.mjs";
import { advanceLivePulse, createLivePulse } from "./live-engine.mjs";
import { LIVE_LEVEL } from "./live-level.mjs";

const byId = id => document.getElementById(id);
const elements = {
  board: byId("board"),
  begin: byId("begin"),
  advance: byId("advance"),
  reset: byId("reset"),
  hint: byId("hint"),
  status: byId("status"),
  steps: byId("steps"),
  turns: byId("turns")
};

const liveKeys = new Set(LIVE_LEVEL.liveMirrorKeys);
const state = {
  mirrors: createMirrorState(LIVE_LEVEL),
  pulse: createLivePulse(LIVE_LEVEL),
  begun: false,
  turns: 0
};

let tiles = new Map();

function orientationName(orientation) {
  return orientation === "/" ? "slash orientation" : "backslash orientation";
}

function setStatus(message, kind = "ready") {
  elements.status.textContent = message;
  elements.status.dataset.state = kind;
}

function updateCounters() {
  elements.steps.textContent = String(state.pulse.steps);
  elements.turns.textContent = String(state.turns);
}

function mirrorLabel(x, y, key, fixed = false) {
  const prefix = fixed ? "Fixed mirror" : "Live mirror";
  const action = fixed
    ? "This mirror cannot be turned."
    : (state.begun && !state.pulse.outcome
        ? "Activate to turn it before advancing again."
        : "Available after step mode begins.");
  return prefix + ", " + orientationName(state.mirrors[key]) +
    ", column " + (x + 1) + ", row " + (y + 1) + ". " + action;
}

function renderBoard() {
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
      const isMirror = Object.hasOwn(state.mirrors, key);
      const isLive = liveKeys.has(key);
      const tile = document.createElement(isMirror && isLive ? "button" : "div");
      tile.className = "tile";
      tile.dataset.key = key;

      if (isMirror) {
        tile.classList.add("tile--mirror");
        if (!isLive) tile.classList.add("tile--fixed");
        tile.textContent = state.mirrors[key] === "/" ? "╱" : "╲";
        tile.setAttribute("aria-label", mirrorLabel(x, y, key, !isLive));

        if (isLive) {
          tile.type = "button";
          tile.disabled = !state.begun || Boolean(state.pulse.outcome);
          tile.addEventListener("click", () => {
            if (!state.begun || state.pulse.outcome) return;
            state.mirrors = rotateMirror(state.mirrors, x, y);
            state.turns += 1;
            tile.textContent = state.mirrors[key] === "/" ? "╱" : "╲";
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
  for (const tile of tiles.values()) tile.classList.remove("lit", "current");
  for (const position of state.pulse.path) {
    const tile = tiles.get(positionKey(position.x, position.y));
    if (tile) tile.classList.add("lit");
  }
  const current = tiles.get(positionKey(state.pulse.x, state.pulse.y));
  if (current) current.classList.add("current");
}

function syncControls() {
  const finished = Boolean(state.pulse.outcome);
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
  state.mirrors = createMirrorState(LIVE_LEVEL);
  state.pulse = createLivePulse(LIVE_LEVEL);
  state.begun = false;
  state.turns = 0;
  renderBoard();
  updateCounters();
  syncControls();
  setStatus("Begin the run. After that, mirrors can be changed between any two pulse steps.");
}

function begin() {
  state.mirrors = createMirrorState(LIVE_LEVEL);
  state.pulse = createLivePulse(LIVE_LEVEL);
  state.begun = true;
  state.turns = 0;
  renderBoard();
  updateCounters();
  syncControls();
  setStatus("Step mode active. Rotate any live mirror, then choose Advance one cell.");
}

function advance() {
  if (!state.begun || state.pulse.outcome) return;
  state.pulse = advanceLivePulse(LIVE_LEVEL, state.mirrors, state.pulse);
  paintPulse();
  updateCounters();

  if (state.pulse.outcome === "won") {
    setStatus("Relay complete with no reaction-time requirement. ✿", "win");
  } else if (state.pulse.outcome) {
    const outcome = state.pulse.outcome === "timeout"
      ? "The pulse timed out."
      : state.pulse.outcome === "blocked"
        ? "The pulse hit a blocker."
        : "The pulse escaped the board.";
    setStatus(outcome + " Begin a new run and try a different sequence.", "fail");
  } else {
    setStatus("Pulse advanced one cell. Inspect the route, rotate if needed, then advance again.");
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
