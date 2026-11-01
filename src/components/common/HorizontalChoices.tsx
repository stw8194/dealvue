import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Show hints only at edges that have more content. */
export default function HorizontalChoices({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  const viewport = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  useEffect(() => {
    const element = viewport.current, rail = content.current;
    if (!element || !rail) return;
    const measure = () => {
      const left = element.scrollLeft > 2;
      const right = element.scrollWidth - element.clientWidth - element.scrollLeft > 2;
      setEdges(previous => previous.left === left && previous.right === right ? previous : { left, right });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    observer.observe(rail);
    element.addEventListener("scroll", measure, { passive: true });
    return () => { observer.disconnect(); element.removeEventListener("scroll", measure); };
  }, []);
  const move = (direction: number) => {
    const element = viewport.current;
    if (element) element.scrollBy({ left: direction * element.clientWidth * .75, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  };
  return <div className="relative min-w-0">
    <div id={id} ref={viewport} className="overflow-x-auto overscroll-x-contain py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div ref={content} className="flex w-max min-w-full flex-nowrap gap-2 px-0.5">{children}</div>
    </div>
    {edges.left && <div className="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center">
      <button type="button" aria-label={`${label} 왼쪽으로 넘기기`} aria-controls={id} onClick={() => move(-1)} className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full border border-page-border bg-white text-accent shadow-sm focus-visible:outline-2 focus-visible:outline-accent"><ChevronLeft size={19} /></button>
    </div>}
    {edges.right && <div className="pointer-events-none absolute inset-y-0 right-0 flex w-11 items-center justify-end">
      <button type="button" aria-label={`${label} 오른쪽으로 넘기기`} aria-controls={id} onClick={() => move(1)} className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full border border-page-border bg-white text-accent shadow-sm focus-visible:outline-2 focus-visible:outline-accent"><ChevronRight size={19} /></button>
    </div>}
  </div>;
}
