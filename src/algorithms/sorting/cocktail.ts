import type { SortingAlgorithm, SortOp } from "../../core/types";

const pseudocode = [
  "function CocktailSort(a):",
  "  lo ← 0, hi ← n-1",
  "  repeat:",
  "    swapped ← false",
  "    for j from lo to hi-1:",
  "      if a[j] > a[j+1]:",
  "        swap a[j], a[j+1]",
  "        swapped ← true",
  "    hi ← hi - 1",
  "    for j from hi down to lo+1:",
  "      if a[j-1] > a[j]:",
  "        swap a[j-1], a[j]",
  "        swapped ← true",
  "    lo ← lo + 1",
  "    if not swapped: break",
];

const lineNotes = [
  "Cocktail sort bubbles in both directions, shrinking the window each round.",
  "Track the bounds of the still-unsorted region.",
  "Keep sweeping back and forth until a clean round.",
  "Track whether this round made any swap.",
  "Forward sweep: walk pairs toward the right end.",
  "Compare a neighbouring pair.",
  "If out of order, swap so the larger drifts right.",
  "Remember the round wasn't clean.",
  "The largest value is now settled - shrink the right bound.",
  "Backward sweep: walk pairs toward the left end.",
  "Compare a neighbouring pair.",
  "If out of order, swap so the smaller drifts left.",
  "Remember the round wasn't clean.",
  "The smallest value is now settled - shrink the left bound.",
  "A clean round means the array is already sorted - stop early.",
];

export const cocktail: SortingAlgorithm = {
  id: "cocktail",
  name: "Cocktail",
  pseudocode,
  lineNotes,
  info: {
    id: "cocktail",
    name: "Cocktail Shaker Sort",
    complexity: "Best O(n) · Avg/Worst O(n²) · Space O(1)",
    tags: ["Stable"],
    description:
      "A bidirectional bubble sort: each round bubbles the largest value rightward then the smallest value leftward, shrinking the active window from both ends.",
  },
  gen(a: number[]): SortOp[] {
    const ops: SortOp[] = [];
    const n = a.length;
    let lo = 0;
    let hi = n - 1;
    while (lo < hi) {
      let sw = false;
      for (let j = lo; j < hi; j++) {
        ops.push({ t: "cmp", i: j, j: j + 1, line: 5 });
        if (a[j] > a[j + 1]) {
          ops.push({ t: "swap", i: j, j: j + 1, line: 6 });
          const x = a[j];
          a[j] = a[j + 1];
          a[j + 1] = x;
          sw = true;
        }
      }
      hi--;
      for (let j = hi; j > lo; j--) {
        ops.push({ t: "cmp", i: j - 1, j, line: 10 });
        if (a[j - 1] > a[j]) {
          ops.push({ t: "swap", i: j - 1, j, line: 11 });
          const x = a[j - 1];
          a[j - 1] = a[j];
          a[j] = x;
          sw = true;
        }
      }
      lo++;
      if (!sw) break;
    }
    return ops;
  },
};
