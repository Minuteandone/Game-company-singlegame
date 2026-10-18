import test from "node:test";
import assert from "node:assert/strict";
import { parseSavedRecords } from "../evaluate-storage.mjs";

test("empty or unreadable storage leaves the evidence recorder usable", () => {
  assert.deepEqual(parseSavedRecords(null), { records: [], invalidCount: 0 });
  assert.deepEqual(parseSavedRecords("not JSON"), { records: [], invalidCount: 1 });
  assert.deepEqual(parseSavedRecords("{}"), { records: [], invalidCount: 1 });
  assert.deepEqual(parseSavedRecords("null"), { records: [], invalidCount: 1 });
});

test("malformed array members are skipped without discarding legitimate observations", () => {
  const first = { id: "first", candidate: "double-pass", result: "attempted" };
  const second = { id: "second", candidate: "double-pass-step", result: "completed" };
  const result = parseSavedRecords(JSON.stringify([
    null, false, 123, "bad", [], {}, { id: "" }, first, second
  ]));
  assert.deepEqual(result.records, [first, second]);
  assert.equal(result.invalidCount, 7);
});

test("duplicate IDs are not displayed as separate sessions that delete together", () => {
  const original = { id: "same", result: "attempted" };
  const copied = { id: "same", result: "completed" };
  const { records, invalidCount } = parseSavedRecords(JSON.stringify([original, copied]));
  assert.deepEqual(records, [original]);
  assert.equal(invalidCount, 1);
});

test("partial legacy records with a valid ID survive without inventing observations", () => {
  const partial = { id: "old-record", candidate: "baseline", result: "not recorded" };
  assert.deepEqual(parseSavedRecords(JSON.stringify([partial])), {
    records: [partial], invalidCount: 0
  });
});

test("unknown candidate IDs remain visible for transparent evidence review", () => {
  const legacy = { id: "unknown-candidate", candidate: "__proto__", result: "not recorded" };
  assert.deepEqual(parseSavedRecords(JSON.stringify([legacy])).records, [legacy]);
});
