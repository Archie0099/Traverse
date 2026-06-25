import type { SortingAlgorithm } from "../../core/types";
import { bubble } from "./bubble";
import { insertion } from "./insertion";
import { selection } from "./selection";
import { merge } from "./merge";
import { quick } from "./quick";
import { heap } from "./heap";
import { shell } from "./shell";
import { cocktail } from "./cocktail";
import { comb } from "./comb";
import { gnome } from "./gnome";
import { radix } from "./radix";

/** Registry of sorting algorithms, in display order. */
export const SORT_ALGOS: SortingAlgorithm[] = [
  bubble,
  insertion,
  selection,
  merge,
  quick,
  heap,
  shell,
  cocktail,
  comb,
  gnome,
  radix,
];

export const SORT_BY_ID: Record<string, SortingAlgorithm> = Object.fromEntries(
  SORT_ALGOS.map((a) => [a.id, a]),
);
