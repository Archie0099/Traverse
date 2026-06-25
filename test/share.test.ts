import { describe, it, expect } from "vitest";
import { encodeBoard, decodeBoard, serialize, parse, type ShareState } from "../src/url/state";
import { makeRng } from "../src/core/util/rng";
import { WEIGHT } from "../src/core/constants";

describe("board codec", () => {
  it("round-trips walls and weights at various sizes", () => {
    for (const [rows, cols, seed] of [
      [6, 8, 1],
      [18, 24, 2],
      [40, 60, 3],
    ] as const) {
      const rng = makeRng(seed);
      const walls: boolean[][] = [];
      const weights: number[][] = [];
      for (let r = 0; r < rows; r++) {
        walls.push([]);
        weights.push([]);
        for (let c = 0; c < cols; c++) {
          const w = rng.next() < 0.25;
          walls[r].push(w);
          weights[r].push(!w && rng.next() < 0.2 ? WEIGHT : 1);
        }
      }
      const dec = decodeBoard(encodeBoard(walls, weights, rows, cols), rows, cols);
      expect(dec).not.toBeNull();
      expect(dec!.walls).toEqual(walls);
      expect(dec!.weights).toEqual(weights);
    }
  });
});

describe("share state serialize/parse", () => {
  it("round-trips a pathfinding state", () => {
    const state: ShareState = {
      mode: "path",
      theme: "aurora",
      path: {
        algo: "astar",
        diagonal: true,
        rows: 12,
        cols: 16,
        start: [3, 2],
        end: [9, 14],
        board: "ABCD-_",
      },
    };
    const back = parse("#" + serialize(state));
    expect(back).toEqual(state);
  });

  it("round-trips a sorting state", () => {
    const state: ShareState = {
      mode: "sort",
      theme: "midnight",
      sort: { algoA: "quick", algoB: "merge", race: true, size: 96, seed: 123456789 },
    };
    const back = parse("#" + serialize(state));
    expect(back).toEqual(state);
  });

  it("returns null for empty or junk hashes", () => {
    expect(parse("")).toBeNull();
    expect(parse("#")).toBeNull();
    expect(parse("#m=x")).toBeNull();
  });

  it("decodeBoard rejects malformed/truncated base64 (returns null, never throws)", () => {
    expect(() => decodeBoard("!!!not%%base64$$", 6, 8)).not.toThrow();
    expect(decodeBoard("!!!", 6, 8)).toBeNull(); // invalid chars
    expect(decodeBoard("@@@@", 4, 4)).toBeNull(); // invalid chars
    expect(decodeBoard("", 4, 4)).toBeNull(); // empty
    expect(decodeBoard("AA", 8, 8)).toBeNull(); // valid b64 but too short for the board
  });

  it("parse survives a tampered board param", () => {
    const back = parse("#m=p&a=bfs&g=12.16&se=0.0&en=11.15&b=%%%bad%%%");
    expect(back?.mode).toBe("path");
  });
});
