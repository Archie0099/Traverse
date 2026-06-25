import type { SortingAlgorithm, SortOp } from "../../core/types";

const pseudocode = [
  "function BubbleSort(a):",
  "  for i from 0 to n-1:",
  "    swapped ← false",
  "    for j from 0 to n-2-i:",
  "      if a[j] > a[j+1]:",
  "        swap a[j], a[j+1]",
  "        swapped ← true",
  "    if not swapped: break",
];

const lineNotes = [
  "Bubble sort floats the biggest value to the end each pass.",
  "Each pass settles one more value at the tail.",
  "Track whether this pass made any swap.",
  "Walk adjacent pairs across the unsorted region.",
  "Compare a neighbouring pair.",
  "If they're out of order, swap them.",
  "Remember that the array wasn't sorted yet.",
  "A clean pass means the array is already sorted - stop early.",
];

export const bubble: SortingAlgorithm = {
  id: "bubble",
  name: "Bubble",
  pseudocode,
  lineNotes,
  info: {
    id: "bubble",
    name: "Bubble Sort",
    complexity: "Best O(n) · Avg/Worst O(n²) · Space O(1)",
    tags: ["Stable"],
    description:
      "Repeatedly swaps adjacent out-of-order pairs, letting large values bubble to the end on each pass.",
  },
  gen(a: number[]): SortOp[] {
    const ops: SortOp[] = [];
    const n = a.length;
    for (let i = 0; i < n - 1; i++) {
      let sw = false;
      for (let j = 0; j < n - 1 - i; j++) {
        ops.push({ t: "cmp", i: j, j: j + 1, line: 4 });
        if (a[j] > a[j + 1]) {
          ops.push({ t: "swap", i: j, j: j + 1, line: 5 });
          const x = a[j];
          a[j] = a[j + 1];
          a[j + 1] = x;
          sw = true;
        }
      }
      if (!sw) break;
    }
    return ops;
  },
};
