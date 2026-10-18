import { useEffect, useState } from "react";
import type { BookingKind, ConsumerDeal } from "./types";
import { hasActiveSale } from "./dealSchedule";

export function useDealTime() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  return now;
}

export function isOpenDeal(deal: ConsumerDeal, now: number) {
  return hasActiveSale(deal.startAt, deal.endAt, deal.remainingCapacity, now);
}

export type BookingOffer = { kind: BookingKind; price: number; originalPrice: number; discount: number; slots: string[] };

// A running time deal books at the deal price; otherwise the same service books at the menu price.
export function bookingOffer(deal: ConsumerDeal, now: number): BookingOffer {
  if (deal.kitId) return { kind: "package", price: deal.price, originalPrice: deal.originalPrice, discount: Math.max(0, deal.originalPrice - deal.price), slots: deal.regularSlots ?? deal.slots };
  if (isOpenDeal(deal, now)) return { kind: "timedeal", price: deal.price, originalPrice: deal.originalPrice, discount: Math.max(0, deal.originalPrice - deal.price), slots: deal.slots };
  const price = deal.regularPrice ?? deal.originalPrice;
  return { kind: "regular", price, originalPrice: price, discount: 0, slots: deal.regularSlots?.length ? deal.regularSlots : deal.slots };
}

export function remainingLabel(endAt: string, now: number) {
  if (!endAt) return "방문 일정 선택";
  const seconds = Math.max(0, Math.floor((Date.parse(endAt) - now) / 1000));
  if (!Number.isFinite(seconds) || seconds === 0) return "마감";
  const days = Math.floor(seconds / 86400);
  const clock = [Math.floor(seconds / 3600) % 24, Math.floor(seconds / 60) % 60, seconds % 60].map((value) => String(value).padStart(2, "0")).join(":");
  return `${days ? `${days}일 ` : ""}${clock} 남음`;
}
