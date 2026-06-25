import type { PathfindingAlgorithm } from "../../core/types";
import { bfs } from "./bfs";
import { dfs } from "./dfs";
import { dijkstra } from "./dijkstra";
import { astar } from "./astar";
import { greedy } from "./greedy";
import { bidir } from "./bidir";

/** Registry of pathfinding algorithms, in display order. */
export const PATH_ALGOS: PathfindingAlgorithm[] = [bfs, dfs, dijkstra, astar, greedy, bidir];

export const PATH_BY_ID: Record<string, PathfindingAlgorithm> = Object.fromEntries(
  PATH_ALGOS.map((a) => [a.id, a]),
);
