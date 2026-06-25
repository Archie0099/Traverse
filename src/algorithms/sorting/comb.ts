import type { SortingAlgorithm, SortOp } from "../../core/types";

const pseudocode = [
  "function CombSort(a):",
  "  gap ← n",
  "  sorted ← false",
  "  while gap > 1 or not sorted:",
  "    gap ← max(1, floor(gap / 1.3))",
  "    sorted ← true",
  "    for i from 0 to n-1-gap:",
  "      if a[i] > a[i+gap]:",
  "        swap a[i], a[i+gap]",
  "        sorted ← false",
];

const lineNotes = [
  "Comb sort generalises bubble sort with a shrinking gap.",
  "Start with a gap as wide as the whole array.",
  "Track whether the latest pass was clean.",
  "Keep going until the gap is 1 and a pass makes no swaps.",
  "Shrink the gap by the 1.3 factor, never below 1.",
  "Assume this pass will be clean until proven otherwise.",
  "Walk every pair separated by the current gap.",
  "Compare the gapped pair.",
  "If they're out of order, swap them.",
  "A swap means we must do at least one more pass.",
];

export const comb: SortingAlgorithm = {
  id: "comb",
  name: "Comb",
  pseudocode,
  lineNotes,
  info: {
    id: "comb",
    name: "Comb Sort",
    complexity: "Best O(n log n) · Avg O(n²/2^p) · Worst O(n²) · Space O(1)",
    tags: ["In-place", "Unstable"],
    description:
      "Improves on bubble sort by comparing elements a shrinking gap apart, quickly killing small values stranded near the end before finishing with adjacent passes.",
  },
  gen(a: number[]): SortOp[] {
    const ops: SortOp[] = [];
    const n = a.length;
    let gap = n;
    let sorted = false;
    while (gap > 1 || !sorted) {
      gap = Math.max(1, Math.floor(gap / 1.3));
      sorted = true;
      for (let i = 0; i + gap < n; i++) {
        ops.push({ t: "cmp", i, j: i + gap, line: 7 });
        if (a[i] > a[i + gap]) {
          ops.push({ t: "swap", i, j: i + gap, line: 8 });
          const x = a[i];
          a[i] = a[i + gap];
          a[i + gap] = x;
          sorted = false;
        }
      }
    }
    return ops;
  },
};
