import { LEVELS } from "./levels.mjs";
import { createMirrorState, positionKey, tracePulse } from "./engine.mjs";
import { applyTurn, undoTurn } from "./turn-history.mjs";

const byId = id => document.getElementById(id);
const elements = {
  board: byId("board"), chapter: byId("chapter"),
  title: byId("level-title"), subtitle: byId("level-subtitle"),
  shots: byId("shots"), turns: byId("turns"), fire: byId("fire"),
  reset: byId("reset"), undo: byId("undo"), hint: byId("hint"), next: byId("next"),
  explore: byId("explore-after-win"),
  status: byId("status"), sound: byId("sound")
};
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const AudioContextClass = window.AudioContext || window.webkitAudioContext;
const state = {
  levelIndex: 0, mirrors: {}, shots: 0, turns: 0,
  playing: false, won: false, soundOn: false,
  history: [],
  audioContext: null, generation: 0
};
let tiles = new Map();

function currentLevel() { return LEVELS[state.levelIndex]; }
function setStatus(message, kind = "ready") {
  elements.status.textContent = message;
  elements.status.dataset.state = kind;
}
function displayCounters() {
  elements.shots.textContent = String(state.shots);
  elements.turns.textContent = String(state.turns);
}
function syncControls() {
  elements.fire.disabled = state.playing || state.won;
  elements.undo.disabled = state.playing || state.won || state.history.length === 0;
  elements.fire.textContent = state.playing ? "Pulse travelling…" : "➜ Send pulse";
  elements.next.hidden = !state.won;
  elements.explore.hidden = !(state.won && state.levelIndex === LEVELS.length - 1);
  elements.next.textContent = state.levelIndex === LEVELS.length - 1
    ? "Play again ↺" : "Next puzzle →";
  for (const tile of tiles.values()) {
    if (tile.tagName === "BUTTON") tile.disabled = state.playing || state.won;
  }
}
function cellLabel(x, y, contents) {
  return contents + " at column " + (x + 1) + ", row " + (y + 1);
}
function mirrorOrientation(orientation) {
  return orientation === "/" ? "slash" : "backslash";
}
function mirrorLabel(x, y, orientation) {
  return cellLabel(x, y, "Rotatable mirror, " + mirrorOrientation(orientation) + " orientation") +
    ". Activate to turn it.";
}
function renderBoard() {
  const level = currentLevel();
  const wallKeys = new Set(level.walls.map(({ x, y }) => positionKey(x, y)));
  const sourceKey = positionKey(level.source.x, level.source.y);
  const goalKey = positionKey(level.goal.x, level.goal.y);
  const fragment = document.createDocumentFragment();
  tiles = new Map();

  elements.board.style.gridTemplateColumns =
    "repeat(" + level.width + ", minmax(0, 1fr))";
  elements.board.style.gridTemplateRows =
    "repeat(" + level.height + ", minmax(0, 1fr))";
  elements.board.style.aspectRatio = level.width + " / " + level.height;

  for (let y = 0; y < level.height; y += 1) {
    for (let x = 0; x < level.width; x += 1) {
      const key = positionKey(x, y);
      const isMirror = Object.hasOwn(state.mirrors, key);
      const tile = document.createElement(isMirror ? "button" : "div");
      tile.className = "tile";
      tile.dataset.key = key;
      if (isMirror) {
        tile.type = "button";
        tile.classList.add("tile--mirror");
        tile.textContent = state.mirrors[key] === "/" ? "╱" : "╲";
        tile.setAttribute("aria-label", mirrorLabel(x, y, state.mirrors[key]));
        tile.addEventListener("click", () => {
          if (state.playing || state.won) return;
          const turn = applyTurn(state.mirrors, state.history, x, y);
          if (!turn.turned) return;
          state.mirrors = turn.mirrors;
          state.history = turn.history;
          state.turns = state.history.length;
          tile.textContent = state.mirrors[key] === "/" ? "╱" : "╲";
          tile.setAttribute("aria-label", mirrorLabel(x, y, state.mirrors[key]));
          clearGlow();
          displayCounters();
          syncControls();
          setStatus(cellLabel(x, y, "Mirror turned to " + mirrorOrientation(state.mirrors[key])) + ". Send a pulse to test the route.");
          chirp(500);
        });
      } else if (key === sourceKey) {
        tile.classList.add("tile--source");
        tile.textContent = "◉";
        tile.setAttribute("role", "img");
        tile.setAttribute("aria-label", cellLabel(x, y, "Pulse sender"));
      } else if (key === goalKey) {
        tile.classList.add("tile--goal");
        tile.textContent = "✿";
        tile.setAttribute("role", "img");
        tile.setAttribute("aria-label", cellLabel(x, y, "Sleeping flower"));
      } else if (wallKeys.has(key)) {
        tile.classList.add("tile--wall");
        tile.textContent = "■";
        tile.setAttribute("role", "img");
        tile.setAttribute("aria-label", cellLabel(x, y, "Blocking stone"));
      } else {
        tile.setAttribute("aria-hidden", "true");
      }
      tiles.set(key, tile);
      fragment.appendChild(tile);
    }
  }
  elements.board.replaceChildren(fragment);
}
function clearGlow() {
  for (const tile of tiles.values()) tile.classList.remove("lit", "current");
}
function wait(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}
function chirp(frequency = 350, duration = 0.09) {
  if (!state.soundOn || !AudioContextClass) return;
  try {
    const context = state.audioContext ?? (state.audioContext = new AudioContextClass());
    if (context.state === "suspended") void context.resume();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.07, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  } catch {
    state.soundOn = false;
    elements.sound.textContent = "♪ Sound unavailable";
    elements.sound.setAttribute("aria-pressed", "false");
  }
}
function resetLevel() {
  state.generation += 1;
  state.mirrors = createMirrorState(currentLevel());
  state.shots = 0;
  state.turns = 0;
  state.history = [];
  state.playing = false;
  state.won = false;
  renderBoard();
  displayCounters();
  syncControls();
  setStatus("Click a mirror to rotate it, then send a pulse.");
}
function undoLastTurn() {
  if (state.playing || state.won || state.history.length === 0) return;
  const result = undoTurn(state.mirrors, state.history);
  const { x, y } = result.undone;
  state.mirrors = result.mirrors;
  state.history = result.history;
  state.turns = state.history.length;
  const key = positionKey(x, y);
  const tile = tiles.get(key);
  if (tile) {
    tile.textContent = state.mirrors[key] === "/" ? "╱" : "╲";
    tile.setAttribute("aria-label", mirrorLabel(x, y, state.mirrors[key]));
  }
  clearGlow();
  displayCounters();
  syncControls();
  setStatus(cellLabel(x, y, "Last turn undone; mirror restored to " +
    mirrorOrientation(state.mirrors[key])) + ". Send a pulse when ready.");
  chirp(390);
}
function loadLevel(index) {
  state.levelIndex = index;
  const level = currentLevel();
  elements.chapter.textContent = "PUZZLE " + String(index + 1).padStart(2, "0") +
    " / " + String(LEVELS.length).padStart(2, "0");
  elements.title.textContent = level.name;
  elements.subtitle.textContent = level.subtitle;
  resetLevel();
}
async function sendPulse() {
  if (state.playing || state.won) return;
  state.playing = true;
  state.shots += 1;
  const generation = ++state.generation;
  const result = tracePulse(currentLevel(), state.mirrors);
  clearGlow();
  displayCounters();
  syncControls();
  setStatus("Your signal is making its way across the garden…");
  let previousTile = null;
  for (const [index, position] of result.path.entries()) {
    if (generation !== state.generation) return;
    if (previousTile) previousTile.classList.remove("current");
    const key = positionKey(position.x, position.y);
    const tile = tiles.get(key);
    if (tile) {
      tile.classList.add("lit", "current");
      previousTile = tile;
    }
    if (index === 0 || Object.hasOwn(state.mirrors, key) || index === result.path.length - 1) {
      chirp(300 + index * 35, 0.075);
    }
    await wait(reducedMotion ? 22 : 122);
  }
  if (generation !== state.generation) return;
  if (previousTile) previousTile.classList.remove("current");
  state.playing = false;
  if (result.outcome === "won") {
    state.won = true;
    chirp(720, 0.3);
    const last = state.levelIndex === LEVELS.length - 1;
    setStatus(last
      ? "All three flowers are awake! The garden is glowing. ✿"
      : "The flower is awake! ✿ Beautifully routed.", "win");
  } else {
    const messages = {
      escaped: "The pulse drifted beyond the garden. Adjust a mirror and try again.",
      blocked: "A stone absorbed the light. Try another angle.",
      loop: "The light is travelling in circles. Break the loop with a turn."
    };
    setStatus(messages[result.outcome] ?? "Try adjusting the mirrors.", "fail");
  }
  syncControls();
}
elements.fire.addEventListener("click", sendPulse);
elements.reset.addEventListener("click", resetLevel);
elements.undo.addEventListener("click", undoLastTurn);
elements.next.addEventListener("click", () => {
  loadLevel(state.levelIndex === LEVELS.length - 1 ? 0 : state.levelIndex + 1);
});
elements.hint.addEventListener("click", () => setStatus(currentLevel().hint));
elements.sound.addEventListener("click", () => {
  state.soundOn = !state.soundOn;
  elements.sound.textContent = state.soundOn ? "♫ Sound on" : "♪ Sound off";
  elements.sound.setAttribute("aria-pressed", String(state.soundOn));
  if (state.soundOn) chirp(560);
});
document.addEventListener("keydown", event => {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key.toLowerCase() === "r") resetLevel();
  if (event.key.toLowerCase() === "u" && !event.repeat) undoLastTurn();
  if (event.key.toLowerCase() === "p") void sendPulse();
});
loadLevel(0);
