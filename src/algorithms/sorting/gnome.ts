import type { SortingAlgorithm, SortOp } from "../../core/types";

const pseudocode = [
  "function GnomeSort(a):",
  "  i ← 1",
  "  while i < n:",
  "    if i == 0 or a[i-1] <= a[i]:",
  "      i ← i + 1",
  "    else:",
  "      swap a[i-1], a[i]",
  "      i ← i - 1",
];

const lineNotes = [
  "Gnome sort uses a single index that walks the array.",
  "Start the gnome at the second element.",
  "Keep going until the gnome walks off the end.",
  "Compare the gnome's pair; in order (or at the start) it steps forward.",
  "Step forward to the next position.",
  "Otherwise the pair is out of order.",
  "Swap the out-of-order neighbours.",
  "Step back to recheck the value we moved.",
];

export const gnome: SortingAlgorithm = {
  id: "gnome",
  name: "Gnome",
  pseudocode,
  lineNotes,
  info: {
    id: "gnome",
    name: "Gnome Sort",
    complexity: "Best O(n) · Avg/Worst O(n²) · Space O(1)",
    tags: ["Stable"],
    description:
      "Walks a single index forward, swapping out-of-order neighbours and stepping back, like a gnome sorting flower pots.",
  },
  gen(a: number[]): SortOp[] {
    const ops: SortOp[] = [];
    const n = a.length;
    let i = 1;
    while (i < n) {
      ops.push({ t: "cmp", i: i - 1, j: i, line: 3 });
      if (a[i - 1] <= a[i]) {
        i++;
      } else {
        ops.push({ t: "swap", i: i - 1, j: i, line: 6 });
        const x = a[i - 1];
        a[i - 1] = a[i];
        a[i] = x;
        if (i > 1) i--;
      }
    }
    return ops;
  },
};
