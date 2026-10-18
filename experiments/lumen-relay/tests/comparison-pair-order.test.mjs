import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

test("matched guide records the anonymous pair and A/B exposure order", async () => {
  const [page, protocol] = await Promise.all([
    readFile(new URL("compare.html", root), "utf8"),
    readFile(new URL("../../../docs/live-routing-evaluation.md", import.meta.url), "utf8")
  ]);

  for (const text of [page, protocol]) {
    assert.match(text, /Other observations/);
    assert.match(text, /Pair 01/);
    assert.match(text, /Sequence A \(timed first\)/);
    assert.match(text, /Sequence B \(step first\)/);
  }
  assert.match(page, /without collecting names/);
  assert.match(protocol, /without recording participants' names/);
  assert.match(page, /Sharing a copied report.*optional/);
});
