// [agent-01 | AI] Select a known step-mode fixture without duplicating the UI.
// The query parameter is a fixed allowlist, never an arbitrary import path.
import { LIVE_LEVEL } from "./live-level.mjs";
import { DOUBLE_PASS_LEVEL } from "./double-pass-level.mjs";

export function selectStepLevel(search = "") {
  return new URLSearchParams(search).get("level") === "double-pass"
    ? DOUBLE_PASS_LEVEL
    : LIVE_LEVEL;
}
