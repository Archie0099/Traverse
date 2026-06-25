import { parseColor, type RGB } from "./color";

/**
 * Cached reader for CSS custom properties. Reading getComputedStyle per cell per
 * frame is slow, so we memoize and clear the cache whenever the theme changes.
 */
const cache = new Map<string, string>();

export function css(name: string): string {
  let v = cache.get(name);
  if (v === undefined) {
    v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    cache.set(name, v);
  }
  return v;
}

export function cssRGB(name: string): RGB {
  return parseColor(css(name));
}

/** Call after switching themes so cached colors are re-read. */
export function refreshPalette(): void {
  cache.clear();
}
