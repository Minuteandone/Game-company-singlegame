import {
  LIVE_RELAY_LEVEL,
  initialPulse,
  isLiveMirror,
  positionKey,
  stepPulse
} from "./engine.mjs";

const level = LIVE_RELAY_LEVEL;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const byId = id => document.getElementById(id);
const elements = {
  board: byId("board"),
  launch: byId("launch"),
  reset: byId("reset"),
  status: byId("status"),
  shots: byId("shots"),
  flips: byId("flips"),
  orientation: byId("orientation")
};

const fixedByKey = new Map(level.fixedMirrors.map(mirror => [positionKey(mirror.x, mirror.y), mirror]));
const state = {
  orientation: "\\",
  pulse: initialPulse(level),
  playing: false,
  generation: 0,
  shots: 0,
  flips: 0,
  visited: new Set([positionKey(level.source.x, level.source.y)])
};
let tiles = new Map();
let liveButton = null;

function orientationName(orientation) {
  return orientation === "/" ? "slash" : "backslash";
}

function setStatus(message, kind = "ready") {
  elements.status.textContent = message;
  elements.status.dataset.state = kind;
}

function syncStats() {
  elements.shots.textContent = String(state.shots);
  elements.flips.textContent = String(state.flips);
  elements.orientation.textContent = state.orientation === "/" ? "╱ slash" : "╲ backslash";
  elements.launch.disabled = state.playing;
  if (liveButton) {
    liveButton.textContent = state.orientation === "/" ? "╱" : "╲";
    liveButton.setAttribute(
      "aria-label",
      `Live mirror at column ${level.liveMirror.x + 1}, row ${level.liveMirror.y + 1}; ${orientationName(state.orientation)} orientation. Activate to rotate.`
    );
  }
}

function renderBoard() {
  const fragment = document.createDocumentFragment();
  tiles = new Map();
  liveButton = null;

  for (let y = 0; y < level.height; y += 1) {
    for (let x = 0; x < level.width; x += 1) {
      const key = positionKey(x, y);
      const live = isLiveMirror(level, x, y);
      const tile = document.createElement(live ? "button" : "div");
      tile.className = "tile";
      tile.dataset.key = key;

      if (live) {
        tile.type = "button";
        tile.classList.add("tile--live");
        tile.addEventListener("click", rotateLiveMirror);
        liveButton = tile;
      } else if (x === level.source.x && y === level.source.y) {
        tile.classList.add("tile--source");
        tile.textContent = "◉";
        tile.setAttribute("aria-label", "Pulse source");
      } else if (x === level.goal.x && y === level.goal.y) {
        tile.classList.add("tile--goal");
        tile.textContent = "✿";
        tile.setAttribute("aria-label", "Flower goal");
      } else if (fixedByKey.has(key)) {
        const mirror = fixedByKey.get(key);
        tile.classList.add("tile--fixed");
        tile.textContent = mirror.orientation === "/" ? "╱" : "╲";
        tile.setAttribute("aria-label", `Fixed ${orientationName(mirror.orientation)} mirror`);
      } else {
        tile.setAttribute("aria-hidden", "true");
      }

      tiles.set(key, tile);
      fragment.appendChild(tile);
    }
  }

  elements.board.replaceChildren(fragment);
  syncStats();
  renderPulse();
}

function renderPulse() {
  for (const [key, tile] of tiles) {
    tile.classList.toggle("visited", state.visited.has(key));
    tile.classList.remove("current");
  }

  const current = tiles.get(positionKey(state.pulse.x, state.pulse.y));
  if (current) current.classList.add("current");
}

function rotateLiveMirror() {
  state.orientation = state.orientation === "/" ? "\\" : "/";
  state.flips += 1;
  syncStats();

  if (state.playing) {
    setStatus("Mirror flipped while the pulse is moving. Watch its next arrival.", "live");
  } else {
    setStatus("Mirror rotated. Launch when you are ready.");
  }
}

function wait(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function launch() {
  if (state.playing) return;

  state.playing = true;
  state.shots += 1;
  state.pulse = initialPulse(level);
  state.visited = new Set([positionKey(state.pulse.x, state.pulse.y)]);
  const generation = ++state.generation;
  syncStats();
  renderPulse();
  setStatus("Pulse launched. The gold mirror stays live during flight.", "live");

  while (state.playing && generation === state.generation) {
    await wait(reducedMotion ? 440 : 320);
    if (generation !== state.generation) return;

    state.pulse = stepPulse(level, state.pulse, state.orientation);
    state.visited.add(positionKey(state.pulse.x, state.pulse.y));
    renderPulse();

    if (state.pulse.outcome !== "moving") {
      state.playing = false;
      syncStats();

      if (state.pulse.outcome === "won") {
        setStatus("Signal delivered! You changed the route while it was alive. ✿", "win");
      } else if (state.pulse.outcome === "blocked") {
        setStatus("The pulse hit a blocker. Reset and try another sequence.", "fail");
      } else {
        setStatus("The pulse escaped. One mirror angle cannot serve both visits.", "fail");
      }
    }
  }
}

function reset() {
  state.generation += 1;
  state.orientation = "\\";
  state.pulse = initialPulse(level);
  state.playing = false;
  state.shots = 0;
  state.flips = 0;
  state.visited = new Set([positionKey(state.pulse.x, state.pulse.y)]);
  syncStats();
  renderPulse();
  setStatus("The gold mirror is visited twice. Can one pulse use both angles?");
}

elements.launch.addEventListener("click", () => void launch());
elements.reset.addEventListener("click", reset);

document.addEventListener("keydown", event => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
  const activeIsButton = document.activeElement?.tagName === "BUTTON";

  if (event.code === "Space" && !activeIsButton) {
    event.preventDefault();
    rotateLiveMirror();
  } else if (event.code === "KeyP") {
    event.preventDefault();
    void launch();
  } else if (event.code === "KeyR") {
    event.preventDefault();
    reset();
  }
});

renderBoard();
reset();
