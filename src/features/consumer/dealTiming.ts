import { useEffect, useState } from "react";
import type { ConsumerDeal } from "./types";

export function useDealTime() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  return now;
}

export function isOpenDeal(deal: ConsumerDeal, now: number) {
  return deal.remainingCapacity > 0 && Number.isFinite(Date.parse(deal.endAt)) && Date.parse(deal.endAt) > now;
}

export function remainingLabel(endAt: string, now: number) {
  const seconds = Math.max(0, Math.floor((Date.parse(endAt) - now) / 1000));
  if (!Number.isFinite(seconds) || seconds === 0) return "마감";
  const days = Math.floor(seconds / 86400);
  const clock = [Math.floor(seconds / 3600) % 24, Math.floor(seconds / 60) % 60, seconds % 60].map((value) => String(value).padStart(2, "0")).join(":");
  return `${days ? `${days}일 ` : ""}${clock} 남음`;
}
