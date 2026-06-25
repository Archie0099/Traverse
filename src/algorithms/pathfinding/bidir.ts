import type { PathfindingAlgorithm, PathProblem, PathRun, Cell, VisitStep } from "../../core/types";
import { dirsFor, makeGrid } from "./util";

const pseudocode = [
  "function Bidirectional(start, goal):",
  "  frontierA ← {start}; frontierB ← {goal}    // grow toward each other",
  "  distA[start] ← 0; distB[goal] ← 0",
  "  while frontierA and frontierB not empty:",
  "    expand the whole start ring one step outward",
  "    expand the whole goal ring one step outward",
  "      for each new cell n: record parent and distance",
  "      if n is reached by the other side: the frontiers meet",
  "    if they have met: stitch the two halves and return path",
  "  return no path",
];

const lineNotes = [
  "Run two breadth-first searches at once, one from each end.",
  "Seed one frontier at the start and the other at the goal.",
  "Both seeds cost nothing to reach from their own side.",
  "Keep going while both frontiers still have cells to grow.",
  "Advance the start frontier by one full ring (level-synchronized).",
  "Then advance the goal frontier by one full ring.",
  "For every freshly reached cell, note where it came from.",
  "When a cell is already known to the other side, the searches have touched.",
  "Join the start half and the goal half at the cheapest meeting cell.",
  "If either frontier empties first, no path connects start and goal.",
];

export const bidir: PathfindingAlgorithm = {
  id: "bidir",
  name: "Bidirectional",
  usesWeights: false,
  pseudocode,
  lineNotes,
  info: {
    id: "bidir",
    name: "Bidirectional Search",
    complexity: "Time O(V+E) · Space O(V)",
    tags: ["Unweighted shortest", "Ignores weights"],
    description:
      "Grows two breadth-first frontiers at once - one from the start, one from the goal - and stops when they meet, often touching far fewer cells than a single search.",
  },
  run(p: PathProblem): PathRun {
    const { rows, cols, walls, start: s, end: e } = p;
    if (s.r === e.r && s.c === e.c) {
      return { order: [{ r: s.r, c: s.c, line: 1, side: 0 }], path: [{ r: s.r, c: s.c }], found: true };
    }
    const distA = makeGrid(rows, cols, () => Infinity);
    const distB = makeGrid(rows, cols, () => Infinity);
    const prevA = makeGrid<Cell | null>(rows, cols, () => null);
    const prevB = makeGrid<Cell | null>(rows, cols, () => null);
    const dirs = dirsFor(p.diagonal);
    const order: VisitStep[] = [
      { r: s.r, c: s.c, line: 1, side: 0 },
      { r: e.r, c: e.c, line: 1, side: 1 },
    ];
    distA[s.r][s.c] = 0;
    distB[e.r][e.c] = 0;
    let frontA: Cell[] = [s];
    let frontB: Cell[] = [e];
    let best = Infinity;
    let meet: Cell | null = null;

    const expand = (
      front: Cell[],
      dm: number[][],
      dother: number[][],
      pm: (Cell | null)[][],
      side: 0 | 1,
    ): Cell[] => {
      const next: Cell[] = [];
      for (const cur of front) {
        for (const d of dirs) {
          const nr = cur.r + d[0];
          const nc = cur.c + d[1];
          if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || walls[nr][nc] || dm[nr][nc] !== Infinity) continue;
          dm[nr][nc] = dm[cur.r][cur.c] + 1;
          pm[nr][nc] = { r: cur.r, c: cur.c };
          const meets = dother[nr][nc] !== Infinity;
          order.push({ r: nr, c: nc, line: meets ? 7 : 6, side });
          next.push({ r: nr, c: nc });
          if (meets) {
            const tot = dm[nr][nc] + dother[nr][nc];
            if (tot < best) {
              best = tot;
              meet = { r: nr, c: nc };
            }
          }
        }
      }
      return next;
    };

    while (frontA.length && frontB.length) {
      frontA = expand(frontA, distA, distB, prevA, 0);
      frontB = expand(frontB, distB, distA, prevB, 1);
      if (meet !== null) break;
    }

    if (meet === null) return { order, path: [], found: false };
    const m: Cell = meet;

    const left: Cell[] = [];
    let cur: Cell | null = m;
    let guard = 0;
    const limit = rows * cols + 5;
    while (cur && guard++ < limit) {
      left.push(cur);
      if (cur.r === s.r && cur.c === s.c) break;
      cur = prevA[cur.r][cur.c];
    }
    left.reverse();

    const right: Cell[] = [];
    cur = prevB[m.r][m.c];
    guard = 0;
    while (cur && guard++ < limit) {
      right.push(cur);
      if (cur.r === e.r && cur.c === e.c) break;
      cur = prevB[cur.r][cur.c];
    }

    return { order, path: left.concat(right), found: true };
  },
};
