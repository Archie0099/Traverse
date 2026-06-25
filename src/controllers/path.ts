import type {
  Controller,
  AlgorithmInfo,
  Stat,
  LegendItem,
  Cell,
  PathRun,
  PathProblem,
} from "../core/types";
import { DURATIONS, WEIGHT } from "../core/constants";
import { clamp, easeOut } from "../core/util/easing";
import { sample, rgba, type RGB } from "../core/util/color";
import { css, cssRGB } from "../core/util/palette";
import { roundRect } from "../core/util/dom";
import { Particles } from "../render/effects";
import { fmtInt, fmtTime } from "../core/util/format";
import { makeRng, randomSeed } from "../core/util/rng";
import { PATH_BY_ID, PATH_ALGOS } from "../algorithms/pathfinding";
import { MAZES } from "../algorithms/pathfinding/maze";
import { dirsFor, makeGrid } from "../algorithms/pathfinding/util";

export type Brush = "wall" | "weight" | "erase";
type Drag = "start" | "end" | "paint" | null;

export class PathController implements Controller {
  private ctx: CanvasRenderingContext2D | null = null;
  private cssW = 0;
  private cssH = 0;

  rows = 0;
  cols = 0;
  private cell = 0;
  private offX = 0;
  private offY = 0;

  walls: boolean[][] = [];
  weights: number[][] = [];
  start: Cell = { r: 0, c: 0 };
  end: Cell = { r: 0, c: 0 };

  algoId = "bfs";
  brush: Brush = "wall";
  diagonal = false;
  mazeId = "division";
  private seed = randomSeed();
  private fixedDims = false;

  private result: PathRun | null = null;
  private dirty = true;
  private _cursor = 0;
  private _total = 0;
  private cost = 0;
  private timeMs = 0;

  private visitT: number[][] = [];
  private visitRatio: number[][] = [];
  private pathT: number[] = [];

  private drag: Drag = null;
  private lastCell: Cell | null = null;
  hover: Cell | null = null;

  private particles = new Particles();
  private pendingBurst = false;

  get total(): number {
    return this._total;
  }
  get cursor(): number {
    return this._cursor;
  }
  get algo() {
    return PATH_BY_ID[this.algoId] ?? PATH_ALGOS[0];
  }

  /* ---------- layout ---------- */

  setViewport(ctx: CanvasRenderingContext2D, cssW: number, cssH: number): void {
    this.ctx = ctx;
    this.layout(cssW, cssH);
  }

  private layout(w: number, h: number): void {
    this.cssW = w;
    this.cssH = h;
    if (this.fixedDims && this.rows > 0 && this.cols > 0) {
      // dimensions came from a shared link - keep them, just refit cell size
      const cell = Math.min(w / this.cols, h / this.rows);
      this.cell = cell;
      this.offX = (w - this.cols * cell) / 2;
      this.offY = (h - this.rows * cell) / 2;
      return;
    }
    const target = 26;
    const cols = clamp(Math.floor(w / target), 8, 60);
    const rows = clamp(Math.floor(h / target), 6, 40);
    const cell = Math.min(w / cols, h / rows);
    this.cell = cell;
    this.offX = (w - cols * cell) / 2;
    this.offY = (h - rows * cell) / 2;
    if (cols !== this.cols || rows !== this.rows || !this.walls.length) {
      this.cols = cols;
      this.rows = rows;
      this.buildGrid();
    }
  }

  private buildGrid(): void {
    this.walls = makeGrid(this.rows, this.cols, () => false);
    this.weights = makeGrid(this.rows, this.cols, () => 1);
    this.start = { r: Math.floor(this.rows / 2), c: Math.max(1, Math.round(this.cols * 0.18)) };
    this.end = { r: Math.floor(this.rows / 2), c: Math.min(this.cols - 2, Math.round(this.cols * 0.82)) };
    this.clearRun();
  }

  private clearRun(): void {
    this.result = null;
    this.dirty = true;
    this._cursor = 0;
    this._total = 0;
    this.visitT = makeGrid(this.rows, this.cols, () => NaN);
    this.visitRatio = makeGrid(this.rows, this.cols, () => 0);
    this.pathT = [];
  }

  /** Mark the run stale (after edits / option changes). */
  invalidate(): void {
    this.clearRun();
  }

  /* ---------- options ---------- */

  setAlgo(id: string): void {
    this.algoId = id;
    this.invalidate();
  }
  setBrush(b: Brush): void {
    this.brush = b;
  }
  setDiagonal(on: boolean): void {
    this.diagonal = on;
    this.invalidate();
  }
  setMaze(id: string): void {
    this.mazeId = id;
  }

  /* ---------- engine ---------- */

  private problem(): PathProblem {
    return {
      rows: this.rows,
      cols: this.cols,
      walls: this.walls,
      weights: this.weights,
      start: this.start,
      end: this.end,
      diagonal: this.diagonal,
    };
  }

  prepare(): void {
    if (this.rows < 1 || this.cols < 1) return; // not laid out yet (zero-size canvas)
    if (!this.dirty && this.result) return;
    const t0 = performance.now();
    const res = this.algo.run(this.problem());
    const t1 = performance.now();
    this.timeMs = t1 - t0;
    let cost = 0;
    for (let i = 1; i < res.path.length; i++) {
      const p = res.path[i];
      cost += this.weights[p.r][p.c];
    }
    this.cost = cost;
    this.result = res;
    this._total = res.order.length + res.path.length;
    this.dirty = false;
    this.seekStart();
  }

  seekStart(): void {
    this._cursor = 0;
    this.particles.clear();
    this.pendingBurst = false;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        this.visitT[r][c] = NaN;
        this.visitRatio[r][c] = 0;
      }
    }
    this.pathT = this.result ? new Array(this.result.path.length).fill(NaN) : [];
  }

  seekEnd(t: number): void {
    this.stepForward(this._total - this._cursor, t, false);
  }

  isComplete(): boolean {
    return !!this.result && this._cursor >= this._total;
  }

  stepForward(n: number, t: number, live: boolean): void {
    if (!this.result) return;
    const wasComplete = this._cursor >= this._total;
    const ord = this.result.order;
    const oLen = ord.length;
    const c0 = this._cursor;
    const c1 = Math.min(this._total, this._cursor + n);
    const denom = Math.max(1, oLen - 1);
    for (let k = c0; k < c1; k++) {
      if (k < oLen) {
        const cellStep = ord[k];
        this.visitT[cellStep.r][cellStep.c] = t;
        this.visitRatio[cellStep.r][cellStep.c] = k / denom;
      } else {
        this.pathT[k - oLen] = t;
      }
    }
    this._cursor = c1;
    if (live && !wasComplete && this._cursor >= this._total && this.result.found) {
      this.pendingBurst = true;
    }
  }

  private dur(k: keyof typeof DURATIONS, instant: boolean): number {
    return instant ? 0 : DURATIONS[k];
  }

  // Instant flag is read globally via a setter to avoid threading it everywhere.
  instant = false;

  /* ---------- learning surface ---------- */

  activeLine(): number {
    if (!this.result || this._cursor <= 0) return -1;
    const ord = this.result.order;
    if (this._cursor <= ord.length) return ord[this._cursor - 1].line;
    return ord.length ? ord[ord.length - 1].line : -1;
  }

  narration(): string {
    if (!this.result || this._cursor <= 0) return "Press play, step, or scrub to watch the search unfold.";
    const ord = this.result.order;
    const notes = this.algo.lineNotes;
    if (this._cursor <= ord.length) {
      const step = ord[this._cursor - 1];
      const note = notes[step.line] ?? "";
      return `(${step.r}, ${step.c}) - ${note}`;
    }
    const k = this._cursor - ord.length;
    return `Tracing the route back from the goal: cell ${k} of ${this.result.path.length}.`;
  }

  info(): AlgorithmInfo {
    return this.algo.info;
  }
  pseudocode(): string[] {
    return this.algo.pseudocode;
  }

  stats(): Stat[] {
    const res = this.result;
    if (!res) {
      return [
        { key: "Algorithm", value: this.algo.name },
        { key: "Visited", value: "-" },
        { key: "Length", value: "-" },
        { key: "Cost", value: "-" },
        { key: "Time", value: "-" },
      ];
    }
    const oLen = res.order.length;
    const visited = fmtInt(Math.min(this._cursor, oLen));
    const complete = this.isComplete();
    const length = complete ? (res.found ? fmtInt(res.path.length) : "none") : fmtInt(Math.max(0, this._cursor - oLen));
    const cost = complete && res.found ? fmtInt(this.cost) : "-";
    return [
      { key: "Algorithm", value: this.algo.name },
      { key: "Visited", value: visited },
      { key: "Length", value: length },
      { key: "Cost", value: cost },
      { key: "Time", value: fmtTime(this.timeMs) },
    ];
  }

  legend(): LegendItem[] {
    return [
      { kind: "dot", color: "var(--mint)", label: "Start" },
      { kind: "dot", color: "var(--beam)", label: "End" },
      { kind: "square", color: "var(--wall)", label: "Wall" },
      { kind: "square", color: "rgba(245,176,90,0.7)", label: `Weight ×${WEIGHT}` },
      { kind: "gradient", color: gradientCss(), label: "Explored (by order)" },
      { kind: "line", color: "var(--beam)", label: "Shortest path" },
    ];
  }

  hint(): string {
    return "Drag to paint with the selected brush; drag the start or end node to move it. Scrub the timeline or press space to run.";
  }

  /* ---------- interaction ---------- */

  cellAt(px: number, py: number): Cell | null {
    const c = Math.floor((px - this.offX) / this.cell);
    const r = Math.floor((py - this.offY) / this.cell);
    if (r < 0 || c < 0 || r >= this.rows || c >= this.cols) return null;
    return { r, c };
  }
  isStart(r: number, c: number): boolean {
    return this.start.r === r && this.start.c === c;
  }
  isEnd(r: number, c: number): boolean {
    return this.end.r === r && this.end.c === c;
  }

  /** Returns true if the board changed (so the caller can recompute). */
  pointerDown(cell: Cell): boolean {
    if (this.isStart(cell.r, cell.c)) this.drag = "start";
    else if (this.isEnd(cell.r, cell.c)) this.drag = "end";
    else this.drag = "paint";
    this.lastCell = cell;
    return this.applyDrag(cell);
  }

  applyDrag(cell: Cell): boolean {
    const { r, c } = cell;
    let changed = false;
    if (this.drag === "start") {
      if (!this.walls[r][c] && !this.isEnd(r, c) && !this.isStart(r, c)) {
        this.start = { r, c };
        changed = true;
      }
    } else if (this.drag === "end") {
      if (!this.walls[r][c] && !this.isStart(r, c) && !this.isEnd(r, c)) {
        this.end = { r, c };
        changed = true;
      }
    } else if (this.drag === "paint") {
      if (this.isStart(r, c) || this.isEnd(r, c)) return false;
      if (this.brush === "wall") {
        if (!this.walls[r][c]) {
          this.walls[r][c] = true;
          this.weights[r][c] = 1;
          changed = true;
        }
      } else if (this.brush === "weight") {
        if (!this.walls[r][c] && this.weights[r][c] !== WEIGHT) {
          this.weights[r][c] = WEIGHT;
          changed = true;
        }
      } else if (this.brush === "erase") {
        if (this.walls[r][c] || this.weights[r][c] !== 1) {
          this.walls[r][c] = false;
          this.weights[r][c] = 1;
          changed = true;
        }
      }
    }
    if (changed) this.invalidate();
    return changed;
  }

  isDragging(): boolean {
    return this.drag !== null;
  }
  pointerUp(): void {
    this.drag = null;
    this.lastCell = null;
  }
  moveTo(cell: Cell): boolean {
    if (!this.drag) return false;
    if (!this.lastCell || this.lastCell.r !== cell.r || this.lastCell.c !== cell.c) {
      this.lastCell = cell;
      return this.applyDrag(cell);
    }
    return false;
  }

  /* ---------- board ops ---------- */

  /** Re-enable viewport auto-fit (after a shared link / tutorial fixed the dimensions). */
  unlockDims(): void {
    this.fixedDims = false;
  }

  generateMaze(): void {
    // a maze should fill the natural viewport grid, not a locked shared/tutorial size
    if (this.fixedDims) {
      this.fixedDims = false;
      this.layout(this.cssW, this.cssH);
    }
    const gen = MAZES[this.mazeId] ?? MAZES.division;
    const rng = makeRng(this.seed);
    const { walls, weights } = gen.generate(this.rows, this.cols, rng);
    this.walls = walls;
    if (weights) this.weights = weights;
    else this.weights = makeGrid(this.rows, this.cols, () => 1);
    // keep start/end and their neighbours open
    const dirs = dirsFor(true);
    for (const nd of [this.start, this.end]) {
      this.walls[nd.r][nd.c] = false;
      for (const d of dirs) {
        const nr = nd.r + d[0];
        const nc = nd.c + d[1];
        if (nr >= 0 && nc >= 0 && nr < this.rows && nc < this.cols) this.walls[nr][nc] = false;
      }
    }
    this.seed = randomSeed();
    this.clearRun();
  }

  clearBoard(): void {
    // a fresh board returns to the natural viewport grid if dims were locked
    if (this.fixedDims) {
      this.fixedDims = false;
      this.layout(this.cssW, this.cssH);
    }
    this.walls = makeGrid(this.rows, this.cols, () => false);
    this.weights = makeGrid(this.rows, this.cols, () => 1);
    this.clearRun();
  }

  /* ---------- share state ---------- */

  snapshot(): {
    algo: string;
    diagonal: boolean;
    rows: number;
    cols: number;
    start: Cell;
    end: Cell;
    walls: boolean[][];
    weights: number[][];
  } {
    return {
      algo: this.algoId,
      diagonal: this.diagonal,
      rows: this.rows,
      cols: this.cols,
      start: this.start,
      end: this.end,
      walls: this.walls,
      weights: this.weights,
    };
  }

  loadBoard(
    rows: number,
    cols: number,
    start: Cell,
    end: Cell,
    walls: boolean[][],
    weights: number[][],
    algo: string,
    diagonal: boolean,
  ): void {
    this.fixedDims = true;
    this.rows = rows;
    this.cols = cols;
    this.start = { r: clamp(start.r, 0, rows - 1), c: clamp(start.c, 0, cols - 1) };
    this.end = { r: clamp(end.r, 0, rows - 1), c: clamp(end.c, 0, cols - 1) };
    this.walls = walls;
    this.weights = weights;
    this.algoId = algo;
    this.diagonal = diagonal;
    this.clearRun();
  }

  /* ---------- render ---------- */

  render(t: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const { cssW, cssH, cell, offX, offY, rows, cols } = this;
    ctx.clearRect(0, 0, cssW, cssH);

    // grid lines
    ctx.strokeStyle = css("--grid-line");
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let c = 0; c <= cols; c++) {
      const x = Math.round(offX + c * cell) + 0.5;
      ctx.moveTo(x, offY);
      ctx.lineTo(x, offY + rows * cell);
    }
    for (let r = 0; r <= rows; r++) {
      const y = Math.round(offY + r * cell) + 0.5;
      ctx.moveTo(offX, y);
      ctx.lineTo(offX + cols * cell, y);
    }
    ctx.stroke();

    const rad = cell > 14 ? 2.5 : 0;

    // weighted cells
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (this.weights[r][c] <= 1 || this.walls[r][c]) continue;
        const x = offX + c * cell + 1;
        const y = offY + r * cell + 1;
        const s = cell - 2;
        roundRect(ctx, x, y, s, s, rad);
        ctx.fillStyle = "rgba(245,176,90,0.14)";
        ctx.fill();
        ctx.fillStyle = "rgba(245,176,90,0.5)";
        const dr = Math.max(1, cell * 0.07);
        ctx.beginPath();
        ctx.arc(offX + c * cell + cell / 2, offY + r * cell + cell / 2, dr, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // explored frontier (heat by visit order)
    const fadeD = this.dur("fade", this.instant);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const vt = this.visitT[r][c];
        if (Number.isNaN(vt)) continue;
        if (this.isStart(r, c) || this.isEnd(r, c)) continue;
        const a = fadeD ? clamp((t - vt) / fadeD, 0, 1) : 1;
        const col = sample(this.visitRatio[r][c]);
        const x = offX + c * cell + 1;
        const y = offY + r * cell + 1;
        const s = cell - 2;
        const grow = fadeD ? 0.55 + 0.45 * easeOut(a) : 1;
        const inset = ((1 - grow) * s) / 2;
        roundRect(ctx, x + inset, y + inset, s * grow, s * grow, rad);
        ctx.fillStyle = rgba(col, 0.3 + 0.62 * a);
        ctx.fill();
      }
    }

    // walls
    const wallColor = css("--wall");
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!this.walls[r][c]) continue;
        const x = offX + c * cell + 0.5;
        const y = offY + r * cell + 0.5;
        const s = cell - 1;
        ctx.fillStyle = wallColor;
        roundRect(ctx, x, y, s, s, rad);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.06)";
        ctx.fillRect(x + 1, y + 1, s - 2, Math.max(1, cell * 0.16));
      }
    }

    // shortest-path beam
    if (this.result && this.result.path.length) {
      const popD = this.dur("pop", this.instant);
      const pts: { x: number; y: number; a: number }[] = [];
      for (let i = 0; i < this.result.path.length; i++) {
        const pt = this.pathT[i];
        if (Number.isNaN(pt)) break;
        const cp = this.result.path[i];
        pts.push({
          x: offX + cp.c * cell + cell / 2,
          y: offY + cp.r * cell + cell / 2,
          a: popD ? clamp((t - pt) / popD, 0, 1) : 1,
        });
      }
      if (pts.length) {
        const coords = pts.map((p) => ({ x: p.x, y: p.y }));
        const lastA = easeOut(pts[pts.length - 1].a);
        if (coords.length >= 2 && lastA < 1) {
          const a = coords[coords.length - 2];
          const b = coords[coords.length - 1];
          coords[coords.length - 1] = { x: a.x + (b.x - a.x) * lastA, y: a.y + (b.y - a.y) * lastA };
        }
        const beam = cssRGB("--beam");
        ctx.save();
        ctx.strokeStyle = css("--beam");
        ctx.lineWidth = Math.max(2.5, cell * 0.3);
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.shadowColor = rgba(beam, 0.55);
        ctx.shadowBlur = Math.max(6, cell * 0.7) * (0.82 + 0.18 * Math.sin(t / 260));
        ctx.beginPath();
        ctx.moveTo(coords[0].x, coords[0].y);
        for (let i = 1; i < coords.length; i++) ctx.lineTo(coords[i].x, coords[i].y);
        ctx.stroke();
        ctx.restore();
      }
    }

    // hover outline
    if (this.hover && !this.drag) {
      const { r, c } = this.hover;
      if (!this.isStart(r, c) && !this.isEnd(r, c)) {
        ctx.strokeStyle = rgba(cssRGB("--mist"), 0.5);
        ctx.lineWidth = 1.5;
        roundRect(ctx, offX + c * cell + 1.5, offY + r * cell + 1.5, cell - 3, cell - 3, rad);
        ctx.stroke();
      }
    }

    this.drawNode(ctx, this.start, css("--mint"), "start", t);
    this.drawNode(ctx, this.end, css("--beam"), "end", t);

    // celebratory burst when a live run reaches the goal
    if (this.pendingBurst) {
      const ex = offX + this.end.c * cell + cell / 2;
      const ey = offY + this.end.r * cell + cell / 2;
      this.particles.burst(ex, ey, cssRGB("--beam"), 28, Math.max(70, cell * 4), t);
      this.pendingBurst = false;
    }
    this.particles.draw(ctx, t);
  }

  private drawNode(ctx: CanvasRenderingContext2D, n: Cell, color: string, kind: "start" | "end", t: number): void {
    const { cell, offX, offY } = this;
    const cx = offX + n.c * cell + cell / 2;
    const cy = offY + n.r * cell + cell / 2;
    const Rr = cell * 0.5;
    // soft pulsing aura
    const pulse = (t % 1700) / 1700;
    ctx.save();
    ctx.globalAlpha = (1 - pulse) * 0.45;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, cell * 0.06);
    ctx.beginPath();
    ctx.arc(cx, cy, Rr * 0.55 + pulse * Rr * 0.85, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = cell * 0.5;
    if (kind === "start") {
      ctx.fillStyle = color;
      roundRect(ctx, cx - Rr * 0.74, cy - Rr * 0.74, Rr * 1.48, Rr * 1.48, cell > 14 ? 3 : 1.5);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(4,18,16,0.85)";
      ctx.beginPath();
      ctx.moveTo(cx - Rr * 0.22, cy - Rr * 0.34);
      ctx.lineTo(cx + Rr * 0.4, cy);
      ctx.lineTo(cx - Rr * 0.22, cy + Rr * 0.34);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(2, cell * 0.16);
      ctx.beginPath();
      ctx.arc(cx, cy, Rr * 0.72, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx, cy, Rr * 0.26, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function gradientCss(): string {
  const stops: RGB[] = [
    [27, 17, 69],
    [91, 26, 107],
    [165, 34, 88],
    [224, 75, 54],
    [245, 139, 44],
    [251, 210, 75],
  ];
  return `linear-gradient(90deg,${stops.map((s) => `rgb(${s[0]},${s[1]},${s[2]})`).join(",")})`;
}
