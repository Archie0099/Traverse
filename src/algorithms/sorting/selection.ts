import type { SortingAlgorithm, SortOp } from "../../core/types";

const pseudocode = [
  "function SelectionSort(a):",
  "  for i from 0 to n-1:",
  "    min ← i",
  "    for j from i+1 to n-1:",
  "      if a[j] < a[min]:",
  "        min ← j",
  "    if min ≠ i:",
  "      swap a[i], a[min]",
];

const lineNotes = [
  "Selection sort picks the smallest remaining value each pass.",
  "Grow the sorted prefix one slot at a time.",
  "Assume the current position holds the minimum.",
  "Scan the unsorted region for something smaller.",
  "Compare the candidate against the running minimum.",
  "Found a smaller value - remember its index.",
  "Only move things if a smaller value was found.",
  "Swap the minimum into its final position - one swap per pass.",
];

export const selection: SortingAlgorithm = {
  id: "selection",
  name: "Selection",
  pseudocode,
  lineNotes,
  info: {
    id: "selection",
    name: "Selection Sort",
    complexity: "Best/Avg/Worst O(n²) · Space O(1)",
    tags: ["In-place", "Fewest swaps"],
    description:
      "Repeatedly scans the unsorted region for its minimum and swaps it into place, performing at most one swap per pass.",
  },
  gen(a: number[]): SortOp[] {
    const ops: SortOp[] = [];
    const n = a.length;
    for (let i = 0; i < n; i++) {
      let m = i;
      for (let j = i + 1; j < n; j++) {
        ops.push({ t: "cmp", i: m, j, line: 4 });
        if (a[j] < a[m]) m = j;
      }
      if (m !== i) {
        ops.push({ t: "swap", i, j: m, line: 7 });
        const x = a[i];
        a[i] = a[m];
        a[m] = x;
      }
    }
    return ops;
  },
};
