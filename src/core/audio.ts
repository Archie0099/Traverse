/** Lazy Web Audio module: a short triangle tone whose pitch tracks a value. Off by default. */
class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private last = 0;
  enabled = false;

  private ensure(): void {
    if (this.ctx) return;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.05;
    this.master.connect(this.ctx.destination);
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    if (this.enabled) {
      this.ensure();
      if (this.ctx && this.ctx.state === "suspended") void this.ctx.resume();
    }
    return this.enabled;
  }

  /** Throttled (≥11 ms) note. Caller must gate on live playback (never during scrub/seek/instant). */
  note(value: number, max: number): void {
    if (!this.enabled || !this.ctx || !this.master) return;
    const tn = performance.now();
    if (tn - this.last < 11) return;
    this.last = tn;
    const t = this.ctx.currentTime;
    const ratio = (value - 1) / Math.max(1, max - 1);
    const freq = 174 + ratio * 742;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "triangle";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.9, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.075);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + 0.09);
  }
}

export const audio = new AudioEngine();
