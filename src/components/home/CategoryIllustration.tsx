import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/** Small line illustrations matching the reference's beauty category tiles. */
export default function CategoryIllustration({ id, fallback: Icon }: { id: string; fallback: LucideIcon }) {
  const illustrations: Record<string, ReactNode> = {
    makeup: <><circle cx="19" cy="14" r="10" fill="#fffafb" /><circle cx="19" cy="14" r="7.5" /><path d="M9 24c-3 1-5 3-5 6s6 6 15 6 15-3 15-6-6-6-15-6Z" fill="#fce4ed" /><ellipse cx="19" cy="29" rx="11" ry="3.5" /><path d="M28 28c4-1 9 1 10 4s-2 5-6 4-6-4-4-8Z" fill="#fffafb" /></>,
    aesthetic: <><path d="M9 19C8 7 15 1 21 1s13 7 12 19" fill="#fce4ed" /><path d="M10 12c5-7 15-7 22 1M9 17c6-7 16-7 24 1M15 4c7 0 11 3 15 7" /><path d="M10 21c0-8 22-8 22 0-1 11-6 17-11 17S11 32 10 21Z" fill="#fffafb" /><path d="M14 23h4m7 0h3m-7 1-1 5h3m-6 3c3 2 5 2 8 0M14 19l4-1m7 0 3 1" /></>,
    nail: <><path d="M16 4h10v17H16Z" fill="#fce4ed" /><path d="M18 5v15m5-15v15M15 21h12v3H15Z" /><rect x="11" y="24" width="20" height="16" rx="3" fill="#fce4ed" /><rect x="14" y="27" width="14" height="10" rx="1.5" fill="#fffafb" /></>,
    eyelash: <><path d="M5 16c9 13 23 13 32 0M5 16l-3 4m6-1-3 5m6-2-2 6m7-4-1 7m6-6v7m5-8 2 7m3-10 3 6m-1-10 4 5m-1-9 4 4" /><path d="M8 14c8 10 18 10 26 0" opacity=".45" /></>,
  };
  return illustrations[id] ? <svg aria-hidden="true" width="36" height="36" viewBox="0 0 42 42" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">{illustrations[id]}</svg> : <Icon aria-hidden="true" size={28} strokeWidth={1.25} />;
}
