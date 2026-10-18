import { createMirrorState, positionKey, rotateMirror } from "../src/engine.mjs";
import { advanceLivePulse, createLivePulse } from "./live-engine.mjs";
import { DOUBLE_PASS_LEVEL } from "./double-pass-level.mjs";
import { createStepSession } from "./step-session.mjs";

const level = DOUBLE_PASS_LEVEL;
const liveKeys = new Set(level.liveMirrorKeys);
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
  visits: byId("visits")
};

const engine = Object.freeze({
  initialPulse: createLivePulse,
  stepPulse: (currentLevel, pulse, mirrors) =>
    advanceLivePulse(currentLevel, mirrors, pulse)
});
const session = createStepSession(level, engine, createMirrorState(level));
const state = { begun: false, turns: 0 };
let tiles = new Map();

const directionName = Object.freeze({ N: "north", E: "east", S: "south", W: "west" });
const orientationName = orientation =>
  orientation === "/" ? "slash" : "backslash";

function current() {
  return session.snapshot;
}

function visitsToLiveMirror(pulse) {
  return pulse.path.filter(({ x, y }) => liveKeys.has(positionKey(x, y))).length;
}

function setStatus(message, kind = "ready") {
  elements.status.textContent = message;
  elements.status.dataset.state = kind;
}

function mirrorLabel(x, y, key, fixed = false) {
  const snapshot = current();
  const action = fixed
    ? "Fixed; cannot be rotated."
    : (!state.begun
        ? "Begin step mode to rotate it."
        : snapshot.pulse.outcome
          ? "Run ended. Begin a new run to rotate it."
          : "Activate to rotate between pulse steps.");
  return (fixed ? "Fixed mirror" : "Gold live mirror") +
    ", " + orientationName(snapshot.mirrors[key]) + " orientation" +
    ", column " + (x + 1) + ", row " + (y + 1) + ". " + action;
}

function paintPulse() {
  const pulse = current().pulse;
  for (const tile of tiles.values()) {
    tile.classList.remove("lit", "current");
  }
  for (const position of pulse.path) {
    const tile = tiles.get(positionKey(position.x, position.y));
    if (tile) tile.classList.add("lit");
  }
  const occupied = tiles.get(positionKey(pulse.x, pulse.y));
  if (occupied) occupied.classList.add("current");
}

function updateCounters() {
  const snapshot = current();
  elements.steps.textContent = String(snapshot.steps);
  elements.turns.textContent = String(state.turns);
  elements.visits.textContent = String(visitsToLiveMirror(snapshot.pulse));
}

function syncControls() {
  const snapshot = current();
  const complete = Boolean(snapshot.pulse.outcome);
  elements.begin.disabled = state.begun && !complete;
  elements.begin.textContent = complete ? "Begin new run" : "Begin step mode";
  elements.advance.disabled = !state.begun || complete;

  for (const [key, tile] of tiles) {
    if (tile.tagName !== "BUTTON") continue;
    tile.disabled = !state.begun || complete;
    const [x, y] = key.split(",").map(Number);
    tile.setAttribute("aria-label", mirrorLabel(x, y, key));
  }
}

function rotateLiveMirror(x, y) {
  const before = current();
  if (!state.begun || before.pulse.outcome) return;

  session.rotate(rotateMirror(before.mirrors, x, y));
  state.turns += 1;
  const key = positionKey(x, y);
  const after = current();
  const tile = tiles.get(key);
  tile.textContent = after.mirrors[key] === "/" ? "╱" : "╲";
  updateCounters();
  syncControls();

  const passed = visitsToLiveMirror(after.pulse);
  setStatus(
    "Gold mirror is now " + orientationName(after.mirrors[key]) +
    ". The pulse stays at its current cell. " +
    (passed === 0
      ? "Its first visit is still ahead."
      : "Its first visit is complete; the next arrival uses this orientation.")
  );
}

function renderBoard() {
  const snapshot = current();
  const sourceKey = positionKey(level.source.x, level.source.y);
  const goalKey = positionKey(level.goal.x, level.goal.y);
  const fragment = document.createDocumentFragment();
  tiles = new Map();

  elements.board.style.gridTemplateColumns =
    "repeat(" + level.width + ", minmax(0, 1fr))";
  elements.board.style.gridTemplateRows =
    "repeat(" + level.height + ", minmax(0, 1fr))";
  elements.board.style.aspectRatio = level.width + " / " + level.height;

  for (let y = 0; y < level.height; y++) {
    for (let x = 0; x < level.width; x++) {
      const key = positionKey(x, y);
      const isMirror = Object.hasOwn(snapshot.mirrors, key);
      const live = liveKeys.has(key);
      const tile = document.createElement(live ? "button" : "div");
      tile.className = "tile";
      tile.dataset.key = key;

      if (isMirror) {
        tile.classList.add("tile--mirror");
        tile.classList.add(live ? "tile--live" : "tile--fixed");
        tile.textContent = snapshot.mirrors[key] === "/" ? "╱" : "╲";
        tile.setAttribute("aria-label", mirrorLabel(x, y, key, !live));
        if (live) {
          tile.type = "button";
          tile.disabled = !state.begun || Boolean(snapshot.pulse.outcome);
          tile.addEventListener("click", () => rotateLiveMirror(x, y));
        } else {
          tile.setAttribute("role", "img");
        }
      } else if (key === sourceKey) {
        tile.classList.add("tile--source");
        tile.textContent = "◉";
        tile.setAttribute("role", "img");
        tile.setAttribute("aria-label", "Pulse sender, column " + (x + 1) +
          ", row " + (y + 1));
      } else if (key === goalKey) {
        tile.classList.add("tile--goal");
        tile.textContent = "✿";
        tile.setAttribute("role", "img");
        tile.setAttribute("aria-label", "Flower goal, column " + (x + 1) +
          ", row " + (y + 1));
      } else {
        tile.setAttribute("aria-hidden", "true");
      }

      tiles.set(key, tile);
      fragment.appendChild(tile);
    }
  }

  elements.board.replaceChildren(fragment);
  paintPulse();
}

function reset() {
  session.reset(createMirrorState(level));
  state.begun = false;
  state.turns = 0;
  renderBoard();
  updateCounters();
  syncControls();
  setStatus("Choose Begin, then advance the light at your own pace. There is no timer.");
}

function begin() {
  session.reset(createMirrorState(level));
  state.begun = true;
  state.turns = 0;
  renderBoard();
  updateCounters();
  syncControls();
  setStatus("Run begun. Advance one cell, or rotate the gold mirror between steps.");
}

function describePosition(pulse) {
  return "Pulse at column " + (pulse.x + 1) + ", row " + (pulse.y + 1) +
    ", heading " + (directionName[pulse.dir] || "unknown") + ".";
}

function advance() {
  const before = current();
  if (!state.begun || before.pulse.outcome) return;

  const snapshot = session.advance();
  paintPulse();
  updateCounters();
  syncControls();

  const pulse = snapshot.pulse;
  if (pulse.outcome === "won") {
    setStatus("Double Pass complete! Both mirror visits worked, without a timer. ✿", "win");
  } else if (pulse.outcome) {
    const cause = pulse.outcome === "blocked"
      ? "The pulse hit a blocker."
      : pulse.outcome === "timeout"
        ? "The pulse exhausted its step limit."
        : "The pulse escaped the board.";
    setStatus(cause + " Begin a new run to try another sequence.", "fail");
  } else {
    const visits = visitsToLiveMirror(pulse);
    const onLiveMirror = liveKeys.has(positionKey(pulse.x, pulse.y));
    if (onLiveMirror && visits === 1) {
      setStatus("First mirror visit complete. " + describePosition(pulse) +
        " You may change the gold mirror before the pulse returns.");
    } else if (onLiveMirror && visits === 2) {
      setStatus("Second mirror visit complete. " + describePosition(pulse) +
        " Its direction is already chosen; keep advancing.");
    } else {
      setStatus(describePosition(pulse) +
        " Rotate a live mirror if needed, then advance when ready.");
    }
  }
}

elements.begin.addEventListener("click", begin);
elements.advance.addEventListener("click", advance);
elements.reset.addEventListener("click", reset);
elements.hint.addEventListener("click", () => setStatus(level.hint));

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
