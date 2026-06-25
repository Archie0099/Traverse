import type { PathfindingAlgorithm, PathProblem, PathRun, Cell, VisitStep } from "../../core/types";
import { dirsFor, makeGrid, reconstruct } from "./util";

const pseudocode = [
  "function DFS(start, goal):",
  "  frontier ← stack holding start; seen ← {}",
  "  while frontier not empty:",
  "    cell ← frontier.pop()            // newest first",
  "    if cell already seen: skip",
  "    seen.add(cell)",
  "    if cell = goal: return path",
  "    for each neighbour n of cell:",
  "      if n is walkable and not seen:",
  "        if parent[n] unset: parent[n] ← cell",
  "        frontier.push(n)",
  "  return no path",
];

const lineNotes = [
  "Depth-first search dives down one branch before backing up.",
  "Put the start on a LIFO stack; nothing marked seen yet.",
  "Keep going while the stack still has cells.",
  "Take the most recently pushed cell - the deepest one waiting.",
  "It may already be settled from another branch; if so, drop it.",
  "Mark this cell seen so we never expand it twice.",
  "If it's the goal, stop - DFS found a route (not the shortest).",
  "Look at each neighbouring cell.",
  "Skip walls and cells already settled.",
  "Record where we first reached it, keeping the earliest parent.",
  "Push it on top of the stack to explore next.",
  "If the stack empties first, no path exists.",
];

export const dfs: PathfindingAlgorithm = {
  id: "dfs",
  name: "DFS",
  usesWeights: false,
  pseudocode,
  lineNotes,
  info: {
    id: "dfs",
    name: "Depth-First Search",
    complexity: "Time O(V+E) · Space O(V)",
    tags: ["Unweighted", "Ignores weights", "Not shortest"],
    description:
      "Plunges down one branch as far as it can before backtracking, so the route it finds is rarely the shortest.",
  },
  run(p: PathProblem): PathRun {
    const { rows, cols, walls, start: s, end: e } = p;
    const seen = makeGrid(rows, cols, () => false);
    const prev = makeGrid<Cell | null>(rows, cols, () => null);
    const dirs = dirsFor(p.diagonal);
    const order: VisitStep[] = [];
    const stack: Cell[] = [s];
    let found = false;
    while (stack.length) {
      const cur = stack.pop() as Cell;
      if (seen[cur.r][cur.c]) continue;
      seen[cur.r][cur.c] = true;
      const isGoal = cur.r === e.r && cur.c === e.c;
      order.push({ r: cur.r, c: cur.c, line: isGoal ? 6 : 3 });
      if (isGoal) {
        found = true;
        break;
      }
      for (let i = dirs.length - 1; i >= 0; i--) {
        const nr = cur.r + dirs[i][0];
        const nc = cur.c + dirs[i][1];
        if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || walls[nr][nc] || seen[nr][nc]) continue;
        if (!prev[nr][nc]) prev[nr][nc] = cur;
        stack.push({ r: nr, c: nc });
      }
    }
    return { order, path: reconstruct(prev, s, e, found, rows, cols), found };
  },
};
