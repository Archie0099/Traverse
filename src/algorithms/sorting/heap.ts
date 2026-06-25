import type { SortingAlgorithm, SortOp } from "../../core/types";

const pseudocode = [
  "function HeapSort(a):",
  "  for i from n/2-1 down to 0:",
  "    siftDown(i, n)",
  "  for end from n-1 down to 1:",
  "    swap a[0], a[end]",
  "    siftDown(0, end)",
  "function siftDown(root, hi):",
  "  loop:",
  "    child ← 2*root+1; if child ≥ hi: break",
  "    if a[child+1] > a[child]: child ← child+1",
  "    if a[child] > a[root]:",
  "      swap a[root], a[child]; root ← child",
  "    else: break",
];

const lineNotes = [
  "Heap sort builds a max-heap, then repeatedly extracts the maximum.",
  "Heapify the array bottom-up, starting at the last internal node.",
  "Sift each node down so its subtree satisfies the heap property.",
  "Shrink the heap, settling the largest value at the tail each time.",
  "Move the current max (the root) to the end of the unsorted region.",
  "Restore the heap property on the reduced heap.",
  "Sift a value down until its subtree is a valid max-heap.",
  "Keep pushing the value down while it has children.",
  "Find its left child; stop if it has no children inside the heap.",
  "Pick the larger of the two children to compare against.",
  "If the larger child outranks the parent, the heap is violated.",
  "Swap the parent down and continue from the child's position.",
  "Otherwise the value is in place - stop sifting.",
];

export const heap: SortingAlgorithm = {
  id: "heap",
  name: "Heap",
  pseudocode,
  lineNotes,
  info: {
    id: "heap",
    name: "Heap Sort",
    complexity: "Best/Avg/Worst O(n log n) · Space O(1)",
    tags: ["In-place", "Unstable"],
    description:
      "Builds a binary max-heap in place, then repeatedly swaps the root maximum to the end and sifts the new root down to restore the heap.",
  },
  gen(a: number[]): SortOp[] {
    const ops: SortOp[] = [];
    const n = a.length;

    const sift = (lo: number, hi: number): void => {
      let root = lo;
      while (true) {
        const left = 2 * root + 1;
        if (left >= hi) break;
        let child = left;
        if (child + 1 < hi) {
          ops.push({ t: "cmp", i: child, j: child + 1, line: 9 });
          if (a[child + 1] > a[child]) child++;
        }
        ops.push({ t: "cmp", i: root, j: child, line: 10 });
        if (a[child] > a[root]) {
          ops.push({ t: "swap", i: root, j: child, line: 11 });
          const x = a[root];
          a[root] = a[child];
          a[child] = x;
          root = child;
        } else {
          break;
        }
      }
    };

    for (let i = (n >> 1) - 1; i >= 0; i--) {
      sift(i, n);
    }
    for (let end = n - 1; end > 0; end--) {
      ops.push({ t: "swap", i: 0, j: end, line: 4 });
      const x = a[0];
      a[0] = a[end];
      a[end] = x;
      sift(0, end);
    }

    return ops;
  },
};
