import type { SortingAlgorithm, SortOp } from "../../core/types";

const pseudocode = [
  "function RadixSortLSD(a):",
  "  m ← max(a)",
  "  for exp = 1; m / exp > 0; exp *= 10:",
  "    count ← array of 10 zeros",
  "    for each x in a: count[(x / exp) % 10] += 1",
  "    for d from 1 to 9: count[d] += count[d-1]",
  "    output ← array of n",
  "    for k from n-1 down to 0:",
  "      d ← (a[k] / exp) % 10",
  "      output[--count[d]] ← a[k]",
  "    for k from 0 to n-1: a[k] ← output[k]",
];

const lineNotes = [
  "LSD radix sorts by digit, least-significant first, never comparing values.",
  "Find the largest value to know how many digit passes are needed.",
  "Process one decimal digit position per pass until digits run out.",
  "Reset the per-digit bucket tallies for this pass.",
  "Count how many values fall into each digit bucket.",
  "Prefix-sum the counts into ending positions for a stable layout.",
  "Allocate scratch space to hold this pass's reordering.",
  "Walk right-to-left so equal digits keep their relative order (stable).",
  "Extract the current digit of this value.",
  "Place the value at the last free slot of its bucket.",
  "Copy the reordered scratch back into the array, settling this pass.",
];

export const radix: SortingAlgorithm = {
  id: "radix",
  name: "Radix (LSD)",
  pseudocode,
  lineNotes,
  info: {
    id: "radix",
    name: "Radix Sort (LSD)",
    complexity: "Time O(n·k) · Space O(n+b)",
    tags: ["Stable", "Non-comparison"],
    description:
      "Sorts integers digit by digit from least to most significant, using a stable counting pass per digit so no element comparisons are needed.",
  },
  gen(a: number[]): SortOp[] {
    const ops: SortOp[] = [];
    const n = a.length;
    if (n === 0) return ops;

    let m = a[0];
    for (let k = 1; k < n; k++) {
      if (a[k] > m) m = a[k];
    }

    for (let exp = 1; Math.floor(m / exp) > 0; exp *= 10) {
      const count = new Array<number>(10).fill(0);
      for (let k = 0; k < n; k++) {
        count[Math.floor(a[k] / exp) % 10]++;
      }
      for (let d = 1; d < 10; d++) {
        count[d] += count[d - 1];
      }
      const output = new Array<number>(n).fill(0);
      for (let k = n - 1; k >= 0; k--) {
        const d = Math.floor(a[k] / exp) % 10;
        output[--count[d]] = a[k];
      }
      for (let k = 0; k < n; k++) {
        ops.push({ t: "set", i: k, v: output[k], line: 10 });
        a[k] = output[k];
      }
    }

    return ops;
  },
};
