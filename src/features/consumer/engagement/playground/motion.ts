import { useEffect, useSyncExternalStore, type RefObject } from "react";
import { localDay } from "../store";
const motionQuery = "(prefers-reduced-motion: reduce)";
function subscribe(callback: () => void) {
  const query = window.matchMedia(motionQuery);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
export function useReducedMotion() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(motionQuery).matches, () => true);
}
function subscribeDay(callback: () => void) {
  let timer: ReturnType<typeof setTimeout>;
  const schedule = () => {
    clearTimeout(timer);
    callback();
    const now = Date.now(), koreaOffset = 9 * 3600000;
    const nextMidnight = Math.floor((now + koreaOffset) / 86400000) * 86400000 + 86400000 - koreaOffset;
    timer = setTimeout(schedule, nextMidnight - now + 50);
  };
  schedule();
  document.addEventListener("visibilitychange", schedule);
  return () => { clearTimeout(timer); document.removeEventListener("visibilitychange", schedule); };
}
export function useKoreanDay() { return useSyncExternalStore(subscribeDay, () => localDay(), () => localDay()); }
/** Ambient animation never needs a React render loop; pause hidden scenes. */
export function useAmbientMotion(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let visible = true;
    const update = () => { element.dataset.paused = String(!visible || document.hidden); };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); });
    observer.observe(element);
    document.addEventListener("visibilitychange", update);
    update();
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", update); };
  }, [ref]);
}
