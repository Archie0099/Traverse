import { describe, it, expect } from "vitest";
import type { PathProblem, Cell, SortOp } from "../src/core/types";
import { PATH_BY_ID } from "../src/algorithms/pathfinding";
import { SORT_ALGOS } from "../src/algorithms/sorting";
import { makeGrid } from "../src/algorithms/pathfinding/util";
import { makeRng } from "../src/core/util/rng";

/* ===================== pathfinding ===================== */

function emptyProblem(rows: number, cols: number, diagonal = false): PathProblem {
  return {
    rows,
    cols,
    walls: makeGrid(rows, cols, () => false),
    weights: makeGrid(rows, cols, () => 1),
    start: { r: 0, c: 0 },
    end: { r: rows - 1, c: cols - 1 },
    diagonal,
  };
}

function randomMaze(rows: number, cols: number, wallProb: number, seed: number): PathProblem {
  const rng = makeRng(seed);
  const walls = makeGrid(rows, cols, () => false);
  const start: Cell = { r: 0, c: 0 };
  const end: Cell = { r: rows - 1, c: cols - 1 };
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if ((r === start.r && c === start.c) || (r === end.r && c === end.c)) continue;
      if (rng.next() < wallProb) walls[r][c] = true;
    }
  }
  return { rows, cols, walls, weights: makeGrid(rows, cols, () => 1), start, end, diagonal: false };
}

function pathCost(p: PathProblem, path: Cell[]): number {
  let cost = 0;
  for (let i = 1; i < path.length; i++) cost += p.weights[path[i].r][path[i].c];
  return cost;
}

function validPath(p: PathProblem, path: Cell[]): boolean {
  if (path.length === 0) return false;
  const f = path[0];
  const l = path[path.length - 1];
  if (f.r !== p.start.r || f.c !== p.start.c) return false;
  if (l.r !== p.end.r || l.c !== p.end.c) return false;
  for (const cell of path) if (p.walls[cell.r][cell.c]) return false;
  for (let i = 1; i < path.length; i++) {
    const dr = Math.abs(path[i].r - path[i - 1].r);
    const dc = Math.abs(path[i].c - path[i - 1].c);
    const step = p.diagonal ? Math.max(dr, dc) === 1 : dr + dc === 1;
    if (!step) return false;
  }
  return true;
}

const REQUIRED_PATH = ["bfs", "dfs", "dijkstra", "astar", "greedy", "bidir"];

describe("pathfinding registry", () => {
  it("registers all six algorithms", () => {
    for (const id of REQUIRED_PATH) expect(PATH_BY_ID[id], `missing ${id}`).toBeTruthy();
  });
});

describe("pathfinding correctness", () => {
  it("every algorithm finds a valid path on an open grid", () => {
    const p = emptyProblem(15, 20);
    for (const id of REQUIRED_PATH) {
      const res = PATH_BY_ID[id].run(p);
      expect(res.found, `${id} should find a path`).toBe(true);
      expect(validPath(p, res.path), `${id} path invalid`).toBe(true);
    }
  });

  it("BFS, Dijkstra and A* agree on optimal length (unweighted)", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const p = randomMaze(14, 18, 0.25, seed);
      const bfs = PATH_BY_ID.bfs.run(p);
      if (!bfs.found) continue;
      const dij = PATH_BY_ID.dijkstra.run(p);
      const ast = PATH_BY_ID.astar.run(p);
      expect(dij.found && ast.found).toBe(true);
      expect(dij.path.length, `dijkstra len seed ${seed}`).toBe(bfs.path.length);
      expect(ast.path.length, `astar len seed ${seed}`).toBe(bfs.path.length);
    }
  });

  it("Bidirectional path length equals BFS length across random mazes", () => {
    let checked = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const p = randomMaze(13, 17, 0.22, seed);
      const bfs = PATH_BY_ID.bfs.run(p);
      if (!bfs.found) continue;
      const bd = PATH_BY_ID.bidir.run(p);
      expect(bd.found, `bidir found seed ${seed}`).toBe(true);
      expect(bd.path.length, `bidir len seed ${seed}`).toBe(bfs.path.length);
      checked++;
    }
    expect(checked).toBeGreaterThan(10);
  });

  it("Greedy returns a valid path that is no shorter than optimal", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const p = randomMaze(14, 18, 0.2, seed);
      const bfs = PATH_BY_ID.bfs.run(p);
      if (!bfs.found) continue;
      const gr = PATH_BY_ID.greedy.run(p);
      if (!gr.found) continue;
      expect(validPath(p, gr.path), `greedy invalid seed ${seed}`).toBe(true);
      expect(gr.path.length).toBeGreaterThanOrEqual(bfs.path.length);
    }
  });

  it("Dijkstra/A* exploit weights to beat BFS cost, and stay optimal", () => {
    // Direct top-row route is heavily weighted; a one-row detour is far cheaper.
    const rows = 11;
    const cols = 11;
    const p: PathProblem = {
      rows,
      cols,
      walls: makeGrid(rows, cols, () => false),
      weights: makeGrid(rows, cols, () => 1),
      start: { r: 0, c: 0 },
      end: { r: 0, c: cols - 1 },
      diagonal: false,
    };
    for (let c = 1; c <= cols - 2; c++) p.weights[0][c] = 6;

    const bfs = PATH_BY_ID.bfs.run(p);
    const dij = PATH_BY_ID.dijkstra.run(p);
    const ast = PATH_BY_ID.astar.run(p);
    const bfsCost = pathCost(p, bfs.path);
    const dijCost = pathCost(p, dij.path);
    const astCost = pathCost(p, ast.path);
    expect(dijCost).toBeLessThan(bfsCost);
    expect(astCost).toBe(dijCost);
    expect(validPath(p, dij.path)).toBe(true);
    expect(validPath(p, ast.path)).toBe(true);
  });

  it("supports diagonal movement", () => {
    const p = emptyProblem(12, 12, true);
    const bfs = PATH_BY_ID.bfs.run(p);
    expect(bfs.found).toBe(true);
    expect(validPath(p, bfs.path)).toBe(true);
    // diagonal lets BFS reach the opposite corner in max(dr,dc)+1 cells
    expect(bfs.path.length).toBe(12);
  });
});

/* ===================== sorting ===================== */

function replay(original: number[], ops: SortOp[]): number[] {
  const a = [...original];
  for (const op of ops) {
    if (op.t === "swap") {
      const j = op.j ?? op.i;
      const t = a[op.i];
      a[op.i] = a[j];
      a[j] = t;
    } else if (op.t === "set") {
      a[op.i] = op.v ?? a[op.i];
    }
  }
  return a;
}

function ascending(a: number[]): number[] {
  return [...a].sort((x, y) => x - y);
}

const REQUIRED_SORT = [
  "bubble",
  "insertion",
  "selection",
  "merge",
  "quick",
  "heap",
  "shell",
  "cocktail",
  "comb",
  "gnome",
  "radix",
];

describe("sorting registry", () => {
  it("registers all expected algorithms", () => {
    const ids = new Set(SORT_ALGOS.map((a) => a.id));
    for (const id of REQUIRED_SORT) expect(ids.has(id), `missing ${id}`).toBe(true);
  });
  it("pseudocode and lineNotes line up", () => {
    for (const a of SORT_ALGOS) {
      expect(a.pseudocode.length, `${a.id} lineNotes length`).toBe(a.lineNotes.length);
    }
  });
});

describe("sorting correctness", () => {
  const sizes = [1, 2, 3, 5, 8, 21, 55, 100, 160];
  for (const algo of SORT_ALGOS) {
    it(`${algo.id} sorts permutations of every size`, () => {
      for (const n of sizes) {
        const rng = makeRng(n * 7 + 13);
        const base: number[] = [];
        for (let i = 1; i <= n; i++) base.push(i);
        for (let i = n - 1; i > 0; i--) {
          const j = rng.int(i + 1);
          const t = base[i];
          base[i] = base[j];
          base[j] = t;
        }
        const ops = algo.gen([...base]);
        expect(replay(base, ops), `${algo.id} n=${n}`).toEqual(ascending(base));
      }
    });

    it(`${algo.id} handles sorted, reverse and duplicate inputs`, () => {
      const sorted = Array.from({ length: 40 }, (_, i) => i + 1);
      const reverse = [...sorted].reverse();
      const dupRng = makeRng(99);
      const dups = Array.from({ length: 50 }, () => dupRng.int(6) + 1);
      for (const input of [sorted, reverse, dups]) {
        const ops = algo.gen([...input]);
        expect(replay(input, ops), `${algo.id}`).toEqual(ascending(input));
      }
    });
  }
});
