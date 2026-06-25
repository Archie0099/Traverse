/** Size a canvas to CSS pixels with a DPR cap of 2× and return its 2D context. */
export function sizeCanvas(canvas: HTMLCanvasElement, w: number, h: number): CanvasRenderingContext2D {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.round(w * dpr));
  canvas.height = Math.max(1, Math.round(h * dpr));
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  if (r <= 0) {
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    return;
  }
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

type Child = Node | string | number | null | undefined | false;

/** Tiny hyperscript helper for building DOM without a framework. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props?: Record<string, unknown> | null,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === "class") node.className = String(v);
      else if (k === "html") node.innerHTML = String(v);
      else if (k === "style" && typeof v === "object") Object.assign(node.style, v as object);
      else if (k.startsWith("on") && typeof v === "function") {
        node.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
      } else if (k === "dataset" && typeof v === "object") {
        Object.assign(node.dataset, v as object);
      } else if (k in node) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (node as any)[k] = v;
      } else {
        node.setAttribute(k, String(v));
      }
    }
  }
  for (const c of children) append(node, c);
  return node;
}

function append(node: HTMLElement, c: Child): void {
  if (c == null || c === false) return;
  node.append(c instanceof Node ? c : document.createTextNode(String(c)));
}

/** Replace all children of an element. */
export function mount(parent: HTMLElement, ...children: Child[]): void {
  parent.replaceChildren();
  for (const c of children) append(parent, c);
}
