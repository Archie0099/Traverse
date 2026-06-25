import { describe, it, expect } from "vitest";
import type { PathProblem } from "../src/core/types";
import { PATH_ALGOS } from "../src/algorithms/pathfinding";
import { SORT_ALGOS } from "../src/algorithms/sorting";
import { makeGrid } from "../src/algorithms/pathfinding/util";

function problem(rows: number, cols: number, opts: Partial<PathProblem> = {}): PathProblem {
  return {
    rows,
    cols,
    walls: makeGrid(rows, cols, () => false),
    weights: makeGrid(rows, cols, () => 1),
    start: { r: 0, c: 0 },
    end: { r: rows - 1, c: cols - 1 },
    diagonal: false,
    ...opts,
  };
}

/* ===== pseudocode / lineNotes integrity ===== */

describe("pathfinding pseudocode integrity", () => {
  for (const a of PATH_ALGOS) {
    it(`${a.id}: pseudocode and lineNotes are equal length and non-empty`, () => {
      expect(a.pseudocode.length).toBeGreaterThan(0);
      expect(a.lineNotes.length).toBe(a.pseudocode.length);
    });

    it(`${a.id}: every visit-step line is a valid pseudocode index`, () => {
      const boards = [
        problem(12, 16),
        problem(12, 16, { diagonal: true }),
        problem(1, 1, { end: { r: 0, c: 0 } }),
      ];
      for (const p of boards) {
        const res = a.run(p);
        for (const step of res.order) {
          expect(step.line, `${a.id} line ${step.line}`).toBeGreaterThanOrEqual(0);
          expect(step.line).toBeLessThan(a.pseudocode.length);
        }
      }
    });
  }
});

describe("sorting pseudocode integrity", () => {
  for (const a of SORT_ALGOS) {
    it(`${a.id}: pseudocode and lineNotes are equal length and non-empty`, () => {
      expect(a.pseudocode.length).toBeGreaterThan(0);
      expect(a.lineNotes.length).toBe(a.pseudocode.length);
    });

    it(`${a.id}: every op line is a valid pseudocode index`, () => {
      for (const n of [0, 1, 2, 30]) {
        const arr = Array.from({ length: n }, (_, i) => n - i); // reverse-sorted
        const ops = a.gen(arr.slice());
        for (const op of ops) {
          expect(op.line, `${a.id} op line ${op.line}`).toBeGreaterThanOrEqual(0);
          expect(op.line).toBeLessThan(a.pseudocode.length);
        }
      }
    });
  }
});

/* ===== pathfinding edge cases (must not throw, must stay valid) ===== */

describe("pathfinding edge cases", () => {
  it("handles a 1x1 grid (start == end)", () => {
    const p = problem(1, 1, { end: { r: 0, c: 0 } });
    for (const a of PATH_ALGOS) {
      const res = a.run(p);
      expect(res.found, a.id).toBe(true);
      expect(res.path.length).toBe(1);
    }
  });

  it("handles start == end on a larger grid", () => {
    const p = problem(10, 10, { start: { r: 4, c: 4 }, end: { r: 4, c: 4 } });
    for (const a of PATH_ALGOS) {
      const res = a.run(p);
      expect(res.found, a.id).toBe(true);
      expect(res.path[0]).toEqual({ r: 4, c: 4 });
    }
  });

  it("reports no path when the goal is walled off", () => {
    const walls = makeGrid(10, 10, () => false);
    // enclose the end at (9,9)
    walls[8][9] = true;
    walls[9][8] = true;
    walls[8][8] = true;
    const p = problem(10, 10, { walls });
    for (const a of PATH_ALGOS) {
      const res = a.run(p);
      expect(res.found, `${a.id} should not find a path`).toBe(false);
      expect(res.path.length).toBe(0);
    }
  });
});

/* ===== sorting edge cases ===== */

describe("sorting edge cases", () => {
  it("handles empty and single-element arrays without throwing", () => {
    for (const a of SORT_ALGOS) {
      expect(() => a.gen([]), a.id).not.toThrow();
      expect(a.gen([]).length, `${a.id} empty`).toBe(0);
      expect(() => a.gen([1]), a.id).not.toThrow();
    }
  });
});
