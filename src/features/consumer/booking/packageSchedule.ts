import type { KitLeg } from "../types";

/**
 * Minutes allowed to move between two shops of a shop+shop package. The travel rule is an
 * open policy decision; this provisional value is shown to customers wherever it applies.
 */
export const PROVISIONAL_TRAVEL_MINUTES = 30;

const KST_OFFSET = 9 * 3_600_000;
const DAY = 86_400_000;

function kstParts(time: number) {
  const shifted = new Date(time + KST_OFFSET);
  return { minute: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(), weekday: "일월화수목금토"[shifted.getUTCDay()], week: Math.ceil(shifted.getUTCDate() / 7), day: Math.floor((time + KST_OFFSET) / DAY) };
}

export function isClosedDay(time: number, closedDays = "") {
  const { weekday, week } = kstParts(time);
  if (closedDays.includes("매주") && closedDays.includes(`${weekday}요일`)) return true;
  return closedDays.includes("둘째") && closedDays.includes("넷째") && closedDays.includes(`${weekday}요일`) && (week === 2 || week === 4);
}

/** True when [start, start + minutes) lies inside one day's opening hours ("10:00~21:00"). */
export function fitsOpeningHours(start: number, minutes: number, openingHours = "10:00~20:00", closedDays = "") {
  const match = openingHours.match(/(\d{1,2}):(\d{2})\s*[~\-–]\s*(\d{1,2}):(\d{2})/);
  const open = match ? Number(match[1]) * 60 + Number(match[2]) : 600;
  const close = match ? Number(match[3]) * 60 + Number(match[4]) : 1200;
  const begin = kstParts(start), end = kstParts(start + minutes * 60_000 - 1);
  return !isClosedDay(start, closedDays) && begin.day === end.day && begin.minute >= open && begin.minute + minutes <= close;
}

/** Start and end of every leg when the first leg starts at `start`; legs run back to back. */
export function legTimes(start: number, legs: KitLeg[]) {
  const times: { start: number; end: number }[] = [];
  let cursor = start;
  legs.forEach((leg, index) => {
    if (index > 0 && leg.businessId !== legs[index - 1].businessId) cursor += PROVISIONAL_TRAVEL_MINUTES * 60_000;
    times.push({ start: cursor, end: cursor + leg.durationMinutes * 60_000 });
    cursor += leg.durationMinutes * 60_000;
  });
  return times;
}

/** Candidate first-leg starts (30-minute steps, next 14 days) where every shop is open for its leg. */
export function packageSlots(legs: KitLeg[], now = Date.now()) {
  const slots: string[] = [];
  if (!legs.length) return slots;
  const firstDay = Math.floor((now + KST_OFFSET) / DAY) * DAY - KST_OFFSET;
  for (let time = firstDay; time < firstDay + 14 * DAY; time += 30 * 60_000) {
    if (time <= now) continue;
    const times = legTimes(time, legs);
    if (legs.every((leg, index) => fitsOpeningHours(times[index].start, leg.durationMinutes, leg.openingHours, leg.closedDays))) slots.push(new Date(time).toISOString());
  }
  return slots;
}

/** Splits the package price across shops in proportion to their menu prices. */
export function splitPrice(total: number, legs: KitLeg[]) {
  const menuTotal = legs.reduce((sum, leg) => sum + leg.menuPrice, 0) || legs.length;
  const shares = legs.map(leg => Math.floor(total * (leg.menuPrice || 1) / menuTotal));
  shares[shares.length - 1] += total - shares.reduce((sum, share) => sum + share, 0);
  return shares;
}
