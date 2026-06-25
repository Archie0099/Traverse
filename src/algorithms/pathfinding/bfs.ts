import type { PathfindingAlgorithm, PathProblem, PathRun, Cell, VisitStep } from "../../core/types";
import { dirsFor, makeGrid, reconstruct } from "./util";

const pseudocode = [
  "function BFS(start, goal):",
  "  frontier ← queue holding start; seen ← {start}",
  "  while frontier not empty:",
  "    cell ← frontier.dequeue()        // closest to start",
  "    if cell = goal: return path",
  "    for each neighbour n of cell:",
  "      if n is walkable and not seen:",
  "        seen.add(n); parent[n] ← cell",
  "        frontier.enqueue(n)",
  "  return no path",
];

const lineNotes = [
  "Breadth-first search explores outward in equal rings.",
  "Put the start in a FIFO queue and mark it seen.",
  "Keep going while the queue still has cells.",
  "Take the cell that has waited longest - the closest to the start.",
  "If it's the goal, the first arrival is the fewest-cells route.",
  "Look at each neighbouring cell.",
  "Skip walls and cells already queued.",
  "Mark it seen and remember the cell we came from.",
  "Add it to the back of the queue for later.",
  "If the queue empties first, no path exists.",
];

export const bfs: PathfindingAlgorithm = {
  id: "bfs",
  name: "BFS",
  usesWeights: false,
  pseudocode,
  lineNotes,
  info: {
    id: "bfs",
    name: "Breadth-First Search",
    complexity: "Time O(V+E) · Space O(V)",
    tags: ["Unweighted shortest", "Ignores weights"],
    description:
      "Explores outward in equal rings, so the first time it reaches the goal it has used the fewest cells.",
  },
  run(p: PathProblem): PathRun {
    const { rows, cols, walls, start: s, end: e } = p;
    const seen = makeGrid(rows, cols, () => false);
    const prev = makeGrid<Cell | null>(rows, cols, () => null);
    const dirs = dirsFor(p.diagonal);
    const order: VisitStep[] = [];
    const q: Cell[] = [s];
    let head = 0;
    let found = false;
    seen[s.r][s.c] = true;
    while (head < q.length) {
      const cur = q[head++];
      const isGoal = cur.r === e.r && cur.c === e.c;
      order.push({ r: cur.r, c: cur.c, line: isGoal ? 4 : 3 });
      if (isGoal) {
        found = true;
        break;
      }
      for (const d of dirs) {
        const nr = cur.r + d[0];
        const nc = cur.c + d[1];
        if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || walls[nr][nc] || seen[nr][nc]) continue;
        seen[nr][nc] = true;
        prev[nr][nc] = cur;
        q.push({ r: nr, c: nc });
      }
    }
    return { order, path: reconstruct(prev, s, e, found, rows, cols), found };
  },
};
