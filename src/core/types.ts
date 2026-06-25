/* ===========================================================================
 * Shared contracts. Every algorithm and controller implements these, which is
 * what lets the UI, player, and learning mode stay generic over both modes.
 * ===========================================================================*/

export interface AlgorithmInfo {
  id: string;
  name: string;
  /** Complexity summary, e.g. "Time O(V+E) · Space O(V)". */
  complexity: string;
  tags: string[];
  /** Plain-language one-paragraph description. */
  description: string;
}

/* ----- Readout / legend (UI reads these from the active controller) ------- */

export interface Stat {
  key: string;
  value: string;
}

export interface LegendItem {
  kind: "dot" | "square" | "line" | "gradient";
  /** CSS color, or a CSS gradient string when kind === "gradient". */
  color: string;
  label: string;
}

/* ----- The engine contract a controller fulfils -------------------------- */

export interface Controller {
  /** Total steps in the precomputed run (for the scrubber). */
  readonly total: number;
  /** Current playback cursor. */
  readonly cursor: number;

  /** Bind the drawing context + CSS-pixel viewport, then (re)layout. */
  setViewport(ctx: CanvasRenderingContext2D, cssW: number, cssH: number): void;
  /** Precompute the run if state is dirty. Idempotent. */
  prepare(): void;
  /** Reset the cursor to the very start, fully settled (no animation/sound). */
  seekStart(): void;
  /** Jump to the end at time t. */
  seekEnd(t: number): void;
  /** True once the cursor has consumed the whole run. */
  isComplete(): boolean;
  /** Advance n steps, stamping animation at time t. `live` enables sound. */
  stepForward(n: number, t: number, live: boolean): void;
  /** Draw the current frame at time t. */
  render(t: number): void;

  /* descriptive surface (info card, learning mode, readout, legend) */
  info(): AlgorithmInfo;
  pseudocode(): string[];
  /** Pseudocode line index active at the current cursor, or -1. */
  activeLine(): number;
  /** Plain-language narration of the current step. */
  narration(): string;
  stats(): Stat[];
  legend(): LegendItem[];
  hint(): string;
}

/* ===========================================================================
 * Pathfinding
 * ===========================================================================*/

export interface Cell {
  r: number;
  c: number;
}

export interface PathProblem {
  rows: number;
  cols: number;
  walls: boolean[][];
  /** Per-cell movement cost, ≥ 1. */
  weights: number[][];
  start: Cell;
  end: Cell;
  /** Allow 8-neighbour (diagonal) movement. */
  diagonal: boolean;
}

/** One frontier-expansion event in visit order. */
export interface VisitStep {
  r: number;
  c: number;
  /** Pseudocode line highlighted when this happens. */
  line: number;
  /** Which frontier expanded it (0 = from start, 1 = from goal). Bidirectional only. */
  side?: 0 | 1;
}

export interface PathRun {
  order: VisitStep[];
  /** Final path start→end, empty if none found. */
  path: Cell[];
  found: boolean;
}

export interface PathfindingAlgorithm {
  id: string;
  name: string;
  info: AlgorithmInfo;
  pseudocode: string[];
  /** Same length as `pseudocode`; plain-language gloss per line for learning mode. */
  lineNotes: string[];
  /** Whether the algorithm respects cell weights (teaching invariant). */
  usesWeights: boolean;
  run(p: PathProblem): PathRun;
}

/* ===========================================================================
 * Sorting
 * ===========================================================================*/

export type SortOpType = "cmp" | "swap" | "set" | "pivot" | "unpivot";

export interface SortOp {
  t: SortOpType;
  /** Primary index (or pivot index). */
  i: number;
  /** Secondary index (cmp/swap). */
  j?: number;
  /** Value to write (set). */
  v?: number;
  /** Pseudocode line highlighted for this op. */
  line: number;
}

export interface SortingAlgorithm {
  id: string;
  name: string;
  info: AlgorithmInfo;
  pseudocode: string[];
  lineNotes: string[];
  /** Emit the op stream for a fresh copy of `arr` (mutates the copy). */
  gen(arr: number[]): SortOp[];
}

/* ===========================================================================
 * Maze generation
 * ===========================================================================*/

import type { RNG } from "./util/rng";

export interface MazeResult {
  walls: boolean[][];
  weights?: number[][];
}

export interface MazeGenerator {
  id: string;
  name: string;
  generate(rows: number, cols: number, rng: RNG): MazeResult;
}
