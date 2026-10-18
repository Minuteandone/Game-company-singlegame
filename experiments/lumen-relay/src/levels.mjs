// Three small hand-authored test puzzles. Positions use zero-based grid coordinates.
// This file intentionally contains only data, so collaborators can add levels safely.
export const LEVELS = [
  {
    id: "first-light",
    name: "First Light",
    subtitle: "Two turns can wake a sleeping bloom.",
    width: 9,
    height: 7,
    source: { x: 0, y: 3, dir: "E" },
    goal: { x: 8, y: 1 },
    mirrors: [
      { x: 3, y: 3, orientation: "\\" },
      { x: 3, y: 1, orientation: "\\" }
    ],
    walls: [{ x: 6, y: 4 }],
    hint: "Try turning the pulse upward, then across."
  },
  {
    id: "the-detour",
    name: "The Detour",
    subtitle: "A longer route is still a route.",
    width: 9,
    height: 7,
    source: { x: 0, y: 5, dir: "E" },
    goal: { x: 8, y: 4 },
    mirrors: [
      { x: 3, y: 5, orientation: "\\" },
      { x: 3, y: 1, orientation: "\\" },
      { x: 6, y: 1, orientation: "/" },
      { x: 6, y: 4, orientation: "/" }
    ],
    walls: [{ x: 1, y: 1 }, { x: 4, y: 4 }, { x: 7, y: 5 }],
    hint: "Send the signal up, right, down, then right."
  },
  {
    id: "crossed-wires",
    name: "Crossed Wires",
    subtitle: "The bloom is near. The path is not.",
    width: 9,
    height: 7,
    source: { x: 0, y: 1, dir: "E" },
    goal: { x: 8, y: 2 },
    mirrors: [
      { x: 2, y: 1, orientation: "/" },
      { x: 2, y: 5, orientation: "\\" },
      { x: 7, y: 5, orientation: "\\" },
      { x: 7, y: 2, orientation: "\\" }
    ],
    walls: [{ x: 1, y: 4 }, { x: 4, y: 0 }, { x: 5, y: 3 }],
    hint: "Sometimes the best route starts by going down."
  }
];
