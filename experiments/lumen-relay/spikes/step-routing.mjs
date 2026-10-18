import { createMirrorState, positionKey, rotateMirror } from "../src/engine.mjs";
import { advanceLivePulse, createLivePulse } from "./live-engine.mjs";
import { DOUBLE_PASS_LEVEL } from "./double-pass-level.mjs";
import { selectStepLevel } from "./step-level-choice.mjs";
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
  passes: byId("passes")
};

const ACTIVE_LEVEL = selectStepLevel(window.location.search);
const IS_DOUBLE_PASS = ACTIVE_LEVEL === DOUBLE_PASS_LEVEL;
const liveKeys = new Set(ACTIVE_LEVEL.liveMirrorKeys);
const sessionEngine = Object.freeze({
  initialPulse: createLivePulse,
  stepPulse: (level, pulse, mirrors) => advanceLivePulse(level, mirrors, pulse)
});
let session = createStepSession(
  ACTIVE_LEVEL,
  sessionEngine,
  createMirrorState(ACTIVE_LEVEL)
);

const state = {
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

function countLiveVisits(pulse) {
  return pulse.path.filter(({ x, y }) => liveKeys.has(positionKey(x, y))).length;
}

function updateCounters() {
  elements.steps.textContent = String(session.snapshot.steps);
  elements.turns.textContent = String(state.turns);
  elements.passes.textContent = String(countLiveVisits(session.snapshot.pulse));
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
  const sourceKey = positionKey(ACTIVE_LEVEL.source.x, ACTIVE_LEVEL.source.y);
  const goalKey = positionKey(ACTIVE_LEVEL.goal.x, ACTIVE_LEVEL.goal.y);
  const fragment = document.createDocumentFragment();
  tiles = new Map();

  elements.board.style.gridTemplateColumns =
    "repeat(" + ACTIVE_LEVEL.width + ", minmax(0, 1fr))";
  elements.board.style.gridTemplateRows =
    "repeat(" + ACTIVE_LEVEL.height + ", minmax(0, 1fr))";
  elements.board.style.aspectRatio = ACTIVE_LEVEL.width + " / " + ACTIVE_LEVEL.height;

  for (let y = 0; y < ACTIVE_LEVEL.height; y += 1) {
    for (let x = 0; x < ACTIVE_LEVEL.width; x += 1) {
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
  session.reset(createMirrorState(ACTIVE_LEVEL));
  state.begun = false;
  state.turns = 0;
  renderBoard();
  updateCounters();
  syncControls();
  setStatus(IS_DOUBLE_PASS
    ? "The gold mirror begins correct for pass one. Advance through it, then flip it before the return."
    : "Begin the run. After that, mirrors can be changed between any two pulse steps.");
}

function begin() {
  session.reset(createMirrorState(ACTIVE_LEVEL));
  state.begun = true;
  state.turns = 0;
  renderBoard();
  updateCounters();
  syncControls();
  setStatus(IS_DOUBLE_PASS
    ? "Double Pass started. Advance through the gold mirror once before rotating it."
    : "Step mode active. Rotate any live mirror, then choose Advance one cell.");
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
  } else if (IS_DOUBLE_PASS &&
             countLiveVisits(snapshot.pulse) === 1 &&
             countLiveVisits(before.pulse) === 0) {
    setStatus("First pass complete! Flip the gold mirror to backslash before the light returns.");
  } else {
    setStatus("Pulse at column " + (snapshot.pulse.x + 1) +
      ", row " + (snapshot.pulse.y + 1) +
      ". Inspect the route, rotate if needed, then advance again.");
  }

  syncControls();
}

elements.begin.addEventListener("click", begin);
elements.advance.addEventListener("click", advance);
elements.reset.addEventListener("click", reset);
elements.hint.addEventListener("click", () => setStatus(ACTIVE_LEVEL.hint));

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

function configureMode() {
  if (!IS_DOUBLE_PASS) return;
  document.title = "Lumen Relay — Double Pass Step Mode";
  byId("heading-first").textContent = "Double";
  byId("heading-second").textContent = "Step.";
  byId("mode-intro").textContent =
    "The exact Double Pass puzzle, without a clock. Advance one cell at a time. " +
    "The gold mirror must face slash on its first visit and backslash on its second.";
  byId("mode-chapter").textContent = "CONTROL TEST 02";
  byId("mode-subtitle").textContent =
    "One mirror, two jobs. Make the between-visits change at your own pace.";
  byId("mode-switch").textContent = "Try Relay Window in step mode";
  byId("mode-switch").href = "./step-routing.html";
  byId("live-counterpart").textContent = "Try real-time Double Pass";
  byId("live-counterpart").href = "./double-pass.html";
  byId("live-counterpart").setAttribute("aria-label", "Play real-time Double Pass");
  elements.board.setAttribute("aria-label", "Player-paced Double Pass routing board");
  byId("passes-wrap").hidden = false;
}

configureMode();
reset();
