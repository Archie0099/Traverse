import type { SortingAlgorithm, SortOp } from "../../core/types";

const pseudocode = [
  "function MergeSort(a, lo, hi):",
  "  if hi - lo <= 1: return",
  "  mid ← (lo + hi) / 2",
  "  MergeSort(a, lo, mid)",
  "  MergeSort(a, mid, hi)",
  "  i ← lo; j ← mid; merged ← []",
  "  while i < mid and j < hi:",
  "    if a[i] <= a[j]: merged.push(a[i++])",
  "    else: merged.push(a[j++])",
  "  while i < mid: merged.push(a[i++])",
  "  while j < hi: merged.push(a[j++])",
  "  for m from 0 to merged.length-1:",
  "    a[lo+m] ← merged[m]",
];

const lineNotes = [
  "Recursively sort the half-open range [lo, hi).",
  "A run of length 0 or 1 is already sorted.",
  "Split the range into two halves at the midpoint.",
  "Sort the left half first.",
  "Then sort the right half.",
  "Prepare two read cursors and a buffer for the merge.",
  "Merge while both halves still have elements.",
  "Take from the left when it's ≤ the right (keeps it stable).",
  "Otherwise take the smaller element from the right.",
  "Drain any leftover elements from the left half.",
  "Drain any leftover elements from the right half.",
  "Walk the merged buffer back over the original range.",
  "Write each merged value into its final slot.",
];

export const merge: SortingAlgorithm = {
  id: "merge",
  name: "Merge",
  pseudocode,
  lineNotes,
  info: {
    id: "merge",
    name: "Merge Sort",
    complexity: "Best/Avg/Worst O(n log n) · Space O(n)",
    tags: ["Stable", "Divide & Conquer"],
    description:
      "Recursively splits the array in half, sorts each half, then merges the two sorted runs back into place using a temporary buffer.",
  },
  gen(a: number[]): SortOp[] {
    const ops: SortOp[] = [];
    const ms = (lo: number, hi: number): void => {
      if (hi - lo <= 1) return;
      const mid = (lo + hi) >> 1;
      ms(lo, mid);
      ms(mid, hi);
      let i = lo;
      let j = mid;
      const merged: number[] = [];
      while (i < mid && j < hi) {
        ops.push({ t: "cmp", i, j, line: 6 });
        if (a[i] <= a[j]) merged.push(a[i++]);
        else merged.push(a[j++]);
      }
      while (i < mid) merged.push(a[i++]);
      while (j < hi) merged.push(a[j++]);
      for (let m = 0; m < merged.length; m++) {
        ops.push({ t: "set", i: lo + m, v: merged[m], line: 12 });
        a[lo + m] = merged[m];
      }
    };
    ms(0, a.length);
    return ops;
  },
};
