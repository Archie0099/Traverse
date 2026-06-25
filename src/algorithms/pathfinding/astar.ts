import type { PathfindingAlgorithm, PathProblem, PathRun, Cell, VisitStep } from "../../core/types";
import { dirsFor, heuristic, makeGrid, reconstruct } from "./util";
import { MinHeap } from "../../core/util/heap";

interface QNode {
  r: number;
  c: number;
  g: number;
  f: number;
}

const pseudocode = [
  "function A*(start, goal):",
  "  g[start] ← 0; all other g ← ∞",
  "  frontier ← min-heap ordered by f = g + heuristic",
  "  while frontier not empty:",
  "    cell ← frontier.pop()            // smallest f = g + h",
  "    if cell already finalized: skip it",
  "    finalize cell",
  "    if cell = goal: return path",
  "    for each neighbour n of cell:",
  "      ng ← g[cell] + weight(n)",
  "      if ng < g[n]:",
  "        g[n] ← ng; parent[n] ← cell",
  "        frontier.push(n, ng + heuristic(n, goal))",
  "  return no path",
];

const lineNotes = [
  "A* is Dijkstra steered toward the goal by an admissible heuristic.",
  "The start costs nothing to reach; every other cell is unknown (infinite).",
  "Order the priority queue by f = cost-so-far plus estimated distance left.",
  "Keep going while the queue still holds candidates.",
  "Pull out the cell with the smallest f - closest to a complete cheap route.",
  "It may be a stale copy - ignore it if we already settled this cell.",
  "Lock in this cell; its shortest distance is now known for good.",
  "If it's the goal, the heuristic guarantees this route is optimal.",
  "Examine each neighbour we could move into.",
  "Cost to reach the neighbour is our cost plus that cell's weight.",
  "Only improve the neighbour if this path is cheaper than the best so far.",
  "Record the cheaper cost and remember we came from this cell.",
  "Push it with priority f = new cost plus its estimate to the goal.",
  "If the queue empties first, the goal is unreachable.",
];

export const astar: PathfindingAlgorithm = {
  id: "astar",
  name: "A*",
  usesWeights: true,
  pseudocode,
  lineNotes,
  info: {
    id: "astar",
    name: "A* Search",
    complexity: "Time O((V+E) log V) · Space O(V)",
    tags: ["Weighted shortest", "Respects weights", "Heuristic-guided"],
    description:
      "Dijkstra guided by an admissible heuristic toward the goal, so it explores fewer cells while still returning the lowest-cost route.",
  },
  run(p: PathProblem): PathRun {
    const { rows, cols, walls, weights, start: s, end: e } = p;
    const g = makeGrid(rows, cols, () => Infinity);
    const done = makeGrid(rows, cols, () => false);
    const prev = makeGrid<Cell | null>(rows, cols, () => null);
    const dirs = dirsFor(p.diagonal);
    const order: VisitStep[] = [];
    const heap = new MinHeap<QNode>((x) => x.f);
    let found = false;
    g[s.r][s.c] = 0;
    heap.push({ r: s.r, c: s.c, g: 0, f: heuristic(p.diagonal, s.r, s.c, e) });
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
        const ng = cur.g + weights[nr][nc];
        if (ng < g[nr][nc]) {
          g[nr][nc] = ng;
          prev[nr][nc] = { r: cur.r, c: cur.c };
          heap.push({ r: nr, c: nc, g: ng, f: ng + heuristic(p.diagonal, nr, nc, e) });
        }
      }
    }
    return { order, path: reconstruct(prev, s, e, found, rows, cols), found };
  },
};
