import type { PathfindingAlgorithm, PathProblem, PathRun, Cell, VisitStep } from "../../core/types";
import { dirsFor, makeGrid, reconstruct } from "./util";
import { MinHeap } from "../../core/util/heap";

interface QNode {
  r: number;
  c: number;
  d: number;
}

const pseudocode = [
  "function Dijkstra(start, goal):",
  "  dist[start] ← 0; all other dist ← ∞",
  "  frontier ← min-heap holding (start, 0)",
  "  while frontier not empty:",
  "    cell ← frontier.pop()            // cheapest known distance",
  "    if cell already finalized: skip it",
  "    finalize cell",
  "    if cell = goal: return path",
  "    for each neighbour n of cell:",
  "      nd ← dist[cell] + weight(n)",
  "      if nd < dist[n]:",
  "        dist[n] ← nd; parent[n] ← cell",
  "        frontier.push(n, nd)",
  "  return no path",
];

const lineNotes = [
  "Dijkstra finds the lowest-cost route when steps have different weights.",
  "The start costs nothing to reach; every other cell is unknown (infinite).",
  "Put the start in a priority queue ordered by cheapest distance so far.",
  "Keep going while the queue still holds candidates.",
  "Pull out the cell with the smallest accumulated cost.",
  "It may be a stale copy - ignore it if we already settled this cell.",
  "Lock in this cell; its shortest distance is now known for good.",
  "If it's the goal, we've found the cheapest route to it.",
  "Examine each neighbour we could move into.",
  "Cost to reach the neighbour is our cost plus that cell's weight.",
  "Only improve the neighbour if this path is cheaper than the best so far.",
  "Record the cheaper distance and remember we came from this cell.",
  "Push the neighbour with its new distance for later consideration.",
  "If the queue empties first, the goal is unreachable.",
];

export const dijkstra: PathfindingAlgorithm = {
  id: "dijkstra",
  name: "Dijkstra",
  usesWeights: true,
  pseudocode,
  lineNotes,
  info: {
    id: "dijkstra",
    name: "Dijkstra's Algorithm",
    complexity: "Time O((V+E) log V) · Space O(V)",
    tags: ["Weighted shortest", "Respects weights"],
    description:
      "Always expands the cheapest-known cell next, so the first time it finalizes the goal it has the lowest-cost route.",
  },
  run(p: PathProblem): PathRun {
    const { rows, cols, walls, weights, start: s, end: e } = p;
    const dist = makeGrid(rows, cols, () => Infinity);
    const done = makeGrid(rows, cols, () => false);
    const prev = makeGrid<Cell | null>(rows, cols, () => null);
    const dirs = dirsFor(p.diagonal);
    const order: VisitStep[] = [];
    const heap = new MinHeap<QNode>((x) => x.d);
    let found = false;
    dist[s.r][s.c] = 0;
    heap.push({ r: s.r, c: s.c, d: 0 });
    while (heap.size) {
      const cur = heap.pop();
      if (cur === undefined) break;
      if (done[cur.r][cur.c]) continue;
      done[cur.r][cur.c] = true;
      const isGoal = cur.r === e.r && cur.c === e.c;
      order.push({ r: cur.r, c: cur.c, line: isGoal ? 7 : 4 });
      if (isGoal) {
        found = true;
        break;
      }
      for (const d of dirs) {
        const nr = cur.r + d[0];
        const nc = cur.c + d[1];
        if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || walls[nr][nc] || done[nr][nc]) continue;
        const nd = cur.d + weights[nr][nc];
        if (nd < dist[nr][nc]) {
          dist[nr][nc] = nd;
          prev[nr][nc] = { r: cur.r, c: cur.c };
          heap.push({ r: nr, c: nc, d: nd });
        }
      }
    }
    return { order, path: reconstruct(prev, s, e, found, rows, cols), found };
  },
};
