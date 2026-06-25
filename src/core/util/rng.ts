/** Seeded pseudo-random generator (mulberry32) - deterministic for shareable links + tests. */
export interface RNG {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [0, n). */
  int(n: number): number;
}

export function makeRng(seed: number): RNG {
  let s = seed >>> 0;
  const next = (): number => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return { next, int: (n: number) => Math.floor(next() * n) };
}

export function randomSeed(): number {
  return (Math.random() * 0x100000000) >>> 0;
}

/** A shuffled permutation of 1..n, using the given RNG. */
export function shuffled(n: number, rng: RNG): number[] {
  const a: number[] = [];
  for (let i = 1; i <= n; i++) a.push(i);
  for (let i = n - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}
