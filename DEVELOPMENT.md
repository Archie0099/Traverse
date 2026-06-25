# Development

How Traverse is built and how to work on it.

## Stack

- Vite for the dev server and the production build.
- TypeScript in strict mode.
- Plain DOM and Canvas 2D, no UI framework.
- Vitest with jsdom for tests.
- sharp for generating the app and social icons from SVG.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload at http://localhost:5173 |
| `npm run build` | Type-check, then build a static site into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run the Vitest suite |
| `npm run gen:icons` | Rasterize `public/icon.svg` and `public/og-image.svg` into PNGs |

## Project layout

```
src/
  core/          playback engine, reactive store, audio, shared types, utilities
  algorithms/
    pathfinding/ bfs, dfs, dijkstra, astar, greedy, bidir, maze generators
    sorting/     bubble through radix
  controllers/   path and sort controllers (state plus rendering)
  render/        particle effects
  learn/         guided tutorials
  url/           shareable-state codec
  main.ts        UI shell and wiring
  style.css      design tokens (per theme) and all styling
test/            Vitest suites
public/          icons and the PWA manifest source
```

## Architecture

The core idea is to precompute a run, then play it back. Choosing an algorithm or editing the board or array runs it to completion and records its full operation history. A single requestAnimationFrame loop advances a cursor through that history at the chosen speed. From this one mechanism you get variable speed, pause, single step, instant mode (durations set to zero, jump to the end), and a scrubbable timeline (replay from the start to a target index, stamped with a far-past timestamp so the frame renders settled, with no animation or sound).

Each algorithm is a self-describing module: it emits its operations plus a `pseudocode` array and an equal-length `lineNotes` array, and every operation carries a `line` index into that pseudocode. That metadata is what powers the learning mode. The UI in `main.ts` is generic over a `Controller` interface, so both modes share one shell.

## Algorithm notes

Pathfinding:

| Algorithm | Shortest path | Weights | Notes |
|---|---|---|---|
| BFS | Yes (fewest cells) | Ignored | Expanding rings |
| DFS | No | Ignored | Dives deep, backtracks |
| Dijkstra | Yes (lowest cost) | Used | Priority queue on cost |
| A\* | Yes (lowest cost) | Used | Manhattan or Chebyshev heuristic |
| Greedy | No (by design) | Ignored | Heuristic only, can be fooled by walls |
| Bidirectional | Yes (fewest cells) | Ignored | Two level-synchronized frontiers |

Design constraints worth keeping if you extend it: Dijkstra and A\* add cell weights to the cost; the others ignore weights on purpose. A\* stays optimal because its heuristic never overestimates (entering any cell costs at least one). Bidirectional is level-synchronized so its path length always equals BFS. Greedy is intentionally non-optimal.

Sorting emits only five operation kinds: compare, swap, set, pivot, unpivot. Sound plays on swap and set, and only during live playback. Any new sort should use the same vocabulary so the player and audio keep working.

## Adding an algorithm

- Sorting: copy `src/algorithms/sorting/bubble.ts` as a template (id, name, info, equal-length pseudocode and lineNotes, and a `gen(arr)` that mutates a copy and emits operations with valid line indices). Register it in `src/algorithms/sorting/index.ts`.
- Pathfinding: copy `src/algorithms/pathfinding/bfs.ts`; use `dirsFor` for neighbours and `reconstruct` for the path. Register it in `src/algorithms/pathfinding/index.ts`.
- Maze: add a generator in `src/algorithms/pathfinding/maze.ts` (deterministic given the passed RNG) and list it in `MAZES` and `MAZE_LIST`.

## Tests

The suite covers:

- Algorithm correctness and invariants: BFS, Dijkstra, and A\* agree on the optimal length; Bidirectional matches BFS across many random mazes; weighted boards make Dijkstra and A\* cheaper than BFS; Greedy stays valid and never shorter than optimal; every sort produces a sorted permutation across sizes 1 to 160 and over sorted, reverse, and duplicate inputs; pseudocode and lineNotes line up and every line index is valid.
- The shareable-link codec round-trips and rejects malformed input without throwing.
- A headless run builds the shell and drives both modes, the timeline, mazes, themes, the learn toggle, and the tutorials without errors.

## Deploying

`npm run build` outputs a static `dist/`. The repository includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that builds and publishes to GitHub Pages on every push to `main`. It sets the base path to the repository name and an absolute site URL so social previews resolve. The app also runs on any static host with the base path set to `/`.
