import type { Controller } from "./types";
import { MAX_STEPS_PER_FRAME } from "./constants";

export interface PlayerHooks {
  getController(): Controller;
  /** Milliseconds per step for the current speed slider. */
  getMsPerStep(): number;
  isInstant(): boolean;
  /** Called every frame after render - UI updates the readout + scrubber here. */
  onTick(c: Controller): void;
  onPlayingChange(playing: boolean): void;
}

/**
 * Transport over the precompute→playback model. A single rAF loop advances the
 * active controller's cursor; everything else (scrub, instant, step) is a
 * variation on how fast the cursor moves.
 */
export class Player {
  private rafId: number | null = null;
  private lastT = 0;
  private acc = 0;
  private dirtyUntil = 0;
  private playing = false;

  constructor(private hooks: PlayerHooks) {}

  get isPlaying(): boolean {
    return this.playing;
  }

  private now(): number {
    return performance.now();
  }

  private ensureLoop(): void {
    if (this.rafId == null) {
      this.lastT = this.now();
      this.rafId = requestAnimationFrame(this.loop);
    }
  }

  /** Wake the loop for render-only frames for `ms` (after edits, seeks, theme changes). */
  requestRender(ms = 450): void {
    this.dirtyUntil = Math.max(this.dirtyUntil, this.now() + ms);
    this.ensureLoop();
  }

  private setPlaying(v: boolean): void {
    if (this.playing === v) return;
    this.playing = v;
    this.hooks.onPlayingChange(v);
  }

  private loop = (t: number): void => {
    const dt = Math.min(64, t - this.lastT);
    this.lastT = t;
    const c = this.hooks.getController();
    if (this.playing) {
      if (c.isComplete()) {
        this.setPlaying(false);
      } else {
        this.acc += dt;
        const mps = this.hooks.getMsPerStep();
        let budget = MAX_STEPS_PER_FRAME;
        while (this.acc >= mps && budget > 0 && !c.isComplete()) {
          c.stepForward(1, t, true);
          this.acc -= mps;
          budget--;
        }
        if (c.isComplete()) this.setPlaying(false);
      }
    }
    c.render(t);
    this.hooks.onTick(c);
    if (this.playing || t < this.dirtyUntil) {
      this.rafId = requestAnimationFrame(this.loop);
    } else {
      this.rafId = null;
    }
  };

  play(): void {
    const c = this.hooks.getController();
    c.prepare();
    if (c.isComplete()) c.seekStart();
    if (this.hooks.isInstant()) {
      c.seekEnd(this.now());
      this.setPlaying(false);
      this.requestRender();
      return;
    }
    this.acc = 0;
    this.setPlaying(true);
    this.ensureLoop();
  }

  pause(): void {
    this.setPlaying(false);
  }

  toggle(): void {
    if (this.playing) this.pause();
    else this.play();
  }

  step(): void {
    if (this.playing) this.pause();
    const c = this.hooks.getController();
    c.prepare();
    if (c.isComplete()) return;
    c.stepForward(1, this.now(), true);
    this.requestRender();
  }

  reset(): void {
    this.pause();
    const c = this.hooks.getController();
    c.prepare();
    c.seekStart();
    this.requestRender();
  }

  /** Recompute the run and settle at the start (after edits / algorithm changes). */
  refresh(): void {
    const c = this.hooks.getController();
    c.prepare();
    c.seekStart();
    this.requestRender();
  }

  /** Scrub to an absolute cursor index, rendered fully settled (no animation/sound). */
  seekTo(idx: number): void {
    this.pause();
    const c = this.hooks.getController();
    c.prepare();
    const past = this.now() - 1e6;
    c.seekStart();
    c.stepForward(Math.max(0, Math.min(idx, c.total)), past, false);
    this.requestRender();
  }
}
