import "./style.css";
import type { Controller, Stat, LegendItem } from "./core/types";
import { createStore } from "./core/store";
import { Player } from "./core/player";
import { audio } from "./core/audio";
import { msPerStep, stepsPerSec } from "./core/constants";
import { h, mount, sizeCanvas } from "./core/util/dom";
import { refreshPalette } from "./core/util/palette";
import { PathController } from "./controllers/path";
import { SortController } from "./controllers/sort";
import { PATH_ALGOS, PATH_BY_ID } from "./algorithms/pathfinding";
import { MAZE_LIST } from "./algorithms/pathfinding/maze";
import { SORT_ALGOS, SORT_BY_ID } from "./algorithms/sorting";
import { clamp } from "./core/util/easing";
import * as share from "./url/state";
import { TUTORIALS, type Tutorial, type Director } from "./learn/tutorials";

/* ===== state ===== */
interface AppState {
  mode: "path" | "sort";
  instant: boolean;
  learn: boolean;
  sound: boolean;
  theme: string;
  speed: number;
}
const store = createStore<AppState>({
  mode: "path",
  instant: false,
  learn: false,
  sound: false,
  theme: "midnight",
  speed: 62,
});

const path = new PathController();
const sort = new SortController();
const activeCtrl = (): Controller => (store.get().mode === "path" ? path : sort);

const THEMES = ["midnight", "aurora", "paper"];

/* ===== element refs (persistent across mode switches) ===== */
let gridCanvas: HTMLCanvasElement;
let sortCanvas: HTMLCanvasElement;
let stage: HTMLElement;
let modeControls: HTMLElement;
let readoutEl: HTMLElement;
let legendEl: HTMLElement;
let hintEl: HTMLElement;
let aboutEl: HTMLElement;
let pseudoPanel: HTMLElement;
let pseudoCodeEl: HTMLElement;
let narrationEl: HTMLElement;
let speedInput: HTMLInputElement;
let speedVal: HTMLElement;
let seekInput: HTMLInputElement;
let seekVal: HTMLElement;
let playBtn: HTMLButtonElement;
let modePathBtn: HTMLButtonElement;
let modeSortBtn: HTMLButtonElement;
let instantBtn: HTMLButtonElement;
let learnBtn: HTMLButtonElement;
let themeSelEl: HTMLSelectElement;
let tutBackdrop: HTMLElement;
let tutListEl: HTMLElement;
let tutPanel: HTMLElement;
let tutTitleEl: HTMLElement;
let tutStepEl: HTMLElement;
let tutTextEl: HTMLElement;
let tutBackBtn: HTMLButtonElement;
let tutNextBtn: HTMLButtonElement;
let currentTut: Tutorial | null = null;
let stepIdx = 0;

/* ===== player ===== */
const player = new Player({
  getController: activeCtrl,
  getMsPerStep: () => msPerStep(store.get().speed),
  isInstant: () => store.get().instant,
  onTick: (c) => {
    updateReadout(c);
    updateSeek(c);
    if (store.get().learn) updatePseudo(c);
  },
  onPlayingChange: (playing) => {
    setPlayUI(playing);
    // keep rendering briefly after a stop so bursts / the confirm sweep finish
    if (!playing) player.requestRender(1500);
  },
});

/* ===== icons ===== */
const PLAY_ICON =
  '<svg width="13" height="13" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><path d="M2.2 1.4 L10.4 6 L2.2 10.6 Z"/></svg>';
const PAUSE_ICON =
  '<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><rect x="2.2" y="1.5" width="2.8" height="9" rx="1"/><rect x="7" y="1.5" width="2.8" height="9" rx="1"/></svg>';

function setPlayUI(playing: boolean): void {
  playBtn.innerHTML = playing ? PAUSE_ICON + "<span>Pause</span>" : PLAY_ICON + "<span>Play</span>";
  playBtn.setAttribute("aria-label", playing ? "Pause" : "Play");
}

/* ===== shell ===== */
function buildShell(): void {
  const app = document.getElementById("app")!;

  modePathBtn = h("button", { class: "seg", "aria-pressed": "true", onclick: () => switchMode("path") }, "Pathfinding");
  modeSortBtn = h("button", { class: "seg", "aria-pressed": "false", onclick: () => switchMode("sort") }, "Sorting");

  learnBtn = h(
    "button",
    { class: "switch", role: "switch", "aria-checked": "false", onclick: () => setLearn(!store.get().learn) },
    h("span", { class: "track" }, h("span", { class: "knob" })),
    h("span", null, "Learn"),
  );
  instantBtn = h(
    "button",
    { class: "switch", role: "switch", "aria-checked": "false", onclick: () => setInstant(!store.get().instant) },
    h("span", { class: "track" }, h("span", { class: "knob" })),
    h("span", null, "Instant"),
  );

  const shareBtn = h(
    "button",
    { class: "switch pill", "aria-label": "Copy a shareable link" },
    h("span", null, "Share"),
  ) as HTMLButtonElement;
  shareBtn.onclick = () => void shareNow(shareBtn);

  const guideBtn = h(
    "button",
    { class: "switch pill", "aria-label": "Open guided tutorials", onclick: () => openGuide() },
    h("span", null, "Guide"),
  ) as HTMLButtonElement;

  const keysEl = h(
    "details",
    { class: "keys" },
    h("summary", { "aria-label": "Keyboard shortcuts" }, "Keys"),
    h(
      "div",
      { class: "keys-panel" },
      h(
        "dl",
        null,
        h("dt", null, h("kbd", null, "Space")),
        h("dd", null, "Play / pause"),
        h("dt", null, h("kbd", null, "S")),
        h("dd", null, "Step once"),
        h("dt", null, h("kbd", null, "←"), " ", h("kbd", null, "→")),
        h("dd", null, "Scrub a frame"),
        h("dt", null, h("kbd", null, "R")),
        h("dd", null, "Reset run"),
        h("dt", null, h("kbd", null, "M")),
        h("dd", null, "Switch mode"),
        h("dt", null, h("kbd", null, "G")),
        h("dd", null, "Maze / shuffle"),
        h("dt", null, h("kbd", null, "C")),
        h("dd", null, "Clear board"),
        h("dt", null, h("kbd", null, "I")),
        h("dd", null, "Instant"),
        h("dt", null, h("kbd", null, "L")),
        h("dd", null, "Learn mode"),
      ),
    ),
  );

  themeSelEl = h(
    "select",
    { class: "theme-select", "aria-label": "Theme", onchange: (e: Event) => setTheme((e.target as HTMLSelectElement).value) },
    ...THEMES.map((t) => h("option", { value: t }, t[0].toUpperCase() + t.slice(1))),
  ) as HTMLSelectElement;
  const themeSel = themeSelEl;

  const header = h(
    "header",
    { class: "appbar" },
    h(
      "div",
      { class: "brand" },
      h("span", { class: "wordmark" }, "Traverse"),
      h("span", { class: "brand-sub" }, "algorithm visualizer"),
    ),
    h("div", { class: "modes", role: "group", "aria-label": "Mode" }, modePathBtn, modeSortBtn),
    h("div", { class: "bar-right" }, guideBtn, learnBtn, instantBtn, shareBtn, keysEl, themeSel),
  );

  modeControls = h("div", { id: "modeControls" });

  speedInput = h("input", {
    type: "range",
    min: "0",
    max: "100",
    value: String(store.get().speed),
    "aria-label": "Animation speed",
    oninput: () => {
      store.set({ speed: +speedInput.value });
      speedVal.textContent = stepsPerSec(+speedInput.value) + "/s";
    },
  }) as HTMLInputElement;
  speedVal = h("span", { class: "val" }, stepsPerSec(store.get().speed) + "/s");

  seekInput = h("input", {
    type: "range",
    min: "0",
    max: "1",
    value: "0",
    "aria-label": "Scrub timeline",
    oninput: () => player.seekTo(+seekInput.value),
  }) as HTMLInputElement;
  seekVal = h("span", { class: "val" }, "0 / 0");

  playBtn = h("button", { class: "btn primary", id: "playBtn", "aria-label": "Play", onclick: () => player.toggle() });
  setPlayUI(false);
  const stepBtn = h("button", { class: "btn", "aria-label": "Step once", onclick: () => player.step() }, "Step");
  const resetBtn = h("button", { class: "btn", "aria-label": "Reset", onclick: () => player.reset() }, "Reset");

  const sharedControls = h(
    "div",
    { class: "panel" },
    modeControls,
    group("Speed", speedVal, wrap(speedInput)),
    group("Timeline", seekVal, wrap(seekInput)),
    group("Playback", null, h("div", { class: "transport" }, playBtn, stepBtn, resetBtn)),
  );

  aboutEl = h("section", { class: "panel about", "aria-live": "polite" });

  gridCanvas = h("canvas", {
    id: "gridCanvas",
    role: "img",
    "aria-label": "Pathfinding grid - explored cells and the shortest path animate here",
  }) as HTMLCanvasElement;
  sortCanvas = h("canvas", {
    id: "sortCanvas",
    class: "hidden",
    role: "img",
    "aria-label": "Sorting bars - comparisons and swaps animate here",
  }) as HTMLCanvasElement;
  stage = h(
    "div",
    { class: "stage", id: "stage" },
    h("span", { class: "tick tl" }),
    h("span", { class: "tick tr" }),
    h("span", { class: "tick bl" }),
    h("span", { class: "tick br" }),
    gridCanvas,
    sortCanvas,
  );

  readoutEl = h("div", { class: "readout" });
  legendEl = h("div", { class: "legend" });
  hintEl = h("p", { class: "hint" });
  pseudoCodeEl = h("div", { class: "pseudo-code" });
  narrationEl = h("div", { class: "narration" });
  pseudoPanel = h(
    "div",
    { class: "pseudo-panel hidden" },
    h("div", { class: "pseudo-head" }, "Pseudocode"),
    pseudoCodeEl,
    narrationEl,
  );

  const work = h("section", { class: "work" }, readoutEl, stage, legendEl, hintEl, pseudoPanel);
  const console_ = h("aside", { class: "console" }, sharedControls, aboutEl);
  const layout = h("div", { class: "layout" }, console_, work);

  const foot = h(
    "footer",
    { class: "foot" },
    h("span", null, "Traverse"),
    " · a study of how algorithms move",
  );

  // tutorial picker (modal)
  tutListEl = h("div", { class: "tut-list" });
  const modal = h(
    "div",
    { class: "modal", role: "dialog", "aria-label": "Guided tutorials" },
    h(
      "div",
      { class: "modal-head" },
      h("span", null, "Guided tutorials"),
      h("button", { class: "modal-close", "aria-label": "Close", onclick: () => closeGuide() }, "×"),
    ),
    tutListEl,
  );
  tutBackdrop = h(
    "div",
    {
      class: "modal-backdrop hidden",
      onclick: (e: Event) => {
        if (e.target === tutBackdrop) closeGuide();
      },
    },
    modal,
  );

  // active tutorial panel
  tutTitleEl = h("span", { class: "tut-title" });
  tutStepEl = h("span", { class: "tut-step" });
  tutTextEl = h("p", { class: "tut-text", "aria-live": "polite" });
  tutBackBtn = h("button", { class: "btn", onclick: () => prevStep() }, "Back") as HTMLButtonElement;
  tutNextBtn = h("button", { class: "btn primary", onclick: () => nextStep() }, "Next") as HTMLButtonElement;
  tutPanel = h(
    "div",
    { class: "tut-panel hidden" },
    h(
      "div",
      { class: "tut-panel-head" },
      tutTitleEl,
      tutStepEl,
      h("button", { class: "tut-x", "aria-label": "Exit tutorial", onclick: () => exitTutorial() }, "×"),
    ),
    tutTextEl,
    h("div", { class: "tut-nav" }, tutBackBtn, tutNextBtn),
  );

  mount(app, header, layout, foot, tutBackdrop, tutPanel);
  themeSel.value = store.get().theme;
}

/* ===== small DOM helpers ===== */
function group(label: string, valEl: HTMLElement | null, body: HTMLElement): HTMLElement {
  return h(
    "div",
    { class: "group" },
    h("p", { class: "eyebrow" }, label, valEl ?? ""),
    body,
  );
}
function wrap(input: HTMLInputElement): HTMLElement {
  return h("div", { class: "range-wrap" }, input);
}
function setPressed(nodes: HTMLElement[], active: HTMLElement): void {
  for (const n of nodes) n.setAttribute("aria-pressed", n === active ? "true" : "false");
}

/* ===== mode-specific controls ===== */
function buildPathControls(): void {
  const algoBtns: HTMLButtonElement[] = PATH_ALGOS.map((a) =>
    h(
      "button",
      { class: "btn", "aria-pressed": a.id === path.algoId ? "true" : "false" },
      a.name,
    ) as HTMLButtonElement,
  );
  algoBtns.forEach((b, idx) => {
    b.onclick = () => {
      path.setAlgo(PATH_ALGOS[idx].id);
      setPressed(algoBtns, b);
      buildAbout();
      player.refresh();
    };
  });

  const brushes: { id: "wall" | "weight" | "erase"; label: string }[] = [
    { id: "wall", label: "Wall" },
    { id: "weight", label: "Weight" },
    { id: "erase", label: "Erase" },
  ];
  const brushBtns: HTMLButtonElement[] = brushes.map((br) =>
    h(
      "button",
      {
        class: "seg",
        dataset: { brush: br.id },
        "aria-pressed": br.id === path.brush ? "true" : "false",
        onclick: () => {
          path.setBrush(br.id);
          setPressed(brushBtns, brushBtns[brushes.findIndex((x) => x.id === br.id)]);
        },
      },
      br.label,
    ) as HTMLButtonElement,
  );

  const diagBtn = h(
    "button",
    {
      class: "switch full",
      role: "switch",
      "aria-checked": path.diagonal ? "true" : "false",
      onclick: () => {
        path.setDiagonal(!path.diagonal);
        diagBtn.setAttribute("aria-checked", path.diagonal ? "true" : "false");
        player.refresh();
      },
    },
    h("span", { class: "track" }, h("span", { class: "knob" })),
    h("span", null, "Diagonal movement"),
  );

  const mazeSel = h(
    "select",
    {
      class: "mini-select",
      "aria-label": "Maze type",
      onchange: (e: Event) => path.setMaze((e.target as HTMLSelectElement).value),
    },
    ...MAZE_LIST.map((m) => h("option", { value: m.id }, m.name)),
  ) as HTMLSelectElement;
  mazeSel.value = path.mazeId;

  const mazeBtn = h("button", { class: "btn", onclick: () => { path.generateMaze(); player.refresh(); } }, "Generate maze");
  const clearBtn = h("button", { class: "btn", onclick: () => { path.clearBoard(); player.refresh(); } }, "Clear board");

  mount(
    modeControls,
    group("Algorithm", null, h("div", { class: "grid2" }, ...algoBtns)),
    group("Brush", null, h("div", { class: "modes sm" }, ...brushBtns)),
    group("Movement", null, diagBtn),
    group("Maze", null, h("div", { class: "stack" }, mazeSel, h("div", { class: "grid2" }, mazeBtn, clearBtn))),
  );
}

function buildSortControls(): void {
  const aBtns: HTMLButtonElement[] = SORT_ALGOS.map((a) =>
    h(
      "button",
      {
        class: "btn",
        "aria-pressed": a.id === sort.algoAId ? "true" : "false",
        onclick: () => {
          sort.setAlgoA(a.id);
          setPressed(aBtns, aBtns[SORT_ALGOS.findIndex((x) => x.id === a.id)]);
          buildAbout();
          player.refresh();
        },
      },
      a.name,
    ) as HTMLButtonElement,
  );

  const bBtns: HTMLButtonElement[] = SORT_ALGOS.map((a) =>
    h(
      "button",
      {
        class: "btn",
        "aria-pressed": a.id === sort.algoBId ? "true" : "false",
        onclick: () => {
          sort.setAlgoB(a.id);
          setPressed(bBtns, bBtns[SORT_ALGOS.findIndex((x) => x.id === a.id)]);
          buildReadout();
          player.refresh();
        },
      },
      a.name,
    ) as HTMLButtonElement,
  );
  const bGroup = group("Versus (B)", null, h("div", { class: "grid2" }, ...bBtns));
  bGroup.classList.toggle("hidden", !sort.race);

  const raceBtn = h(
    "button",
    {
      class: "switch full",
      role: "switch",
      "aria-checked": sort.race ? "true" : "false",
      onclick: () => {
        sort.setRace(!sort.race);
        raceBtn.setAttribute("aria-checked", sort.race ? "true" : "false");
        bGroup.classList.toggle("hidden", !sort.race);
        buildReadout();
        buildLegend();
        buildAbout();
        player.refresh();
      },
    },
    h("span", { class: "track" }, h("span", { class: "knob" })),
    h("span", null, "Race two algorithms"),
  );

  const sizeInput = h("input", {
    type: "range",
    min: "8",
    max: "160",
    value: String(sort.size),
    "aria-label": "Array size",
    oninput: () => {
      sort.size = +sizeInput.value;
      sizeVal.textContent = sizeInput.value;
      sort.setSize(+sizeInput.value);
      player.requestRender();
    },
    onchange: () => player.refresh(),
  }) as HTMLInputElement;
  const sizeVal = h("span", { class: "val" }, String(sort.size));

  const soundBtn = h(
    "button",
    {
      class: "switch full",
      role: "switch",
      "aria-checked": store.get().sound ? "true" : "false",
      onclick: () => {
        const on = audio.toggle();
        store.set({ sound: on });
        soundBtn.setAttribute("aria-checked", on ? "true" : "false");
      },
    },
    h("span", { class: "track" }, h("span", { class: "knob" })),
    h("span", null, "Sound"),
  );

  const shuffleBtn = h("button", { class: "btn full", onclick: () => { sort.shuffle(); player.refresh(); } }, "Shuffle");

  mount(
    modeControls,
    group("Algorithm", null, h("div", { class: "grid2" }, ...aBtns)),
    group("", null, raceBtn),
    bGroup,
    group("Array size", sizeVal, wrap(sizeInput)),
    group("", null, soundBtn),
    group("", null, shuffleBtn),
  );
}

/* ===== readout / legend / about / pseudo ===== */
let lastStatSig = "";
function buildReadout(): void {
  lastStatSig = "";
  updateReadout(activeCtrl());
}
function updateReadout(c: Controller): void {
  const stats = c.stats();
  const sig = stats.map((s) => s.key).join("|") + "#" + stats.length;
  if (sig !== lastStatSig) {
    mount(readoutEl, ...stats.map((s) => chip(s)));
    lastStatSig = sig;
  } else {
    const vals = readoutEl.querySelectorAll<HTMLElement>(".chip .v");
    stats.forEach((s, i) => {
      if (vals[i]) vals[i].textContent = s.value;
    });
  }
}
function chip(s: Stat): HTMLElement {
  return h("div", { class: "chip" }, h("div", { class: "k" }, s.key), h("div", { class: "v" }, s.value));
}

function buildLegend(): void {
  mount(legendEl, ...activeCtrl().legend().map(legendItem));
}
function legendItem(it: LegendItem): HTMLElement {
  const swatch =
    it.kind === "gradient"
      ? h("i", { style: { background: it.color, width: "34px" } })
      : h("i", { class: it.kind === "dot" ? "dot" : it.kind === "line" ? "line" : "", style: { background: it.color } });
  return h("span", null, swatch, it.label);
}

function buildAbout(): void {
  const info = activeCtrl().info();
  mount(
    aboutEl,
    h("div", { class: "a-name" }, info.name),
    h("div", { class: "a-cx" }, info.complexity),
    h("div", { class: "a-desc" }, info.description),
    h("div", { class: "tags" }, ...info.tags.map((tg) => h("span", { class: "tag" }, tg))),
  );
}

let lastPseudoSig = "";
let pseudoLineEls: HTMLElement[] = [];
function buildPseudo(): void {
  lastPseudoSig = "";
  updatePseudo(activeCtrl());
}
function updatePseudo(c: Controller): void {
  const lines = c.pseudocode();
  const sig = c.info().id + "#" + lines.length;
  if (sig !== lastPseudoSig) {
    pseudoLineEls = lines.map((ln, i) => h("div", { class: "pseudo-line", dataset: { i: String(i) } }, ln));
    mount(pseudoCodeEl, ...pseudoLineEls);
    lastPseudoSig = sig;
  }
  const active = c.activeLine();
  pseudoLineEls.forEach((el, i) => {
    const on = i === active;
    el.classList.toggle("active", on);
    if (on) el.setAttribute("aria-current", "step");
    else el.removeAttribute("aria-current");
  });
  narrationEl.textContent = c.narration();
}

/* ===== seek ===== */
function updateSeek(c: Controller): void {
  const total = c.total || 0;
  const mx = Math.max(1, total);
  if (+seekInput.max !== mx) seekInput.max = String(mx);
  if (+seekInput.value !== c.cursor) seekInput.value = String(c.cursor);
  seekVal.textContent = `${c.cursor} / ${total}`;
}

/* ===== mode + sizing ===== */
function resizeActive(): void {
  const canvas = store.get().mode === "path" ? gridCanvas : sortCanvas;
  const w = canvas.clientWidth;
  const hgt = canvas.clientHeight;
  if (w === 0 || hgt === 0) return;
  const ctx = sizeCanvas(canvas, w, hgt);
  activeCtrl().setViewport(ctx, w, hgt);
  player.requestRender();
}

function switchMode(m: "path" | "sort"): void {
  player.pause();
  store.set({ mode: m });
  const isPath = m === "path";
  modePathBtn.setAttribute("aria-pressed", isPath ? "true" : "false");
  modeSortBtn.setAttribute("aria-pressed", isPath ? "false" : "true");
  gridCanvas.classList.toggle("hidden", !isPath);
  sortCanvas.classList.toggle("hidden", isPath);
  if (isPath) buildPathControls();
  else buildSortControls();
  buildReadout();
  buildLegend();
  buildAbout();
  buildPseudo();
  hintEl.textContent = activeCtrl().hint();
  resizeActive();
  setPlayUI(false);
  player.refresh();
}

/* ===== toggles ===== */
function setInstant(v: boolean): void {
  store.set({ instant: v });
  path.instant = v;
  sort.instant = v;
  instantBtn.setAttribute("aria-checked", v ? "true" : "false");
  player.requestRender();
}
function setLearn(v: boolean): void {
  store.set({ learn: v });
  learnBtn.setAttribute("aria-checked", v ? "true" : "false");
  pseudoPanel.classList.toggle("hidden", !v);
  if (v) buildPseudo();
}
function setTheme(name: string): void {
  store.set({ theme: name });
  document.documentElement.setAttribute("data-theme", name);
  refreshPalette();
  player.requestRender();
}

/* ===== shareable links ===== */
function buildShareURL(): string {
  const st = store.get();
  const state: share.ShareState = { mode: st.mode, theme: st.theme };
  if (st.mode === "path") {
    const s = path.snapshot();
    state.path = {
      algo: s.algo,
      diagonal: s.diagonal,
      rows: s.rows,
      cols: s.cols,
      start: [s.start.r, s.start.c],
      end: [s.end.r, s.end.c],
      board: share.encodeBoard(s.walls, s.weights, s.rows, s.cols),
    };
  } else {
    const s = sort.snapshot();
    state.sort = { algoA: s.algoA, algoB: s.algoB, race: s.race, size: s.size, seed: s.seed };
  }
  return share.serialize(state);
}

async function shareNow(btn: HTMLButtonElement): Promise<void> {
  history.replaceState(null, "", "#" + buildShareURL());
  const label = btn.querySelector("span");
  const old = label?.textContent ?? "Share";
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(location.href);
      if (label) label.textContent = "Copied!";
    } else if (label) {
      label.textContent = "Link in URL";
    }
  } catch {
    if (label) label.textContent = "Link in URL";
  }
  window.setTimeout(() => {
    if (label) label.textContent = old;
  }, 1500);
}

function loadFromURL(): "path" | "sort" {
  try {
    return applyFromURL();
  } catch {
    // never let a malformed shared link break startup
    return store.get().mode;
  }
}
function applyFromURL(): "path" | "sort" {
  const parsed = share.parse(location.hash);
  if (!parsed) return store.get().mode;
  if (THEMES.includes(parsed.theme)) store.set({ theme: parsed.theme });
  if (parsed.mode === "path" && parsed.path) {
    const pa = parsed.path;
    if (PATH_BY_ID[pa.algo] && pa.rows > 0 && pa.cols > 0 && pa.rows <= 80 && pa.cols <= 120) {
      const decoded = share.decodeBoard(pa.board, pa.rows, pa.cols);
      if (decoded) {
        // validate start/end from the (possibly tampered) link; fall back to defaults
        const inRange = (p: [number, number]): boolean =>
          Number.isInteger(p[0]) && Number.isInteger(p[1]) && p[0] >= 0 && p[0] < pa.rows && p[1] >= 0 && p[1] < pa.cols;
        let start = { r: pa.start[0], c: pa.start[1] };
        let end = { r: pa.end[0], c: pa.end[1] };
        const same = start.r === end.r && start.c === end.c;
        const onWall = (c: { r: number; c: number }): boolean => !!decoded.walls[c.r]?.[c.c];
        if (!inRange(pa.start) || !inRange(pa.end) || same || onWall(start) || onWall(end)) {
          start = { r: Math.floor(pa.rows / 2), c: Math.max(1, Math.round(pa.cols * 0.18)) };
          end = { r: Math.floor(pa.rows / 2), c: Math.min(pa.cols - 2, Math.round(pa.cols * 0.82)) };
          if (decoded.walls[start.r]) decoded.walls[start.r][start.c] = false;
          if (decoded.walls[end.r]) decoded.walls[end.r][end.c] = false;
        }
        path.loadBoard(pa.rows, pa.cols, start, end, decoded.walls, decoded.weights, pa.algo, pa.diagonal);
      }
    }
    return "path";
  }
  if (parsed.mode === "sort" && parsed.sort) {
    const so = parsed.sort;
    if (SORT_BY_ID[so.algoA]) {
      const size = clamp(so.size, 8, 160);
      sort.loadState(size, so.seed, so.algoA, SORT_BY_ID[so.algoB] ? so.algoB : so.algoA, so.race);
    }
    return "sort";
  }
  return parsed.mode;
}

/* ===== guided tutorials ===== */
const director: Director = {
  enableLearn(): void {
    if (!store.get().learn) setLearn(true);
  },
  loadPath(o): void {
    path.loadBoard(
      o.rows,
      o.cols,
      { r: o.start[0], c: o.start[1] },
      { r: o.end[0], c: o.end[1] },
      o.walls,
      o.weights,
      o.algo,
      o.diagonal ?? false,
    );
    switchMode("path");
  },
  loadSort(o): void {
    sort.loadState(o.size, o.seed, o.algoA, o.algoB ?? o.algoA, o.race ?? false);
    switchMode("sort");
  },
  play(): void {
    player.play();
  },
};

function openGuide(): void {
  mount(
    tutListEl,
    ...TUTORIALS.map((t) =>
      h(
        "button",
        { class: "tut-card", onclick: () => startTutorial(t) },
        h("div", { class: "tut-card-title" }, t.title),
        h("div", { class: "tut-card-blurb" }, t.blurb),
      ),
    ),
  );
  tutBackdrop.classList.remove("hidden");
}
function closeGuide(): void {
  tutBackdrop.classList.add("hidden");
}
function startTutorial(t: Tutorial): void {
  currentTut = t;
  stepIdx = 0;
  closeGuide();
  tutPanel.classList.remove("hidden");
  showStep();
}
function showStep(): void {
  if (!currentTut) return;
  const step = currentTut.steps[stepIdx];
  tutTitleEl.textContent = currentTut.title;
  tutStepEl.textContent = `Step ${stepIdx + 1} / ${currentTut.steps.length}`;
  tutTextEl.textContent = step.text;
  tutBackBtn.disabled = stepIdx === 0;
  tutNextBtn.textContent = stepIdx === currentTut.steps.length - 1 ? "Finish" : "Next";
  step.run?.(director);
}
function nextStep(): void {
  if (!currentTut) return;
  if (stepIdx >= currentTut.steps.length - 1) {
    exitTutorial();
    return;
  }
  stepIdx++;
  showStep();
}
function prevStep(): void {
  if (!currentTut || stepIdx === 0) return;
  stepIdx--;
  showStep();
}
function exitTutorial(): void {
  currentTut = null;
  tutPanel.classList.add("hidden");
  player.pause();
  // a tutorial pins the grid to a fixed size; re-enable viewport auto-fit on the way out
  path.unlockDims();
}

/* ===== pointer (grid painting) ===== */
function gridPoint(e: PointerEvent) {
  const rect = gridCanvas.getBoundingClientRect();
  return path.cellAt(e.clientX - rect.left, e.clientY - rect.top);
}
function wireGrid(): void {
  // only the pointer that began the drag may continue/finish it (ignore extra touches)
  let activePointerId: number | null = null;
  gridCanvas.addEventListener("pointerdown", (e) => {
    if (!e.isPrimary || store.get().mode !== "path") return;
    const cell = gridPoint(e);
    if (!cell) return;
    try {
      gridCanvas.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    activePointerId = e.pointerId;
    path.pointerDown(cell);
    player.requestRender();
    e.preventDefault();
  });
  gridCanvas.addEventListener("pointermove", (e) => {
    if (store.get().mode !== "path") return;
    if (path.isDragging() && activePointerId !== null && e.pointerId !== activePointerId) return;
    const cell = gridPoint(e);
    if (!cell) {
      if (path.hover) {
        path.hover = null;
        player.requestRender();
      }
      return;
    }
    if (path.isDragging()) {
      path.moveTo(cell);
      player.requestRender();
    } else if (!path.hover || path.hover.r !== cell.r || path.hover.c !== cell.c) {
      path.hover = cell;
      player.requestRender();
    }
  });
  const end = (e: PointerEvent) => {
    if (activePointerId !== null && e.pointerId !== activePointerId) return; // not the owning pointer
    if (path.isDragging()) {
      path.pointerUp();
      player.refresh();
    }
    activePointerId = null;
    try {
      gridCanvas.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };
  gridCanvas.addEventListener("pointerup", end);
  gridCanvas.addEventListener("pointercancel", end);
  gridCanvas.addEventListener("pointerleave", () => {
    if (!path.isDragging() && path.hover) {
      path.hover = null;
      player.requestRender();
    }
  });
}

/* ===== keyboard ===== */
function wireKeys(): void {
  window.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = (e.target as HTMLElement | null)?.tagName ?? "";
    const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
    const k = e.key;
    if (k === " " || k === "Spacebar") {
      if (tag === "BUTTON" || typing) return;
      e.preventDefault();
      player.toggle();
      return;
    }
    if (typing) return;
    const low = k.length === 1 ? k.toLowerCase() : k;
    if (low === "s") {
      e.preventDefault();
      player.step();
    } else if (k === "ArrowLeft") {
      e.preventDefault();
      player.seekTo(activeCtrl().cursor - 1);
    } else if (k === "ArrowRight") {
      e.preventDefault();
      player.seekTo(activeCtrl().cursor + 1);
    } else if (low === "r") player.reset();
    else if (low === "m") switchMode(store.get().mode === "path" ? "sort" : "path");
    else if (low === "g") {
      if (store.get().mode === "path") {
        path.generateMaze();
      } else {
        sort.shuffle();
      }
      player.refresh();
    } else if (low === "c") {
      if (store.get().mode === "path") {
        path.clearBoard();
        player.refresh();
      }
    } else if (low === "i") setInstant(!store.get().instant);
    else if (low === "l") setLearn(!store.get().learn);
  });
}

/* ===== init ===== */
function init(): void {
  const startMode = loadFromURL();
  buildShell();
  document.documentElement.setAttribute("data-theme", store.get().theme);
  wireGrid();
  wireKeys();
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) setInstant(true);
  switchMode(startMode);

  if (window.ResizeObserver) {
    let pending = false;
    const ro = new ResizeObserver(() => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        resizeActive();
      });
    });
    ro.observe(stage);
  }
  window.addEventListener("resize", () => player.requestRender());
  requestAnimationFrame(resizeActive);
}

init();
