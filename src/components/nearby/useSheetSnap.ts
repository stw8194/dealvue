import { useEffect, type RefObject } from "react";

// Follow native scrolling during the gesture, then settle only the map-to-list
// transition. Scrolling through the fully raised list stays unrestricted.
export function useSheetSnap(
  scrollRef: RefObject<HTMLDivElement | null>,
  spacerRef: RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    const scroller = scrollRef.current;
    const spacer = spacerRef.current;
    if (!scroller || !spacer) return;
    let raised = false;
    let touching = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let frame: number | undefined;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const stop = () => {
      clearTimeout(timer);
      if (frame !== undefined) cancelAnimationFrame(frame);
      frame = undefined;
    };

    const settle = () => {
      if (touching || frame !== undefined) return;
      const travel = spacer.offsetHeight;
      const current = scroller.scrollTop;
      if (travel <= 0 || current >= travel - 1) { raised = true; return; }
      if (current <= 1) { raised = false; return; }

      // About a quarter of the map, capped so both tall and small screens feel
      // deliberate. Tiny scrolls return to the previous resting position.
      const threshold = Math.min(travel / 2, Math.max(56, Math.min(100, travel * 0.25)));
      const nextRaised = raised ? travel - current < threshold : current >= threshold;
      const target = nextRaised ? travel : 0;
      const started = performance.now();
      const duration = reducedMotion.matches ? 0 : 260;
      const animate = (time: number) => {
        const progress = duration ? Math.min(1, (time - started) / duration) : 1;
        const eased = 1 - (1 - progress) ** 3;
        scroller.scrollTop = current + (target - current) * eased;
        if (progress < 1) frame = requestAnimationFrame(animate);
        else { frame = undefined; raised = nextRaised; }
      };
      frame = requestAnimationFrame(animate);
    };

    const schedule = () => {
      clearTimeout(timer);
      if (!touching && frame === undefined) timer = setTimeout(settle, 150);
    };
    const onScroll = () => { if (frame === undefined) schedule(); };
    const onTouchStart = () => { stop(); touching = true; };
    const onTouchEnd = () => { touching = false; schedule(); };
    const onWheel = () => { stop(); schedule(); };
    const onKeyDown = (event: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) {
        stop(); schedule();
      }
    };

    scroller.addEventListener("scroll", onScroll, { passive: true });
    scroller.addEventListener("touchstart", onTouchStart, { passive: true });
    scroller.addEventListener("touchend", onTouchEnd, { passive: true });
    scroller.addEventListener("touchcancel", onTouchEnd, { passive: true });
    scroller.addEventListener("wheel", onWheel, { passive: true });
    scroller.addEventListener("keydown", onKeyDown);
    return () => {
      stop();
      scroller.removeEventListener("scroll", onScroll);
      scroller.removeEventListener("touchstart", onTouchStart);
      scroller.removeEventListener("touchend", onTouchEnd);
      scroller.removeEventListener("touchcancel", onTouchEnd);
      scroller.removeEventListener("wheel", onWheel);
      scroller.removeEventListener("keydown", onKeyDown);
    };
  }, [scrollRef, spacerRef]);
}
