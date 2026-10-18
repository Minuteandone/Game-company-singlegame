// Three small hand-authored test puzzles. Positions use zero-based grid coordinates.
// This file intentionally contains only data, so collaborators can add levels safely.
export const LEVELS = [
  {
    id: "first-light",
    name: "First Light",
    subtitle: "Just one turn to wake the first flower.",
    width: 9,
    height: 7,
    source: { x: 0, y: 3, dir: "E" },
    goal: { x: 3, y: 0 },
    mirrors: [
      { x: 3, y: 3, orientation: "\\" }
    ],
    walls: [{ x: 6, y: 4 }],
    hint: "A slash-shaped mirror sends eastward light north."
  },
  {
    id: "the-detour",
    name: "The Detour",
    subtitle: "Three mirrors. One is already pointing the right way.",
    width: 9,
    height: 7,
    source: { x: 0, y: 5, dir: "E" },
    goal: { x: 6, y: 4 },
    mirrors: [
      { x: 3, y: 5, orientation: "\\" },
      { x: 3, y: 1, orientation: "/" },
      { x: 6, y: 1, orientation: "/" }
    ],
    walls: [{ x: 1, y: 1 }, { x: 4, y: 4 }, { x: 7, y: 5 }],
    hint: "Trace the path: up, right, then down. Not every mirror needs a turn."
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
