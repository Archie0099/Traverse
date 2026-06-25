import { describe, it, expect } from "vitest";
import { SortController } from "../src/controllers/sort";
import { PathController } from "../src/controllers/path";

// stats()/seek logic never touch the 2D context, so a null ctx is fine here.
const noctx = null as unknown as CanvasRenderingContext2D;

function blank<T>(r: number, c: number, v: T): T[][] {
  return Array.from({ length: r }, () => new Array<T>(c).fill(v));
}

describe("race winner", () => {
  it("names the fewer-operations algorithm after scrub or instant to the end", () => {
    // A = bubble (many ops), B = quick (few ops); the winner must be the fewer-ops track,
    // regardless of slot order, even when both tracks finish in a single step.
    const c = new SortController();
    c.loadState(48, 12345, "bubble", "quick", true);
    c.prepare();
    c.seekEnd(performance.now());
    const result = c.stats().find((s) => s.key === "Result")!.value;
    expect(result).toContain("won");
    expect(result).toContain("Quick");
    expect(result).not.toContain("Bubble won");
  });

  it("is symmetric: swapping slots still picks quick", () => {
    const c = new SortController();
    c.loadState(48, 12345, "quick", "bubble", true);
    c.prepare();
    c.seekEnd(performance.now());
    const result = c.stats().find((s) => s.key === "Result")!.value;
    expect(result).toContain("Quick");
    expect(result).not.toContain("Bubble won");
  });
});

describe("path grid auto-fit", () => {
  it("unlocks fixed dimensions so the viewport can refit", () => {
    const c = new PathController();
    c.setViewport(noctx, 640, 480);
    const natural = c.rows; // viewport-derived row count
    expect(natural).toBeGreaterThan(13);

    c.loadBoard(13, 21, { r: 6, c: 2 }, { r: 6, c: 18 }, blank(13, 21, false), blank(13, 21, 1), "bfs", false);
    expect(c.rows).toBe(13);

    c.setViewport(noctx, 640, 480); // dimensions are pinned, so this stays 13
    expect(c.rows).toBe(13);

    c.unlockDims();
    c.setViewport(noctx, 640, 480); // now it refits to the viewport
    expect(c.rows).toBe(natural);
  });

  it("clearBoard refits a pinned grid back to the viewport", () => {
    const c = new PathController();
    c.setViewport(noctx, 640, 480);
    const natural = c.rows;
    c.loadBoard(13, 21, { r: 6, c: 2 }, { r: 6, c: 18 }, blank(13, 21, false), blank(13, 21, 1), "bfs", false);
    expect(c.rows).toBe(13);
    c.clearBoard();
    expect(c.rows).toBe(natural);
  });
});
