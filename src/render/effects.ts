import { rgba, type RGB } from "../core/util/color";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  born: number;
  life: number;
  size: number;
  color: RGB;
}

/**
 * Lightweight time-based particle system for celebratory bursts (path found,
 * sort confirmed). Purely a function of wall-clock time, so it composes with the
 * scrub/seek model - it is only ever *emitted* during live playback.
 */
export class Particles {
  private ps: Particle[] = [];

  burst(x: number, y: number, color: RGB, count = 20, speed = 90, now = performance.now()): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.3 + Math.random() * 0.7);
      this.ps.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - speed * 0.25,
        born: now,
        life: 520 + Math.random() * 460,
        size: 1.4 + Math.random() * 2.6,
        color,
      });
    }
  }

  /** A horizontal spray across a rectangle's top edge (sort-track finish). */
  sweep(x: number, y: number, w: number, color: RGB, count = 26, speed = 90, now = performance.now()): void {
    for (let i = 0; i < count; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.1;
      const s = speed * (0.4 + Math.random() * 0.8);
      this.ps.push({
        x: x + Math.random() * w,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        born: now,
        life: 460 + Math.random() * 420,
        size: 1.3 + Math.random() * 2.3,
        color,
      });
    }
  }

  get active(): boolean {
    return this.ps.length > 0;
  }

  clear(): void {
    this.ps.length = 0;
  }

  draw(ctx: CanvasRenderingContext2D, t: number): void {
    if (!this.ps.length) return;
    const grav = 150;
    ctx.save();
    for (let i = this.ps.length - 1; i >= 0; i--) {
      const p = this.ps[i];
      const age = t - p.born;
      if (age >= p.life) {
        this.ps.splice(i, 1);
        continue;
      }
      const k = age / 1000;
      const x = p.x + p.vx * k;
      const y = p.y + p.vy * k + 0.5 * grav * k * k;
      const al = 1 - age / p.life;
      ctx.beginPath();
      ctx.fillStyle = rgba(p.color, al * 0.9);
      ctx.arc(x, y, p.size * (0.6 + 0.4 * al), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
