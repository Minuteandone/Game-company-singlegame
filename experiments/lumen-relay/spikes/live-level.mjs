export const LIVE_LEVEL = {
  id: "relay-window",
  name: "Relay Window",
  subtitle: "The mirrors wake only after launch. Turn the route before the light arrives.",
  width: 7,
  height: 6,
  source: { x: 0, y: 4, dir: "E" },
  goal: { x: 6, y: 4 },
  mirrors: [
    { x: 2, y: 4, orientation: "\\" },
    { x: 2, y: 1, orientation: "/" },
    { x: 6, y: 1, orientation: "/" }
  ],
  walls: [],
  maxLiveSteps: 40,
  liveMirrorKeys: ["2,4", "6,1"],
  hint: "After launch, turn the lower-left mirror before the pulse reaches it, then turn the upper-right mirror before the pulse gets there."
};

export const LIVE_SOLUTION = Object.freeze({
  "2,4": "/",
  "2,1": "/",
  "6,1": "\\"
});
