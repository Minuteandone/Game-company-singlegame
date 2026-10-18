import { createMirrorState, positionKey, rotateMirror } from "../src/engine.mjs";
import { advanceLivePulse, createLivePulse } from "./live-engine.mjs";
import { DOUBLE_PASS_LEVEL } from "./double-pass-level.mjs";

const byId = id => document.getElementById(id);
const elements = {
  board: byId("board"),
  launch: byId("launch"),
  reset: byId("reset"),
  hint: byId("hint"),
  status: byId("status"),
  steps: byId("steps"),
  turns: byId("turns"),
  passes: byId("passes")
};

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const tickMs = reducedMotion ? 700 : 560;
const liveKeys = new Set(DOUBLE_PASS_LEVEL.liveMirrorKeys);

const state = {
  mirrors: createMirrorState(DOUBLE_PASS_LEVEL),
  pulse: createLivePulse(DOUBLE_PASS_LEVEL),
  running: false,
  turns: 0,
  passes: 0,
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
  elements.passes.textContent = String(state.passes);
}

function mirrorLabel(x, y, key, fixed = false) {
  const prefix = fixed ? "Fixed mirror" : "Live mirror";
  const action = fixed
    ? "This mirror cannot be turned."
    : (state.running ? "Activate to rotate it." : "Locked until launch.");
  return prefix + ", " + orientationName(state.mirrors[key]) +
    ", column " + (x + 1) + ", row " + (y + 1) + ". " + action;
}

function renderBoard() {
  const level = DOUBLE_PASS_LEVEL;
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
        if (isLive) tile.classList.add("tile--live");
        else tile.classList.add("tile--fixed");

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
            setStatus("Gold mirror changed. The next arrival will use its new orientation.");
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
    : (state.pulse.outcome ? "➜ Retry Double Pass" : "➜ Launch pulse");

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
  state.mirrors = createMirrorState(DOUBLE_PASS_LEVEL);
  state.pulse = createLivePulse(DOUBLE_PASS_LEVEL);
  state.running = false;
  state.turns = 0;
  state.passes = 0;
  renderBoard();
  updateCounters();
  syncControls();
  setStatus("The gold mirror starts correct for pass one. Launch, wait for the first pass, then flip it.");
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function launch() {
  if (state.running) return;

  state.generation += 1;
  const generation = state.generation;
  state.mirrors = createMirrorState(DOUBLE_PASS_LEVEL);
  state.pulse = createLivePulse(DOUBLE_PASS_LEVEL);
  state.running = true;
  state.turns = 0;
  state.passes = 0;

  renderBoard();
  updateCounters();
  syncControls();
  setStatus("Pulse launched. Do not flip yet — let it clear the gold mirror once.");

  while (!state.pulse.outcome && generation === state.generation) {
    await wait(tickMs);
    if (generation !== state.generation) return;

    state.pulse = advanceLivePulse(DOUBLE_PASS_LEVEL, state.mirrors, state.pulse);

    if (liveKeys.has(positionKey(state.pulse.x, state.pulse.y))) {
      state.passes += 1;
      if (state.passes === 1) {
        setStatus("First pass complete. Now flip the gold mirror before the pulse comes back!");
      }
    }

    paintPulse();
    updateCounters();
  }

  if (generation !== state.generation) return;
  state.running = false;

  if (state.pulse.outcome === "won") {
    setStatus("Double relay complete! The same mirror served two different arrivals. ✿", "win");
  } else {
    setStatus(
      state.passes === 0
        ? "The route failed before the live mirror."
        : state.passes === 1
          ? "The pulse escaped. The mirror was wrong for one of its visits."
          : "The second arrival already chose its direction. That flip was too late.",
      "fail"
    );
  }

  syncControls();
}

elements.launch.addEventListener("click", () => void launch());
elements.reset.addEventListener("click", resetExperiment);
elements.hint.addEventListener("click", () => setStatus(DOUBLE_PASS_LEVEL.hint));

document.addEventListener("keydown", event => {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key.toLowerCase() === "p") void launch();
  if (event.key.toLowerCase() === "r") resetExperiment();
});

resetExperiment();
