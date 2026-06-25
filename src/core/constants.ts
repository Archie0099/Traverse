/** Animation durations in ms. `dur()` returns 0 when Instant mode is on. */
export const DURATIONS = { fade: 220, pop: 260, flash: 200, confirm: 720 } as const;
export type DurationKey = keyof typeof DURATIONS;

/** Max operations applied per animation frame - keeps the fastest speeds smooth. */
export const MAX_STEPS_PER_FRAME = 2500;

/** Movement cost of a weighted cell (weighted algorithms pay this; others ignore it). */
export const WEIGHT = 6;

/** Logarithmic speed mapping: slider 0 → slow, 100 → fast. */
const SPEED_MAX_MS = 320;
const SPEED_MIN_MS = 0.8;

/** Convert a 0-100 speed slider value into milliseconds-per-step. */
export function msPerStep(slider: number): number {
  return SPEED_MAX_MS * Math.pow(SPEED_MIN_MS / SPEED_MAX_MS, slider / 100);
}

/** Human-friendly "steps per second" for a slider value. */
export function stepsPerSec(slider: number): number {
  return Math.max(1, Math.round(1000 / msPerStep(slider)));
}
