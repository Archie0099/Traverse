import { describe, it, expect, beforeAll } from "vitest";

/** A no-op 2D context: every method does nothing, measureText returns a width. */
function noopCtx(): unknown {
  return new Proxy(
    {},
    {
      get: (_t, prop) => {
        if (prop === "canvas") return {};
        if (prop === "measureText") return () => ({ width: 0 });
        return () => {};
      },
      set: () => true,
    },
  );
}

beforeAll(async () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as any;
  HTMLCanvasElement.prototype.getContext = (() => noopCtx()) as never;
  if (!window.matchMedia) {
    g.matchMedia = () => ({
      matches: false,
      media: "",
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      onchange: null,
      dispatchEvent: () => false,
    });
  }
  g.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  g.requestAnimationFrame = () => 0;
  g.cancelAnimationFrame = () => {};
  // jsdom has no layout - give canvases a real size so layout + algorithms run.
  Object.defineProperty(HTMLCanvasElement.prototype, "clientWidth", { configurable: true, get: () => 640 });
  Object.defineProperty(HTMLCanvasElement.prototype, "clientHeight", { configurable: true, get: () => 480 });
  document.body.innerHTML = '<div id="app"></div>';
  await import("../src/main");
});

describe("app shell", () => {
  it("builds the chrome", () => {
    expect(document.querySelector(".appbar")).toBeTruthy();
    expect(document.querySelector("#gridCanvas")).toBeTruthy();
    expect(document.querySelector("#sortCanvas")).toBeTruthy();
    expect(document.querySelectorAll(".chip").length).toBeGreaterThan(0);
  });

  it("drives pathfinding transport without throwing", () => {
    const play = document.getElementById("playBtn") as HTMLButtonElement;
    expect(() => {
      play.click(); // play
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "s" })); // step
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" })); // scrub
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "r" })); // reset
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "g" })); // maze
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "c" })); // clear
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "i" })); // instant
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "l" })); // learn
    }).not.toThrow();
  });

  it("switches to sorting and drives it without throwing", () => {
    const segs = document.querySelectorAll<HTMLButtonElement>(".modes .seg");
    expect(() => {
      segs[1].click(); // sorting mode
      const play = document.getElementById("playBtn") as HTMLButtonElement;
      play.click();
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "s" }));
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "g" })); // shuffle
      // scrub
      const seek = document.querySelector<HTMLInputElement>('input[aria-label="Scrub timeline"]')!;
      seek.value = "0";
      seek.dispatchEvent(new Event("input"));
    }).not.toThrow();
  });

  it("toggles theme without throwing", () => {
    const sel = document.querySelector<HTMLSelectElement>(".theme-select")!;
    expect(() => {
      sel.value = "paper";
      sel.dispatchEvent(new Event("change"));
      sel.value = "aurora";
      sel.dispatchEvent(new Event("change"));
    }).not.toThrow();
    expect(document.documentElement.getAttribute("data-theme")).toBe("aurora");
  });

  it("runs guided tutorials (path + sort) without throwing", () => {
    const pills = Array.from(document.querySelectorAll<HTMLButtonElement>(".bar-right .switch.pill"));
    const guide = pills.find((b) => b.textContent?.includes("Guide"))!;
    expect(guide).toBeTruthy();
    expect(() => {
      guide.click();
      document.querySelectorAll<HTMLButtonElement>(".tut-card")[0].click();
      let next = document.querySelector<HTMLButtonElement>(".tut-nav .primary")!;
      next.click();
      next.click(); // finish (path)

      guide.click();
      const cards = document.querySelectorAll<HTMLButtonElement>(".tut-card");
      cards[cards.length - 1].click(); // sort showdown
      next = document.querySelector<HTMLButtonElement>(".tut-nav .primary")!;
      next.click();
      next.click(); // finish (sort)
    }).not.toThrow();
  });
});
