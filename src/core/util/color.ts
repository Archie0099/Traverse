import { clamp01 } from "./easing";

export type RGB = [number, number, number];

/** Default "inferno"-style colormap: indigo → magenta → orange → yellow. */
export const INFERNO: RGB[] = [
  [27, 17, 69],
  [91, 26, 107],
  [165, 34, 88],
  [224, 75, 54],
  [245, 139, 44],
  [251, 210, 75],
];

/** Alternate colormaps for the theme system (used by renderers + legend). */
export const COLORMAPS: Record<string, RGB[]> = {
  inferno: INFERNO,
  viridis: [
    [68, 1, 84],
    [59, 82, 139],
    [33, 145, 140],
    [94, 201, 98],
    [253, 231, 37],
  ],
  ice: [
    [8, 20, 48],
    [20, 70, 120],
    [40, 140, 190],
    [120, 210, 230],
    [233, 250, 255],
  ],
};

/** Sample a colormap at t ∈ [0,1]. */
export function sample(t: number, stops: RGB[] = INFERNO): RGB {
  t = clamp01(t);
  const n = stops.length - 1;
  const x = t * n;
  const i = Math.min(n - 1, Math.floor(x));
  const f = x - i;
  const a = stops[i];
  const b = stops[i + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

export const rgba = (c: RGB, a: number): string => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
export const rgb = (c: RGB): string => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
export const toWhite = (c: RGB, f: number): RGB => [
  c[0] + (255 - c[0]) * f,
  c[1] + (255 - c[1]) * f,
  c[2] + (255 - c[2]) * f,
];
export const dim = (c: RGB, f: number): RGB => [c[0] * f, c[1] * f, c[2] * f];
/** Linear blend from c toward target by fraction f. */
export const mix = (c: RGB, target: RGB, f: number): RGB => [
  c[0] + (target[0] - c[0]) * f,
  c[1] + (target[1] - c[1]) * f,
  c[2] + (target[2] - c[2]) * f,
];

/** Parse "rgb(r,g,b)" / "#rrggbb" → RGB. Falls back to white. */
export function parseColor(s: string): RGB {
  s = s.trim();
  if (s.startsWith("#")) {
    const hex = s.slice(1);
    const full = hex.length === 3 ? hex.split("").map((d) => d + d).join("") : hex;
    const n = parseInt(full, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const m = s.match(/(\d+(?:\.\d+)?)/g);
  if (m && m.length >= 3) return [+m[0], +m[1], +m[2]];
  return [255, 255, 255];
}
