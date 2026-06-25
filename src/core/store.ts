export type Listener<T> = (state: T, prev: T) => void;

export interface Store<T> {
  get(): T;
  set(patch: Partial<T>): void;
  subscribe(fn: Listener<T>): () => void;
}

/** Minimal reactive store: shallow-merge patches, notify subscribers on change. */
export function createStore<T extends object>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<Listener<T>>();
  return {
    get: () => state,
    set(patch) {
      const prev = state;
      let changed = false;
      for (const k in patch) {
        if (patch[k] !== state[k]) {
          changed = true;
          break;
        }
      }
      if (!changed) return;
      state = { ...state, ...patch };
      for (const fn of listeners) fn(state, prev);
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
