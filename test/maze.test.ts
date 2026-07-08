import { describe, it, expect } from "vitest";
import { MAZES } from "../src/algorithms/pathfinding/maze";
import { PATH_BY_ID } from "../src/algorithms/pathfinding";
import { makeRng } from "../src/core/util/rng";
import { dirsFor } from "../src/algorithms/pathfinding/util";
import type { PathProblem } from "../src/core/types";

// Replicates PathController.generateMaze(): generate, then clear start/end + their
// 8 neighbours, using the controller's default start/end placement.
function buildAndSolve(genId: string, rows: number, cols: number, seed: number): boolean {
  const { walls } = MAZES[genId].generate(rows, cols, makeRng(seed));
  const start = { r: Math.floor(rows / 2), c: Math.max(1, Math.round(cols * 0.18)) };
  const end = { r: Math.floor(rows / 2), c: Math.min(cols - 2, Math.round(cols * 0.82)) };
  for (const nd of [start, end]) {
    walls[nd.r][nd.c] = false;
    for (const d of dirsFor(true)) {
      const nr = nd.r + d[0];
      const nc = nd.c + d[1];
      if (nr >= 0 && nc >= 0 && nr < rows && nc < cols) walls[nr][nc] = false;
    }
  }
  const p: PathProblem = {
    rows,
    cols,
    walls,
    weights: walls.map((row) => row.map(() => 1)),
    start,
    end,
    diagonal: false,
  };
  return PATH_BY_ID.bfs.run(p).found;
}

const dims = [
  { r: 6, c: 8 },
  { r: 13, c: 21 },
  { r: 18, c: 24 },
  { r: 20, c: 30 },
  { r: 40, c: 60 },
];

describe("maze generators", () => {
  // Perfect mazes must ALWAYS connect start to end.
  for (const id of ["division", "backtracker", "prim"]) {
    it(`${id}: solvable for every size/seed`, () => {
      for (const d of dims) {
        for (let seed = 1; seed <= 40; seed++) {
          expect(buildAndSolve(id, d.r, d.c, seed), `${id} ${d.r}x${d.c} seed ${seed}`).toBe(true);
        }
      }
    });
  }

  // Scatter is a deliberate random obstacle field; usually but not always solvable.
  it("scatter: mostly solvable", () => {
    let solved = 0;
    let total = 0;
    for (const d of dims) {
      for (let seed = 1; seed <= 40; seed++) {
        total++;
        if (buildAndSolve("scatter", d.r, d.c, seed)) solved++;
      }
    }
    expect(solved / total).toBeGreaterThan(0.8);
  });
});
