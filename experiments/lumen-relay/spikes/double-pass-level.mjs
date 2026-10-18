export const DOUBLE_PASS_LEVEL = {
  id: "double-pass",
  name: "Double Pass",
  subtitle: "One mirror. Two arrivals. Flip it between them.",
  width: 7,
  height: 5,
  source: { x: 2, y: 3, dir: "E" },
  goal: { x: 0, y: 3 },
  mirrors: [
    // This is the only live mirror. It must be "/" on the first arrival
    // and "\" on the second arrival.
    { x: 4, y: 3, orientation: "/" },

    // Fixed relay loop.
    { x: 4, y: 1, orientation: "/" },
    { x: 6, y: 1, orientation: "\" },
    { x: 6, y: 4, orientation: "/" },
    { x: 4, y: 4, orientation: "\" }
  ],
  walls: [],
  maxLiveSteps: 48,
  liveMirrorKeys: ["4,3"],
  hint: "Let the pulse clear the gold mirror once. Then change that same mirror before the light loops back."
};
