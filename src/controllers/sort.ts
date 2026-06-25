import type { Controller, AlgorithmInfo, Stat, LegendItem, SortOp } from "../core/types";
import { DURATIONS } from "../core/constants";
import { clamp, easeOut } from "../core/util/easing";
import { sample, dim, mix, rgb, rgba, type RGB } from "../core/util/color";
import { css, cssRGB } from "../core/util/palette";
import { Particles } from "../render/effects";
import { fmtInt, fmtTime } from "../core/util/format";
import { makeRng, randomSeed, shuffled } from "../core/util/rng";
import { audio } from "../core/audio";
import { SORT_BY_ID, SORT_ALGOS } from "../algorithms/sorting";

export const COLOR_A: RGB = [95, 227, 240];
export const COLOR_B: RGB = [255, 106, 139];

interface Track {
  algoId: string;
  name: string;
  colorBase: RGB | null;
  arr: number[];
  ops: SortOp[];
  cursor: number;
  comp: number;
  swaps: number;
  flash: Float64Array;
  pivot: number;
  cmpA: number;
  cmpB: number;
  line: number;
  done: boolean;
  doneOps: number;
  finishStep: number;
  confirmStart: number;
}

export class SortController implements Controller {
  private ctx: CanvasRenderingContext2D | null = null;
  private cssW = 0;
  private cssH = 0;

  size = 48;
  race = false;
  algoAId = "bubble";
  algoBId = "merge";
  instant = false;

  private seed = randomSeed();
  private baseline: number[] = [];
  private tracks: Track[] = [];
  private dirty = true;
  private _cursor = 0;
  private _total = 0;
  private computeMsA = 0;
  private finishCounter = 0;
  private particles = new Particles();
  private pendingBursts: number[] = [];

  get total(): number {
    return this._total;
  }
  get cursor(): number {
    return this._cursor;
  }
  private algoA() {
    return SORT_BY_ID[this.algoAId] ?? SORT_ALGOS[0];
  }
  private algoB() {
    return SORT_BY_ID[this.algoBId] ?? SORT_ALGOS[0];
  }

  setViewport(ctx: CanvasRenderingContext2D, cssW: number, cssH: number): void {
    this.ctx = ctx;
    this.cssW = cssW;
    this.cssH = cssH;
  }

  private ensureBaseline(): void {
    if (!this.baseline.length || this.baseline.length !== this.size) {
      this.baseline = shuffled(this.size, makeRng(this.seed));
    }
  }

  private blankTrack(algoId: string, color: RGB | null): Track {
    return {
      algoId,
      name: (SORT_BY_ID[algoId] ?? SORT_ALGOS[0]).name,
      colorBase: color,
      arr: this.baseline.slice(),
      ops: [],
      cursor: 0,
      comp: 0,
      swaps: 0,
      flash: new Float64Array(this.size).fill(NaN),
      pivot: -1,
      cmpA: -1,
      cmpB: -1,
      line: -1,
      done: false,
      doneOps: 0,
      finishStep: -1,
      confirmStart: 0,
    };
  }

  private makeTracks(): void {
    this.ensureBaseline();
    const defs: { algo: string; color: RGB | null }[] = this.race
      ? [
          { algo: this.algoAId, color: COLOR_A },
          { algo: this.algoBId, color: COLOR_B },
        ]
      : [{ algo: this.algoAId, color: null }];
    this.tracks = defs.map((d) => this.blankTrack(d.algo, d.color));
  }

  invalidate(): void {
    this.dirty = true;
    this.tracks = [];
  }
  shuffle(): void {
    this.seed = randomSeed();
    this.baseline = shuffled(this.size, makeRng(this.seed));
    this.invalidate();
  }
  setSize(n: number): void {
    this.size = n;
    this.baseline = shuffled(n, makeRng(this.seed));
    this.invalidate();
  }
  setAlgoA(id: string): void {
    this.algoAId = id;
    this.invalidate();
  }
  setAlgoB(id: string): void {
    this.algoBId = id;
    this.invalidate();
  }
  setRace(on: boolean): void {
    this.race = on;
    this.invalidate();
  }

  snapshot(): { algoA: string; algoB: string; race: boolean; size: number; seed: number } {
    return { algoA: this.algoAId, algoB: this.algoBId, race: this.race, size: this.size, seed: this.seed };
  }

  loadState(size: number, seed: number, algoA: string, algoB: string, race: boolean): void {
    this.size = size;
    this.seed = seed >>> 0;
    this.algoAId = algoA;
    this.algoBId = algoB;
    this.race = race;
    this.baseline = shuffled(size, makeRng(this.seed));
    this.invalidate();
  }

  prepare(): void {
    if (!this.dirty && this.tracks.length) return;
    this.makeTracks();
    this.finishCounter = 0;
    for (const tk of this.tracks) {
      const copy = this.baseline.slice();
      const t0 = performance.now();
      tk.ops = (SORT_BY_ID[tk.algoId] ?? SORT_ALGOS[0]).gen(copy);
      const t1 = performance.now();
      if (tk === this.tracks[0]) this.computeMsA = t1 - t0;
    }
    this._total = this.tracks.reduce((m, tk) => Math.max(m, tk.ops.length), 0);
    this.dirty = false;
    this.seekStart();
  }

  private resetTrack(tk: Track): void {
    tk.arr = this.baseline.slice();
    tk.cursor = 0;
    tk.comp = 0;
    tk.swaps = 0;
    tk.flash = new Float64Array(this.size).fill(NaN);
    tk.pivot = -1;
    tk.cmpA = -1;
    tk.cmpB = -1;
    tk.line = -1;
    tk.done = false;
    tk.doneOps = 0;
    tk.finishStep = -1;
    tk.confirmStart = 0;
  }

  seekStart(): void {
    for (const tk of this.tracks) this.resetTrack(tk);
    this.finishCounter = 0;
    this._cursor = 0;
    this.particles.clear();
    this.pendingBursts.length = 0;
  }

  seekEnd(t: number): void {
    this.stepForward(this._total - this._cursor, t, false);
  }

  isComplete(): boolean {
    return this.tracks.length > 0 && this.tracks.every((tk) => tk.cursor >= tk.ops.length);
  }

  stepForward(n: number, t: number, live: boolean): void {
    let maxC = 0;
    for (let idx = 0; idx < this.tracks.length; idx++) {
      const tk = this.tracks[idx];
      const c1 = Math.min(tk.ops.length, tk.cursor + n);
      for (let k = tk.cursor; k < c1; k++) this.applyOp(tk, tk.ops[k], t, live);
      tk.cursor = c1;
      if (c1 >= tk.ops.length && !tk.done) {
        tk.done = true;
        tk.finishStep = this.finishCounter++;
        tk.doneOps = tk.comp + tk.swaps;
        tk.confirmStart = t;
        tk.pivot = -1;
        tk.cmpA = -1;
        tk.cmpB = -1;
        if (live) this.pendingBursts.push(idx);
      }
      if (tk.cursor > maxC) maxC = tk.cursor;
    }
    this._cursor = maxC;
  }

  private trackRect(i: number): { x: number; y: number; w: number; h: number } {
    if (this.tracks.length <= 1) return { x: 0, y: 0, w: this.cssW, h: this.cssH };
    const gap = 14;
    const th = (this.cssH - gap) / 2;
    return { x: 0, y: i === 0 ? 0 : th + gap, w: this.cssW, h: th };
  }

  private applyOp(tk: Track, op: SortOp, t: number, live: boolean): void {
    tk.line = op.line;
    if (op.t === "cmp") {
      tk.comp++;
      tk.cmpA = op.i;
      tk.cmpB = op.j ?? -1;
    } else if (op.t === "swap") {
      tk.swaps++;
      const a = tk.arr;
      const j = op.j ?? op.i;
      const x = a[op.i];
      a[op.i] = a[j];
      a[j] = x;
      tk.flash[op.i] = t;
      tk.flash[j] = t;
      tk.cmpA = op.i;
      tk.cmpB = j;
      if (live && !tk.colorBase) audio.note(a[op.i], this.size);
    } else if (op.t === "set") {
      tk.swaps++;
      const v = op.v ?? 0;
      tk.arr[op.i] = v;
      tk.flash[op.i] = t;
      if (live && !tk.colorBase) audio.note(v, this.size);
    } else if (op.t === "pivot") {
      tk.pivot = op.i;
    } else if (op.t === "unpivot") {
      tk.pivot = -1;
    }
  }

  private dur(k: keyof typeof DURATIONS): number {
    return this.instant ? 0 : DURATIONS[k];
  }

  /* ---------- learning surface ---------- */

  activeLine(): number {
    const tk = this.tracks[0];
    return tk && this._cursor > 0 ? tk.line : -1;
  }

  narration(): string {
    if (this.race) {
      return `Racing ${this.algoA().name} (A) against ${this.algoB().name} (B) on the same shuffle.`;
    }
    const tk = this.tracks[0];
    if (!tk || this._cursor <= 0) return "Press play, step, or scrub to watch the sort unfold.";
    const note = this.algoA().lineNotes[tk.line] ?? "";
    return note;
  }

  info(): AlgorithmInfo {
    return this.algoA().info;
  }
  pseudocode(): string[] {
    return this.algoA().pseudocode;
  }

  stats(): Stat[] {
    if (!this.race) {
      const tk = this.tracks[0];
      return [
        { key: "Algorithm", value: this.algoA().name },
        { key: "Comparisons", value: tk ? fmtInt(tk.comp) : "0" },
        { key: "Swaps / writes", value: tk ? fmtInt(tk.swaps) : "0" },
        { key: "Array", value: fmtInt(this.size) },
        { key: "Time", value: this.tracks.length ? fmtTime(this.computeMsA) : "-" },
      ];
    }
    const A = this.tracks[0];
    const B = this.tracks[1];
    const stat = (tk: Track | undefined): string =>
      tk ? `cmp ${fmtInt(tk.comp)} · swap ${fmtInt(tk.swaps)}${tk.done ? ` · done (${fmtInt(tk.doneOps)})` : ""}` : "-";
    let result = "Race ready - press play.";
    if (A && B && A.done && B.done) {
      if (A.doneOps === B.doneOps) result = `Tie - both in ${fmtInt(A.doneOps)} ops.`;
      else {
        // winner is the FEWER-operations track (the teaching metric), not playback order
        const win = A.doneOps < B.doneOps ? A : B;
        const lose = win === A ? B : A;
        result = `${win.name} won - ${fmtInt(win.doneOps)} vs ${fmtInt(lose.doneOps)} ops.`;
      }
    } else if (A && B) {
      result = "Racing…";
    }
    return [
      { key: `A · ${this.algoA().name}`, value: stat(A) },
      { key: `B · ${this.algoB().name}`, value: stat(B) },
      { key: "Result", value: result },
    ];
  }

  legend(): LegendItem[] {
    if (this.race) {
      return [
        { kind: "square", color: rgb(COLOR_A), label: "A" },
        { kind: "square", color: rgb(COLOR_B), label: "B" },
        { kind: "square", color: "var(--flash)", label: "Swap / write" },
        { kind: "line", color: "transparent", label: "Same speed - fewer operations wins." },
      ];
    }
    return [
      { kind: "gradient", color: gradientCss(), label: "Value (small → large)" },
      { kind: "square", color: "var(--mist)", label: "Comparing" },
      { kind: "square", color: "var(--flash)", label: "Swap / write" },
      { kind: "square", color: "var(--beam)", label: "Pivot" },
    ];
  }

  hint(): string {
    return "Pick an algorithm and press play. Turn on Race to compare two on the same shuffle, or scrub the timeline by hand.";
  }

  /* ---------- render ---------- */

  render(t: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const W = this.cssW;
    const H = this.cssH;
    ctx.clearRect(0, 0, W, H);
    if (this.tracks.length === 0) {
      this.ensureBaseline();
      const ghost: Track = {
        algoId: this.algoAId,
        name: "",
        colorBase: null,
        arr: this.baseline,
        ops: [],
        cursor: 0,
        comp: 0,
        swaps: 0,
        flash: new Float64Array(0),
        pivot: -1,
        cmpA: -1,
        cmpB: -1,
        line: -1,
        done: false,
        doneOps: 0,
        finishStep: -1,
        confirmStart: 0,
      };
      this.drawBars(ctx, ghost, { x: 0, y: 0, w: W, h: H }, t);
      return;
    }
    if (this.tracks.length === 1) {
      this.drawBars(ctx, this.tracks[0], { x: 0, y: 0, w: W, h: H }, t);
    } else {
      const gap = 14;
      const th = (H - gap) / 2;
      this.drawBars(ctx, this.tracks[0], { x: 0, y: 0, w: W, h: th }, t);
      this.drawBars(ctx, this.tracks[1], { x: 0, y: th + gap, w: W, h: th }, t);
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, Math.round(th + gap / 2) + 0.5);
      ctx.lineTo(W, Math.round(th + gap / 2) + 0.5);
      ctx.stroke();
    }

    // celebratory sweep when a track finishes during live playback
    if (this.pendingBursts.length) {
      for (const idx of this.pendingBursts) {
        const tk = this.tracks[idx];
        if (!tk) continue;
        const rect = this.trackRect(idx);
        const color = tk.colorBase ?? cssRGB("--beam");
        this.particles.sweep(rect.x, rect.y + rect.h * 0.62, rect.w, color, 34, rect.h * 0.9, t);
      }
      this.pendingBursts.length = 0;
    }
    this.particles.draw(ctx, t);
  }

  private drawBars(
    ctx: CanvasRenderingContext2D,
    tk: Track,
    rect: { x: number; y: number; w: number; h: number },
    t: number,
  ): void {
    const arr = tk.arr.length ? tk.arr : this.baseline;
    const n = arr.length;
    if (!n) return;
    const bw = rect.w / n;
    const flashD = this.dur("flash");
    const flashTo = cssRGB("--flash"); // theme-aware highlight (white on dark, dark on light)
    const maxV = this.size;
    const confirmD = this.dur("confirm");
    const confirming = tk.done && confirmD > 0 && t - tk.confirmStart < confirmD;
    const wave = confirming ? ((t - tk.confirmStart) / confirmD) * rect.w : -1;
    const band = rect.w * 0.14;
    const gap = bw > 3 ? 1 : 0;
    for (let i = 0; i < n; i++) {
      const v = arr[i];
      const valR = (v - 1) / Math.max(1, this.size - 1);
      let base: RGB = tk.colorBase ? dim(tk.colorBase, 0.34 + 0.66 * valR) : sample(valR);
      if (tk.flash.length) {
        const ft = tk.flash[i];
        if (!Number.isNaN(ft)) {
          const fa = flashD ? clamp((t - ft) / flashD, 0, 1) : 1;
          if (fa < 1) base = mix(base, flashTo, (1 - easeOut(fa)) * 0.92);
        }
      }
      if (confirming) {
        const cx = i * bw + bw / 2;
        const d = wave - cx;
        if (d >= 0 && d < band) base = mix(base, flashTo, (1 - d / band) * 0.85);
      }
      const bh = (v / maxV) * rect.h * 0.97;
      const bx = rect.x + i * bw;
      const by = rect.y + rect.h - bh;
      const bWidth = Math.max(1, bw - gap);
      ctx.fillStyle = rgb(base);
      const r = bw > 6 ? Math.min(3, bWidth / 2, bh) : 0;
      if (r > 0) {
        ctx.beginPath();
        ctx.roundRect(bx, by, bWidth, bh, [r, r, 0, 0]);
        ctx.fill();
      } else {
        ctx.fillRect(bx, by, bWidth, bh);
      }
      if (bh > 3) {
        ctx.fillStyle = rgba([255, 255, 255], 0.16);
        ctx.fillRect(bx, by, bWidth, Math.max(1, bh * 0.05));
      }
    }
    if (tk.pivot >= 0 && tk.pivot < n) {
      const i = tk.pivot;
      const v = arr[i];
      const bh = (v / maxV) * rect.h * 0.97;
      ctx.strokeStyle = css("--beam");
      ctx.lineWidth = Math.min(2, Math.max(1, bw * 0.3));
      ctx.strokeRect(rect.x + i * bw + 0.5, rect.y + rect.h - bh + 0.5, Math.max(1, bw - gap - 1), Math.max(1, bh - 1));
    }
    const capH = Math.max(2, rect.h * 0.02);
    const capColor = rgba(cssRGB("--mist"), 0.95);
    const cap = (k: number): void => {
      const v = arr[k];
      const bh = (v / maxV) * rect.h * 0.97;
      ctx.fillStyle = capColor;
      ctx.fillRect(rect.x + k * bw, rect.y + rect.h - bh, Math.max(1, bw - gap), capH);
    };
    if (tk.cmpA >= 0 && tk.cmpA < n) cap(tk.cmpA);
    if (tk.cmpB >= 0 && tk.cmpB < n) cap(tk.cmpB);
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
