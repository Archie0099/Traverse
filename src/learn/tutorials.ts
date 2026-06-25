import { WEIGHT } from "../core/constants";
import { makeRng } from "../core/util/rng";
import { MAZES } from "../algorithms/pathfinding/maze";
import { dirsFor } from "../algorithms/pathfinding/util";

/* ===========================================================================
 * Guided tutorials. Each step drives the visualizer through the Director API
 * (implemented in main.ts) and shows a plain-language explanation. The board
 * scenarios are deterministic so every run looks the same.
 * ===========================================================================*/

export interface PathOpts {
  rows: number;
  cols: number;
  start: [number, number];
  end: [number, number];
  walls: boolean[][];
  weights: number[][];
  algo: string;
  diagonal?: boolean;
}
export interface SortOpts {
  size: number;
  seed: number;
  algoA: string;
  algoB?: string;
  race?: boolean;
}

export interface Director {
  enableLearn(): void;
  loadPath(opts: PathOpts): void;
  loadSort(opts: SortOpts): void;
  play(): void;
}

export interface TutorialStep {
  text: string;
  run?: (d: Director) => void;
}
export interface Tutorial {
  id: string;
  title: string;
  blurb: string;
  steps: TutorialStep[];
}

/* ----- board builders (fixed 13×21 stage) ----- */
const R = 13;
const C = 21;
const S: [number, number] = [6, 2];
const E: [number, number] = [6, 18];

const ones = (): number[][] => Array.from({ length: R }, () => new Array<number>(C).fill(1));
const noWalls = (): boolean[][] => Array.from({ length: R }, () => new Array<boolean>(C).fill(false));

function weightedBand(): number[][] {
  const w = ones();
  for (let r = 4; r < R; r++) for (let c = 9; c <= 12; c++) w[r][c] = WEIGHT;
  return w;
}

function scatterWalls(seed: number): boolean[][] {
  const { walls } = MAZES.scatter.generate(R, C, makeRng(seed));
  for (const nd of [{ r: S[0], c: S[1] }, { r: E[0], c: E[1] }]) {
    walls[nd.r][nd.c] = false;
    for (const d of dirsFor(true)) {
      const nr = nd.r + d[0];
      const nc = nd.c + d[1];
      if (nr >= 0 && nc >= 0 && nr < R && nc < C) walls[nr][nc] = false;
    }
  }
  return walls;
}

function P(algo: string, walls = noWalls(), weights = ones()): PathOpts {
  return { rows: R, cols: C, start: S, end: E, walls, weights, algo };
}

export const TUTORIALS: Tutorial[] = [
  {
    id: "bfs101",
    title: "How BFS finds the shortest path",
    blurb: "Watch breadth-first search sweep outward in rings.",
    steps: [
      {
        text: "Breadth-first search explores the grid in expanding rings from the start (the ▶ node). Every cell in a ring is exactly one step farther than the last. Watch it sweep toward the goal (◯).",
        run: (d) => {
          d.enableLearn();
          d.loadPath(P("bfs"));
          d.play();
        },
      },
      {
        text: "The moment a ring first touches the goal, BFS has reached it using the fewest possible cells - drawn as the glowing aqua beam. Because rings grow one step at a time, that first arrival is guaranteed to be a shortest path.",
        run: (d) => {
          d.loadPath(P("bfs"));
          d.play();
        },
      },
    ],
  },
  {
    id: "astar-vs-dijkstra",
    title: "A* vs Dijkstra: exploring smarter",
    blurb: "Same shortest path, but A* visits far fewer cells.",
    steps: [
      {
        text: "Dijkstra expands outward from the start in every direction, always taking the cheapest-so-far cell. On an open board that means it fills a big diamond. Keep an eye on the Visited counter.",
        run: (d) => {
          d.enableLearn();
          d.loadPath(P("dijkstra"));
          d.play();
        },
      },
      {
        text: "A* adds a heuristic - a straight-line guess of the distance left to the goal - so it leans toward the target instead of exploring everywhere. It finds the same optimal path while visiting far fewer cells. Compare the Visited numbers.",
        run: (d) => {
          d.loadPath(P("astar"));
          d.play();
        },
      },
    ],
  },
  {
    id: "weights",
    title: "Weights change the route",
    blurb: "Why Dijkstra detours around the costly amber zone.",
    steps: [
      {
        text: "The amber cells cost 6× as much to travel through. BFS doesn't know about cost - it just counts cells - so it barrels straight through the expensive zone. Notice the high Cost when it finishes.",
        run: (d) => {
          d.enableLearn();
          d.loadPath(P("bfs", noWalls(), weightedBand()));
          d.play();
        },
      },
      {
        text: "Dijkstra adds up the real cost of every step, so it happily takes a longer-looking detour around the amber to save on cost. The path has more cells but a lower total Cost - compare the readout.",
        run: (d) => {
          d.loadPath(P("dijkstra", noWalls(), weightedBand()));
          d.play();
        },
      },
    ],
  },
  {
    id: "greedy-trap",
    title: "Greedy's blind spot",
    blurb: "Fast, but obstacles can fool it into a long detour.",
    steps: [
      {
        text: "Greedy best-first always steps toward whatever looks closest to the goal in a straight line. It's quick, but it can't see around walls. Watch the winding path it commits to on this obstacle field.",
        run: (d) => {
          d.enableLearn();
          d.loadPath(P("greedy", scatterWalls(3)));
          d.play();
        },
      },
      {
        text: "Now BFS on the exact same board. It finds a noticeably shorter route (compare Length: about 21 cells vs Greedy's about 31). Greedy trades the guarantee of a shortest path for raw speed - sometimes a bad bargain.",
        run: (d) => {
          d.loadPath(P("bfs", scatterWalls(3)));
          d.play();
        },
      },
    ],
  },
  {
    id: "sort-showdown",
    title: "Sorting showdown: Merge vs Bubble",
    blurb: "Watch O(n log n) crush O(n²) on the same data.",
    steps: [
      {
        text: "Two algorithms race on the same shuffle at the same speed. Merge sort (top) repeatedly splits the array and merges sorted halves. Bubble sort (bottom) just swaps out-of-order neighbours. Watch their operation counts pull apart.",
        run: (d) => {
          d.enableLearn();
          d.loadSort({ size: 50, seed: 1234, algoA: "merge", algoB: "bubble", race: true });
          d.play();
        },
      },
      {
        text: "Merge finishes in roughly n·log n operations; Bubble needs about n². On 50 items that's already a landslide - and the gap grows explosively as the array gets bigger. This is what algorithmic complexity feels like.",
        run: (d) => {
          d.loadSort({ size: 50, seed: 1234, algoA: "merge", algoB: "bubble", race: true });
          d.play();
        },
      },
    ],
  },
];
