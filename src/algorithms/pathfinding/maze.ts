import type { MazeGenerator, MazeResult } from "../../core/types";
import type { RNG } from "../../core/util/rng";
import { makeGrid } from "./util";

/**
 * Recursive division. Walls are only placed on EVEN rows/columns and gaps only
 * on ODD rows/columns, so a wall's gap always lines up with an (odd,odd) passage
 * cell that no perpendicular wall can ever occupy. That keeps every gap usable
 * and the maze fully connected (a naive single-cell-gap version disconnects the
 * board because a child wall can seal a parent's gap).
 */
export const recursiveDivision: MazeGenerator = {
  id: "division",
  name: "Recursive division",
  generate(rows: number, cols: number, rng: RNG): MazeResult {
    const walls = makeGrid(rows, cols, () => false);
    const evens = (lo: number, hi: number): number[] => {
      const a: number[] = [];
      for (let x = lo; x <= hi; x++) if (x % 2 === 0) a.push(x);
      return a;
    };
    const odds = (lo: number, hi: number): number[] => {
      const a: number[] = [];
      for (let x = lo; x <= hi; x++) if (x % 2 === 1) a.push(x);
      return a;
    };
    const divide = (r1: number, c1: number, r2: number, c2: number, depth: number): void => {
      if (depth > 400) return;
      const h = r2 - r1;
      const w = c2 - c1;
      const rowWalls = evens(r1 + 1, r2 - 1); // interior even rows that can host a wall
      const colWalls = evens(c1 + 1, c2 - 1);
      const canH = h >= 2 && rowWalls.length > 0;
      const canV = w >= 2 && colWalls.length > 0;
      if (!canH && !canV) return;
      const horizontal = canH && canV ? (w < h ? true : h < w ? false : rng.next() < 0.5) : canH;
      if (horizontal) {
        const wr = rowWalls[rng.int(rowWalls.length)];
        const gapCols = odds(c1, c2);
        const gap = gapCols.length ? gapCols[rng.int(gapCols.length)] : c1;
        for (let c = c1; c <= c2; c++) if (c !== gap) walls[wr][c] = true;
        divide(r1, c1, wr - 1, c2, depth + 1);
        divide(wr + 1, c1, r2, c2, depth + 1);
      } else {
        const wc = colWalls[rng.int(colWalls.length)];
        const gapRows = odds(r1, r2);
        const gap = gapRows.length ? gapRows[rng.int(gapRows.length)] : r1;
        for (let r = r1; r <= r2; r++) if (r !== gap) walls[r][wc] = true;
        divide(r1, c1, r2, wc - 1, depth + 1);
        divide(r1, wc + 1, r2, c2, depth + 1);
      }
    };
    divide(0, 0, rows - 1, cols - 1, 0);
    return { walls };
  },
};

/**
 * Recursive backtracker (randomized DFS). On a cell-grid where odd rows/cols are
 * passages and even rows/cols are walls, start solid and carve a perfect maze.
 */
export const recursiveBacktracker: MazeGenerator = {
  id: "backtracker",
  name: "Recursive backtracker",
  generate(rows: number, cols: number, rng: RNG): MazeResult {
    const walls = makeGrid(rows, cols, () => true);
    if (rows < 1 || cols < 1) return { walls };

    const inBounds = (r: number, c: number): boolean => r >= 0 && r < rows && c >= 0 && c < cols;

    // Carve from an odd-coordinate origin so passages land on odd rows/cols.
    const sr = rows > 1 ? 1 : 0;
    const sc = cols > 1 ? 1 : 0;
    walls[sr][sc] = false;

    const stack: Array<[number, number]> = [[sr, sc]];
    // Step two cells at a time, knocking out the wall between origin and target.
    const steps: ReadonlyArray<readonly [number, number]> = [
      [-2, 0],
      [2, 0],
      [0, -2],
      [0, 2],
    ];

    while (stack.length) {
      const [r, c] = stack[stack.length - 1];
      const neighbours: Array<[number, number]> = [];
      for (const [dr, dc] of steps) {
        const nr = r + dr;
        const nc = c + dc;
        if (inBounds(nr, nc) && walls[nr][nc]) neighbours.push([nr, nc]);
      }
      if (!neighbours.length) {
        stack.pop();
        continue;
      }
      const [nr, nc] = neighbours[rng.int(neighbours.length)];
      // Knock down the wall cell between current and chosen neighbour.
      walls[(r + nr) >> 1][(c + nc) >> 1] = false;
      walls[nr][nc] = false;
      stack.push([nr, nc]);
    }

    return { walls };
  },
};

/**
 * Randomized Prim's. Same odd=passage / even=wall model as the backtracker:
 * grow a single tree by repeatedly carving to a random frontier passage cell.
 */
export const prim: MazeGenerator = {
  id: "prim",
  name: "Prim's",
  generate(rows: number, cols: number, rng: RNG): MazeResult {
    const walls = makeGrid(rows, cols, () => true);
    if (rows < 1 || cols < 1) return { walls };

    const inBounds = (r: number, c: number): boolean => r >= 0 && r < rows && c >= 0 && c < cols;

    const steps: ReadonlyArray<readonly [number, number]> = [
      [-2, 0],
      [2, 0],
      [0, -2],
      [0, 2],
    ];

    const sr = rows > 1 ? 1 : 0;
    const sc = cols > 1 ? 1 : 0;
    walls[sr][sc] = false;

    // Frontier = wall passage-cells adjacent (2 away) to the growing tree.
    const frontier: Array<[number, number]> = [];
    const addFrontier = (r: number, c: number): void => {
      for (const [dr, dc] of steps) {
        const nr = r + dr;
        const nc = c + dc;
        if (inBounds(nr, nc) && walls[nr][nc]) frontier.push([nr, nc]);
      }
    };
    addFrontier(sr, sc);

    while (frontier.length) {
      const idx = rng.int(frontier.length);
      const [fr, fc] = frontier[idx];
      // Swap-remove the chosen frontier cell.
      frontier[idx] = frontier[frontier.length - 1];
      frontier.pop();
      if (!walls[fr][fc]) continue;

      // Connect to a random already-carved neighbour two cells away.
      const carved: Array<[number, number]> = [];
      for (const [dr, dc] of steps) {
        const nr = fr + dr;
        const nc = fc + dc;
        if (inBounds(nr, nc) && !walls[nr][nc]) carved.push([nr, nc]);
      }
      if (!carved.length) continue;
      const [cr, cc] = carved[rng.int(carved.length)];
      walls[(fr + cr) >> 1][(fc + cc) >> 1] = false;
      walls[fr][fc] = false;
      addFrontier(fr, fc);
    }

    return { walls };
  },
};

/** Scattered walls: a non-perfect obstacle field - fill about 28% of cells at random. */
export const scatter: MazeGenerator = {
  id: "scatter",
  name: "Scattered walls",
  generate(rows: number, cols: number, rng: RNG): MazeResult {
    const density = 0.28;
    const walls = makeGrid(rows, cols, () => rng.next() < density);
    return { walls };
  },
};

export const MAZES: Record<string, MazeGenerator> = {
  division: recursiveDivision,
  backtracker: recursiveBacktracker,
  prim,
  scatter,
};

export const MAZE_LIST: MazeGenerator[] = [recursiveDivision, recursiveBacktracker, prim, scatter];
