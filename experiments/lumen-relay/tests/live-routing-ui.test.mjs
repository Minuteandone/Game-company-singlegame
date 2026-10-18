import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("live-routing browser module parses as JavaScript", () => {
  const target = fileURLToPath(new URL("../spikes/live-routing.mjs", import.meta.url));
  const result = spawnSync(process.execPath, ["--check", target], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
