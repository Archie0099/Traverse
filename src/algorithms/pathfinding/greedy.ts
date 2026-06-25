import type { PathfindingAlgorithm, PathProblem, PathRun, Cell, VisitStep } from "../../core/types";
import { dirsFor, heuristic, makeGrid, reconstruct } from "./util";
import { MinHeap } from "../../core/util/heap";

interface QNode {
  r: number;
  c: number;
  h: number;
}

const pseudocode = [
  "function GreedyBestFirst(start, goal):",
  "  frontier ← min-heap holding (start, h(start))",
  "  while frontier not empty:",
  "    cell ← frontier.pop()            // smallest heuristic to goal",
  "    if cell already expanded: skip it",
  "    expand cell",
  "    if cell = goal: return path",
  "    for each neighbour n of cell:",
  "      if n is walkable and not expanded:",
  "        if n unseen: parent[n] ← cell",
  "        frontier.push(n, h(n))",
  "  return no path",
];

const lineNotes = [
  "Greedy best-first always heads toward whatever looks closest to the goal.",
  "Put the start in a priority queue ordered by its estimated distance to the goal.",
  "Keep going while the queue still holds candidates.",
  "Pull out the cell whose heuristic estimate to the goal is smallest.",
  "It may be a stale copy - ignore it if we already expanded this cell.",
  "Mark this cell expanded so we never revisit it.",
  "If it's the goal, stop - but this route may not be the shortest.",
  "Examine each neighbour we could move into.",
  "Skip walls and cells we have already expanded.",
  "Remember the first cell we arrived from, since it never improves the path here.",
  "Push the neighbour ordered only by its guess of remaining distance.",
  "If the queue empties first, the goal is unreachable.",
];

export const greedy: PathfindingAlgorithm = {
  id: "greedy",
  name: "Greedy",
  usesWeights: false,
  pseudocode,
  lineNotes,
  info: {
    id: "greedy",
    name: "Greedy Best-First Search",
    complexity: "Time O((V+E) log V) · Space O(V)",
    tags: ["Heuristic", "Ignores weights", "Non-optimal"],
    description:
      "Always expands the cell that looks closest to the goal by the heuristic alone, so it races toward the target but is not guaranteed to find the shortest path.",
  },
  run(p: PathProblem): PathRun {
    const { rows, cols, walls, start: s, end: e } = p;
    const closed = makeGrid(rows, cols, () => false);
    const queued = makeGrid(rows, cols, () => false);
    const prev = makeGrid<Cell | null>(rows, cols, () => null);
    const dirs = dirsFor(p.diagonal);
    const order: VisitStep[] = [];
    const heap = new MinHeap<QNode>((x) => x.h);
    let found = false;
    heap.push({ r: s.r, c: s.c, h: heuristic(p.diagonal, s.r, s.c, e) });
    queued[s.r][s.c] = true;
    while (heap.size) {
      const cur = heap.pop();
      if (cur === undefined) break;
      if (closed[cur.r][cur.c]) continue;
      closed[cur.r][cur.c] = true;
      const isGoal = cur.r === e.r && cur.c === e.c;
      order.push({ r: cur.r, c: cur.c, line: isGoal ? 6 : 5 });
      if (isGoal) {
        found = true;
        break;
      }
      for (const d of dirs) {
        const nr = cur.r + d[0];
        const nc = cur.c + d[1];
        if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || walls[nr][nc] || closed[nr][nc]) continue;
        if (prev[nr][nc] === null) prev[nr][nc] = { r: cur.r, c: cur.c };
        if (!queued[nr][nc]) {
          queued[nr][nc] = true;
          heap.push({ r: nr, c: nc, h: heuristic(p.diagonal, nr, nc, e) });
        }
      }
    }
    return { order, path: reconstruct(prev, s, e, found, rows, cols), found };
  },
};
