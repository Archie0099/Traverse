import type { SortingAlgorithm, SortOp } from "../../core/types";

const pseudocode = [
  "function QuickSort(a, lo, hi):",
  "  if lo >= hi: return",
  "  pivot ← a[hi]",
  "  i ← lo",
  "  for j from lo to hi-1:",
  "    if a[j] < pivot:",
  "      swap a[i], a[j]; i ← i+1",
  "  swap a[i], a[hi]",
  "  QuickSort(a, lo, i-1); QuickSort(a, i+1, hi)",
];

const lineNotes = [
  "Sort the sub-range [lo, hi] of the array in place.",
  "A range of zero or one element is already sorted.",
  "Pick the last element of the range as the pivot.",
  "i marks the boundary of values known to be smaller than the pivot.",
  "Scan every element before the pivot.",
  "Compare the scanned value against the pivot.",
  "Move a smaller value into the left partition and grow it.",
  "Seat the pivot between the smaller and larger partitions.",
  "Recurse into the partitions on either side of the pivot.",
];

export const quick: SortingAlgorithm = {
  id: "quick",
  name: "Quick",
  pseudocode,
  lineNotes,
  info: {
    id: "quick",
    name: "Quick Sort",
    complexity: "Best/Avg O(n log n) · Worst O(n²) · Space O(log n)",
    tags: ["In-place", "Divide & Conquer"],
    description:
      "Partitions the array around a pivot so smaller values move left and larger values move right, then recursively sorts each partition.",
  },
  gen(a: number[]): SortOp[] {
    const ops: SortOp[] = [];
    const qs = (lo: number, hi: number): void => {
      if (lo >= hi) return;
      const pivot = a[hi];
      ops.push({ t: "pivot", i: hi, line: 2 });
      let i = lo;
      for (let j = lo; j < hi; j++) {
        ops.push({ t: "cmp", i: j, j: hi, line: 5 });
        if (a[j] < pivot) {
          if (i !== j) {
            ops.push({ t: "swap", i, j, line: 6 });
            const x = a[i];
            a[i] = a[j];
            a[j] = x;
          }
          i++;
        }
      }
      if (i !== hi) {
        ops.push({ t: "swap", i, j: hi, line: 7 });
        const x = a[i];
        a[i] = a[hi];
        a[hi] = x;
      }
      ops.push({ t: "unpivot", i: 0, line: 8 });
      qs(lo, i - 1);
      qs(i + 1, hi);
    };
    qs(0, a.length - 1);
    return ops;
  },
};
