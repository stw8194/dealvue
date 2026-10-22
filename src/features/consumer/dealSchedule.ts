import type { ConsumerDeal } from "./types";
import type { TimeDeal, TimeDealBusiness } from "@/type/home";

export const DEAL_ROTATION = {
  anchor: "2026-10-15T00:00:00+09:00",
  businessesPerRound: 5,
  durationHours: [1, 2, 3, 4],
} as const;

const HOUR = 3_600_000;
const anchor = Date.parse(DEAL_ROTATION.anchor);
const cycleHours = DEAL_ROTATION.durationHours.reduce<number>((sum, hours) => sum + hours, 0);

export function rotationRound(index: number) {
  const lengths = DEAL_ROTATION.durationHours;
  const cycle = Math.floor(index / lengths.length);
  const step = ((index % lengths.length) + lengths.length) % lengths.length;
  const start = anchor + (cycle * cycleHours + lengths.slice(0, step).reduce<number>((sum, hours) => sum + hours, 0)) * HOUR;
  return { index, start, end: start + lengths[step] * HOUR };
}

export function currentRotationRound(now: number) {
  const cycle = Math.floor((now - anchor) / (cycleHours * HOUR));
  let index = cycle * DEAL_ROTATION.durationHours.length;
  while (rotationRound(index).end <= now) index += 1;
  return rotationRound(index);
}

export function hasActiveSale(startAt: string | undefined, endAt: string | null | undefined, capacity: number, now: number) {
  const start = startAt ? Date.parse(startAt) : Number.NEGATIVE_INFINITY;
  const end = endAt ? Date.parse(endAt) : Number.NaN;
  return Number.isInteger(capacity) && capacity > 0 && start <= now && Number.isFinite(end) && now < end;
}

// Interleave categories before forming teams so every round includes a mix of shops.
// A fixed epoch and stable IDs make the same schedule survive reloads and navigation.
export function applyDealRotation(deals: ConsumerDeal[], now: number): ConsumerDeal[] {
  const businesses = new Map<number, ConsumerDeal>();
  for (const deal of deals) {
    if (deal.scheduleKind === "rotation" && deal.remainingCapacity > 0) businesses.set(deal.businessId, deal);
  }
  const categories = new Map<string, number[]>();
  for (const business of [...businesses.values()].sort((a, b) => a.businessId - b.businessId)) {
    const category = business.category ?? "other";
    const ids = categories.get(category) ?? [];
    ids.push(business.businessId);
    categories.set(category, ids);
  }
  const buckets = [...categories.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, ids]) => ids);
  const order: number[] = [];
  const maxLength = Math.max(0, ...buckets.map(bucket => bucket.length));
  for (let index = 0; index < maxLength; index += 1) {
    for (const bucket of buckets) if (bucket[index] !== undefined) order.push(bucket[index]);
  }
  if (!order.length) return deals;
  const teamCount = Math.ceil(order.length / DEAL_ROTATION.businessesPerRound);
  const current = currentRotationRound(now);
  const currentTeam = ((current.index % teamCount) + teamCount) % teamCount;
  const windows = new Map(order.map((id, index) => {
    const team = Math.floor(index / DEAL_ROTATION.businessesPerRound);
    const distance = (team - currentTeam + teamCount) % teamCount;
    return [id, rotationRound(current.index + distance)] as const;
  }));
  return deals.map(deal => {
    if (deal.scheduleKind !== "rotation") return deal;
    const window = windows.get(deal.businessId);
    if (!window) return { ...deal, startAt: "", endAt: "", rotationKey: undefined };
    return {
      ...deal,
      startAt: new Date(window.start).toISOString(),
      endAt: new Date(window.end).toISOString(),
      rotationKey: `${window.index}:${deal.businessId}`,
    };
  });
}

export function timeDealDiscount(deal: Pick<TimeDeal, "discountRate" | "originalPrice" | "price">) {
  return Number.isFinite(deal.discountRate) ? deal.discountRate : deal.originalPrice > 0 ? Math.round((1 - deal.price / deal.originalPrice) * 100) : 0;
}

/** Highest discount first; ties go to the lower price, the sooner deadline, then the lower ID. */
export function compareByDiscount(a: TimeDeal, b: TimeDeal) {
  return timeDealDiscount(b) - timeDealDiscount(a) || a.price - b.price
    || Date.parse(a.endAt ?? "") - Date.parse(b.endAt ?? "") || a.id - b.id;
}

/** The highest-discount running deal from each shop, ranked across shops. */
export function topDiscountDeals(deals: TimeDeal[], now: number, limit = 5): TimeDeal[] {
  const running = new Map<number, TimeDeal>();
  for (const deal of deals) {
    if (hasActiveSale(deal.startAt, deal.endAt, deal.remaining_capacity, now)) running.set(deal.id, deal);
  }
  const seenBusinesses = new Set<number>();
  return [...running.values()].sort(compareByDiscount).filter(deal => {
    if (seenBusinesses.has(deal.businessId)) return false;
    seenBusinesses.add(deal.businessId);
    return true;
  }).slice(0, limit);
}

export function groupActiveTimeDeals(deals: TimeDeal[], now: number): TimeDealBusiness[] {
  const groups = new Map<number, TimeDealBusiness>();
  for (const deal of deals) {
    if (!hasActiveSale(deal.startAt, deal.endAt, deal.remaining_capacity, now)) continue;
    let group = groups.get(deal.businessId);
    if (!group) {
      group = { businessId: deal.businessId, businessName: deal.businessName, category: deal.category, imageUrl: deal.imageUrl, deals: [], endAt: deal.endAt!, remainingCapacity: 0, discountLabel: "" };
      groups.set(deal.businessId, group);
    }
    if (group.deals.some(item => item.id === deal.id)) continue;
    group.deals.push(deal);
    group.remainingCapacity += deal.remaining_capacity;
    if (Date.parse(deal.endAt!) < Date.parse(group.endAt)) group.endAt = deal.endAt!;
  }
  for (const group of groups.values()) {
    const discounts = group.deals.map(timeDealDiscount);
    const min = Math.min(...discounts), max = Math.max(...discounts);
    group.discountLabel = min === max ? `${min}%` : `${min}~${max}%`;
  }
  return [...groups.values()].sort((a, b) => Date.parse(a.endAt) - Date.parse(b.endAt) || a.businessId - b.businessId);
}
