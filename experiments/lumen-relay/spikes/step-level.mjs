import { LIVE_LEVEL } from "./live-level.mjs";
import { DOUBLE_PASS_LEVEL } from "./double-pass-level.mjs";

/** Explicit opt-in to Double Pass; preserve Relay Window as the default. */
export function selectStepLevel(search = "") {
  const query = new URLSearchParams(search);
  return query.get("level") === "double-pass" ? DOUBLE_PASS_LEVEL : LIVE_LEVEL;
}
