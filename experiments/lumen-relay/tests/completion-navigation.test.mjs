import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const gameHTML = readFileSync(new URL("./index.html", root), "utf8");
const gameJS = readFileSync(new URL("./src/main.mjs", root), "utf8");
const modeHTML = readFileSync(new URL("./modes.html", root), "utf8");

test("baseline exposes the shared mode launcher before and after play", () => {
  assert.match(gameHTML, /href="\.\/modes\.html">Explore all five game modes/);
  assert.match(
    gameHTML,
    /<a id="explore-after-win"[^>]*href="\.\/modes\.html" hidden>Explore live and step modes/
  );
  assert.match(modeHTML, /href="\.\/index\.html"/);
});

test("finish-line mode link is controlled by final-level win state", () => {
  assert.match(gameJS, /explore: byId\("explore-after-win"\)/);
  assert.match(
    gameJS,
    /elements\.explore\.hidden = !\(state\.won && state\.levelIndex === LEVELS\.length - 1\)/
  );
  assert.match(gameJS, /elements\.undo\.disabled = state\.playing \|\| state\.won/);
});
