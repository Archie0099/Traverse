import type { SortingAlgorithm, SortOp } from "../../core/types";

const pseudocode = [
  "function InsertionSort(a):",
  "  for i from 1 to n-1:",
  "    key ← a[i]",
  "    j ← i - 1",
  "    while j >= 0 and a[j] > key:",
  "      a[j+1] ← a[j]",
  "      j ← j - 1",
  "    a[j+1] ← key",
];

const lineNotes = [
  "Insertion sort grows a sorted prefix one element at a time.",
  "Take the next unsorted value and find its home in the prefix.",
  "Hold the current value as the key to insert.",
  "Start scanning leftward from just before the key.",
  "While the scanned value is larger than the key, keep going.",
  "Slide that larger value one slot to the right.",
  "Step left to inspect the next candidate.",
  "Drop the key into the gap that opened up.",
];

export const insertion: SortingAlgorithm = {
  id: "insertion",
  name: "Insertion",
  pseudocode,
  lineNotes,
  info: {
    id: "insertion",
    name: "Insertion Sort",
    complexity: "Best O(n) · Avg/Worst O(n²) · Space O(1)",
    tags: ["Stable"],
    description:
      "Builds a sorted prefix one element at a time, sliding larger values right to open a gap and inserting each key into place.",
  },
  gen(a: number[]): SortOp[] {
    const ops: SortOp[] = [];
    const n = a.length;
    for (let i = 1; i < n; i++) {
      const key = a[i];
      let j = i - 1;
      while (j >= 0) {
        ops.push({ t: "cmp", i: j, j: j + 1, line: 4 });
        if (a[j] > key) {
          ops.push({ t: "set", i: j + 1, v: a[j], line: 5 });
          a[j + 1] = a[j];
          j--;
        } else {
          break;
        }
      }
      ops.push({ t: "set", i: j + 1, v: key, line: 7 });
      a[j + 1] = key;
    }
    return ops;
  },
};
