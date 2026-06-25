/** Binary min-heap keyed by a numeric score function. */
export class MinHeap<T> {
  private a: T[] = [];
  constructor(private score: (x: T) => number) {}

  get size(): number {
    return this.a.length;
  }

  push(x: T): void {
    const a = this.a;
    const s = this.score;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (s(a[i]) < s(a[p])) {
        const t = a[i];
        a[i] = a[p];
        a[p] = t;
        i = p;
      } else break;
    }
  }

  pop(): T | undefined {
    const a = this.a;
    const s = this.score;
    const top = a[0];
    const last = a.pop();
    if (a.length && last !== undefined) {
      a[0] = last;
      let i = 0;
      const n = a.length;
      for (;;) {
        const l = 2 * i + 1;
        const r = 2 * i + 2;
        let m = i;
        if (l < n && s(a[l]) < s(a[m])) m = l;
        if (r < n && s(a[r]) < s(a[m])) m = r;
        if (m !== i) {
          const t = a[i];
          a[i] = a[m];
          a[m] = t;
          i = m;
        } else break;
      }
    }
    return top;
  }
}
