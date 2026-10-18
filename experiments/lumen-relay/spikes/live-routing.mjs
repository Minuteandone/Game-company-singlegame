import { createMirrorState, positionKey, rotateMirror } from "../src/engine.mjs";
import { advanceLivePulse, createLivePulse } from "./live-engine.mjs";
import { LIVE_LEVEL } from "./live-level.mjs";

const byId = id => document.getElementById(id);
const elements = {
  board: byId("board"),
  launch: byId("launch"),
  reset: byId("reset"),
  hint: byId("hint"),
  status: byId("status"),
  steps: byId("steps"),
  turns: byId("turns")
};

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const tickMs = reducedMotion ? 700 : 560;
const liveKeys = new Set(LIVE_LEVEL.liveMirrorKeys);
const state = {
  mirrors: createMirrorState(LIVE_LEVEL),
  pulse: createLivePulse(LIVE_LEVEL),
  running: false,
  turns: 0,
  generation: 0
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
    : (state.running ? "Activate to turn it before the pulse arrives." : "Locked until launch.");
  return prefix + ", " + orientationName(state.mirrors[key]) +
    ", column " + (x + 1) + ", row " + (y + 1) + ". " + action;
}

function renderBoard() {
  const level = LIVE_LEVEL;
  const sourceKey = positionKey(level.source.x, level.source.y);
  const goalKey = positionKey(level.goal.x, level.goal.y);
  const fragment = document.createDocumentFragment();
  tiles = new Map();

  elements.board.style.gridTemplateColumns = "repeat(" + level.width + ", minmax(0, 1fr))";
  elements.board.style.gridTemplateRows = "repeat(" + level.height + ", minmax(0, 1fr))";
  elements.board.style.aspectRatio = level.width + " / " + level.height;

  for (let y = 0; y < level.height; y += 1) {
    for (let x = 0; x < level.width; x += 1) {
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
          tile.disabled = !state.running || Boolean(state.pulse.outcome);
          tile.addEventListener("click", () => {
            if (!state.running || state.pulse.outcome) return;
            state.mirrors = rotateMirror(state.mirrors, x, y);
            state.turns += 1;
            tile.textContent = state.mirrors[key] === "/" ? "╱" : "╲";
            tile.setAttribute("aria-label", mirrorLabel(x, y, key));
            updateCounters();
            setStatus("Mirror turned mid-flight. The next pulse step will use its new orientation.");
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
  elements.launch.disabled = state.running;
  elements.launch.textContent = state.running
    ? "Pulse in flight…"
    : (state.pulse.outcome ? "➜ Retry live relay" : "➜ Launch pulse");

  for (const [key, tile] of tiles) {
    if (tile.tagName === "BUTTON") {
      tile.disabled = !state.running || Boolean(state.pulse.outcome);
      const [x, y] = key.split(",").map(Number);
      tile.setAttribute("aria-label", mirrorLabel(x, y, key));
    }
  }
}

function resetExperiment() {
  state.generation += 1;
  state.mirrors = createMirrorState(LIVE_LEVEL);
  state.pulse = createLivePulse(LIVE_LEVEL);
  state.running = false;
  state.turns = 0;
  renderBoard();
  updateCounters();
  syncControls();
  setStatus("Mirrors are locked until launch. Start the pulse, then react.");
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function launch() {
  if (state.running) return;

  state.generation += 1;
  const generation = state.generation;
  state.mirrors = createMirrorState(LIVE_LEVEL);
  state.pulse = createLivePulse(LIVE_LEVEL);
  state.running = true;
  state.turns = 0;
  renderBoard();
  updateCounters();
  syncControls();
  setStatus("Pulse launched. Turn the highlighted mirrors before the light reaches them.");

  while (!state.pulse.outcome && generation === state.generation) {
    await wait(tickMs);
    if (generation !== state.generation) return;
    state.pulse = advanceLivePulse(LIVE_LEVEL, state.mirrors, state.pulse);
    paintPulse();
    updateCounters();
  }

  if (generation !== state.generation) return;
  state.running = false;

  if (state.pulse.outcome === "won") {
    setStatus("Relay complete! The moving pulse depended on your mid-flight mirror changes. ✿", "win");
  } else {
    const message = state.pulse.outcome === "blocked"
      ? "The pulse hit a blocker."
      : state.pulse.outcome === "timeout"
        ? "The pulse timed out."
        : "The pulse escaped. A mirror missed its timing window.";
    setStatus(message + " Retry and watch which mirror the light is approaching.", "fail");
  }

  syncControls();
}

elements.launch.addEventListener("click", () => void launch());
elements.reset.addEventListener("click", resetExperiment);
elements.hint.addEventListener("click", () => setStatus(LIVE_LEVEL.hint));
document.addEventListener("keydown", event => {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key.toLowerCase() === "p") void launch();
  if (event.key.toLowerCase() === "r") resetExperiment();
});

resetExperiment();
