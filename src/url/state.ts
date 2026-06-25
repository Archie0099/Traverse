import { WEIGHT } from "../core/constants";
import { makeGrid } from "../algorithms/pathfinding/util";

/* ===========================================================================
 * Shareable state lives entirely in the URL hash (no server, stays offline).
 * The grid board is packed to 2 bits/cell (wall? + weighted?) and base64url'd.
 * ===========================================================================*/

export interface PathShare {
  algo: string;
  diagonal: boolean;
  rows: number;
  cols: number;
  start: [number, number];
  end: [number, number];
  board: string;
}
export interface SortShare {
  algoA: string;
  algoB: string;
  race: boolean;
  size: number;
  seed: number;
}
export interface ShareState {
  mode: "path" | "sort";
  theme: string;
  path?: PathShare;
  sort?: SortShare;
}

function b64urlEncode(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(str: string): Uint8Array {
  try {
    const norm = str.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(norm);
    const a = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    return a;
  } catch {
    // corrupt/truncated base64 - treat as an empty board rather than crashing
    return new Uint8Array(0);
  }
}

export function encodeBoard(walls: boolean[][], weights: number[][], rows: number, cols: number): string {
  const bytes = new Uint8Array(Math.ceil((rows * cols * 2) / 8));
  let bi = 0;
  const set = (i: number): void => {
    bytes[i >> 3] |= 1 << (i & 7);
  };
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (walls[r][c]) set(bi);
      else if (weights[r][c] > 1) set(bi + 1);
      bi += 2;
    }
  }
  return b64urlEncode(bytes);
}

export function decodeBoard(
  str: string,
  rows: number,
  cols: number,
): { walls: boolean[][]; weights: number[][] } | null {
  const need = Math.ceil((rows * cols * 2) / 8);
  const bytes = b64urlDecode(str);
  if (bytes.length < need) return null; // truncated/corrupt - reject rather than silently zero-fill
  const walls = makeGrid(rows, cols, () => false);
  const weights = makeGrid(rows, cols, () => 1);
  const get = (i: number): boolean => ((bytes[i >> 3] ?? 0) >> (i & 7) & 1) === 1;
  let bi = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (get(bi)) walls[r][c] = true;
      else if (get(bi + 1)) weights[r][c] = WEIGHT;
      bi += 2;
    }
  }
  return { walls, weights };
}

export function serialize(s: ShareState): string {
  const p = new URLSearchParams();
  p.set("m", s.mode === "path" ? "p" : "s");
  p.set("th", s.theme);
  if (s.mode === "path" && s.path) {
    const pa = s.path;
    p.set("a", pa.algo);
    if (pa.diagonal) p.set("dg", "1");
    p.set("g", `${pa.rows}.${pa.cols}`);
    p.set("se", `${pa.start[0]}.${pa.start[1]}`);
    p.set("en", `${pa.end[0]}.${pa.end[1]}`);
    p.set("b", pa.board);
  } else if (s.mode === "sort" && s.sort) {
    const so = s.sort;
    p.set("a", so.algoA);
    p.set("a2", so.algoB);
    if (so.race) p.set("rc", "1");
    p.set("sz", String(so.size));
    p.set("sd", String(so.seed));
  }
  return p.toString();
}

function pair(v: string | null): [number, number] | null {
  if (!v) return null;
  const parts = v.split(".");
  if (parts.length !== 2) return null;
  const a = parseInt(parts[0], 10);
  const b = parseInt(parts[1], 10);
  return Number.isFinite(a) && Number.isFinite(b) ? [a, b] : null;
}

export function parse(hash: string): ShareState | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw) return null;
  let p: URLSearchParams;
  try {
    p = new URLSearchParams(raw);
  } catch {
    return null;
  }
  const m = p.get("m");
  if (m !== "p" && m !== "s") return null;
  const theme = p.get("th") || "midnight";
  const mode = m === "p" ? "path" : "sort";
  const out: ShareState = { mode, theme };
  if (mode === "path") {
    const g = pair(p.get("g"));
    const se = pair(p.get("se"));
    const en = pair(p.get("en"));
    const board = p.get("b");
    const algo = p.get("a");
    if (!g || !se || !en || board == null || !algo) return out;
    out.path = {
      algo,
      diagonal: p.get("dg") === "1",
      rows: g[0],
      cols: g[1],
      start: se,
      end: en,
      board,
    };
  } else {
    const algoA = p.get("a");
    const sz = parseInt(p.get("sz") || "", 10);
    const sd = parseInt(p.get("sd") || "", 10);
    if (!algoA || !Number.isFinite(sz) || !Number.isFinite(sd)) return out;
    out.sort = {
      algoA,
      algoB: p.get("a2") || algoA,
      race: p.get("rc") === "1",
      size: sz,
      seed: sd >>> 0,
    };
  }
  return out;
}
