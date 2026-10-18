import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

for (const relative of [
  "../spikes/live-routing.mjs",
  "../spikes/double-pass.mjs",
  "../spikes/step-routing.mjs",
  "../evaluate.mjs"
]) {
  test(relative + " parses as JavaScript", () => {
    const target = fileURLToPath(new URL(relative, import.meta.url));
    const result = spawnSync(process.execPath, ["--check", target], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr || result.stdout);
  });
}
