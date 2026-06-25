import type { SortingAlgorithm, SortOp } from "../../core/types";

const pseudocode = [
  "function ShellSort(a):",
  "  gaps ← Knuth sequence (1, 4, 13, 40, ...) below n",
  "  for each gap from largest to smallest:",
  "    for i from gap to n-1:",
  "      tmp ← a[i]; j ← i",
  "      while j >= gap and a[j-gap] > tmp:",
  "        a[j] ← a[j-gap]",
  "        j ← j - gap",
  "      a[j] ← tmp",
];

const lineNotes = [
  "Shell sort is insertion sort over progressively shrinking gaps.",
  "Build the Knuth gap sequence (g ← g*3+1) staying under n.",
  "Process each gap, largest first, so distant swaps happen early.",
  "Run a gapped insertion pass across the array.",
  "Hold the current value as tmp and start scanning gap-spaced slots.",
  "While the gap-back value is larger than tmp, keep sliding.",
  "Shift that larger value forward by one gap.",
  "Step back another gap to inspect the next candidate.",
  "Drop tmp into the gap that opened up.",
];

export const shell: SortingAlgorithm = {
  id: "shell",
  name: "Shell",
  pseudocode,
  lineNotes,
  info: {
    id: "shell",
    name: "Shell Sort",
    complexity: "Best O(n log n) · Avg O(n^1.25) · Worst O(n²) · Space O(1)",
    tags: ["In-place"],
    description:
      "Generalises insertion sort by comparing elements a gap apart, shrinking the gap each round so far-apart values settle early and the final gap-1 pass has little work left.",
  },
  gen(a: number[]): SortOp[] {
    const ops: SortOp[] = [];
    const n = a.length;
    const gaps: number[] = [];
    let g = 1;
    while (g < n) {
      gaps.push(g);
      g = g * 3 + 1;
    }
    for (let gi = gaps.length - 1; gi >= 0; gi--) {
      const gp = gaps[gi];
      for (let i = gp; i < n; i++) {
        const tmp = a[i];
        let j = i;
        while (j >= gp) {
          ops.push({ t: "cmp", i: j - gp, j: j, line: 5 });
          if (a[j - gp] > tmp) {
            ops.push({ t: "set", i: j, v: a[j - gp], line: 6 });
            a[j] = a[j - gp];
            j -= gp;
          } else {
            break;
          }
        }
        ops.push({ t: "set", i: j, v: tmp, line: 8 });
        a[j] = tmp;
      }
    }
    return ops;
  },
};
