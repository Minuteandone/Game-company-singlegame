import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function source(relative) {
  return readFileSync(new URL(relative, import.meta.url), "utf8");
}

function count(text, needle) {
  return text.split(needle).length - 1;
}

test("baseline exposes meaningful static tiles and hides empty cells", () => {
  const code = source("../src/main.mjs");

  assert.equal(
    count(code, 'tile.setAttribute("role", "img");'),
    3,
    "source, goal, and wall should have explicit static semantics"
  );
  assert.match(code, /tile\.setAttribute\("aria-hidden", "true"\);/);
  assert.doesNotMatch(code, /aria-label"\s*,\s*cellLabel\(x, y, "Empty cell"\)/);
});

for (const relative of [
  "../spikes/live-routing.mjs",
  "../spikes/double-pass.mjs",
  "../spikes/step-routing.mjs"
]) {
  test(relative + " exposes fixed mirrors, source, and goal semantically", () => {
    const code = source(relative);
    assert.equal(
      count(code, 'tile.setAttribute("role", "img");'),
      3,
      "fixed mirror, source, and goal should have explicit static semantics"
    );
  });
}
