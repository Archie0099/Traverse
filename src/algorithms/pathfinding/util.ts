import type { Cell } from "../../core/types";

export type Dir = readonly [number, number];

export const ORTHO: Dir[] = [
  [-1, 0],
  [0, 1],
  [1, 0],
  [0, -1],
];
export const DIAG: Dir[] = [
  [-1, 1],
  [1, 1],
  [1, -1],
  [-1, -1],
];

export function dirsFor(diagonal: boolean): Dir[] {
  return diagonal ? [...ORTHO, ...DIAG] : ORTHO;
}

/**
 * Admissible heuristic for the movement model (entering a cell costs ≥1):
 * Manhattan for 4-neighbour grids, Chebyshev when diagonals are allowed.
 */
export function heuristic(diagonal: boolean, r: number, c: number, e: Cell): number {
  const dr = Math.abs(r - e.r);
  const dc = Math.abs(c - e.c);
  return diagonal ? Math.max(dr, dc) : dr + dc;
}

export function makeGrid<T>(rows: number, cols: number, fill: () => T): T[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, fill));
}

/** Walk parent pointers from goal back to start. */
export function reconstruct(
  prev: (Cell | null)[][],
  start: Cell,
  end: Cell,
  found: boolean,
  rows: number,
  cols: number,
): Cell[] {
  if (!found) return [];
  const path: Cell[] = [];
  let cur: Cell | null = end;
  let guard = 0;
  const limit = rows * cols + 5;
  while (cur && guard++ < limit) {
    path.push(cur);
    if (cur.r === start.r && cur.c === start.c) break;
    cur = prev[cur.r][cur.c];
  }
  path.reverse();
  return path;
}
