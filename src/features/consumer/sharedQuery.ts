type Snapshot<T> = { data: T | undefined; error: string | null; ready: boolean; fetching: boolean };

let mutationVersion = 0;
let watchingMutations = false;

/** One request and timer per query, regardless of how many components use it. */
export function createSharedQuery<T>(load: () => Promise<T>, interval = 10_000) {
  if (!watchingMutations && typeof window !== "undefined") {
    watchingMutations = true;
    window.addEventListener("dealvue-bookings-changed", () => { mutationVersion += 1; });
  }
  let snapshot: Snapshot<T> = { data: undefined, error: null, ready: false, fetching: false };
  let pending: Promise<void> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let nextAt = 0;
  let failures = 0;
  let version = mutationVersion;
  let invalidated = false;
  const listeners = new Set<() => void>();
  const visible = () => typeof document === "undefined" || document.visibilityState !== "hidden";
  const notify = () => { for (const listener of listeners) listener(); };
  const clearTimer = () => { clearTimeout(timer); timer = undefined; };

  function schedule() {
    clearTimer();
    if (!listeners.size || !visible() || pending) return;
    // Spread client polls; schedule after completion so slow queries cannot overlap.
    timer = setTimeout(() => { void refresh(); }, Math.max(1, nextAt - Date.now()));
  }

  function refresh(force = false): Promise<void> {
    if (pending) return pending;
    if (!visible()) return Promise.resolve();
    if (!force && !invalidated && Date.now() < nextAt) { schedule(); return Promise.resolve(); }
    invalidated = false;
    version = mutationVersion;
    clearTimer();
    pending = Promise.resolve().then(load).then(data => {
      failures = 0;
      snapshot = { data, error: null, ready: true, fetching: false };
    }, (error: unknown) => {
      failures += 1;
      snapshot = { ...snapshot, ready: true, fetching: false, error: error instanceof Error ? error.message : "정보를 불러오지 못했습니다." };
    }).then(() => {
      pending = undefined;
      nextAt = Date.now() + Math.min(interval * 2 ** failures, 120_000) * (1 + Math.random() * 0.2);
      notify();
      // A mutation during an older read must get one fresh read after it settles.
      if (invalidated && listeners.size && visible()) void refresh(true);
      else schedule();
    });
    snapshot = { ...snapshot, fetching: true };
    notify();
    return pending;
  }

  function invalidate() {
    invalidated = true;
    nextAt = 0;
    if (listeners.size) void refresh(true);
  }
  const resume = () => { if (visible()) void refresh(); else clearTimer(); };
  const retry = () => { void refresh(true); };

  return {
    getSnapshot: () => snapshot,
    refresh,
    retry,
    invalidate,
    isActive: () => listeners.size > 0,
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (listeners.size === 1) {
        if (version !== mutationVersion) { invalidated = true; nextAt = 0; }
        window.addEventListener("focus", resume);
        document.addEventListener("visibilitychange", resume);
        window.addEventListener("dealvue-bookings-changed", invalidate);
        void refresh();
      }
      return () => {
        listeners.delete(listener);
        if (!listeners.size) {
          clearTimer();
          window.removeEventListener("focus", resume);
          document.removeEventListener("visibilitychange", resume);
          window.removeEventListener("dealvue-bookings-changed", invalidate);
        }
      };
    },
  };
}
