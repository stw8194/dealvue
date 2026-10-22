import type { BookingKind, ConsumerDeal } from "@/features/consumer/types";
import type { Reservation, ReservationStatus } from "@/type/reservation";
import { hasActiveSale } from "../dealSchedule";
import { bookingOffer } from "../dealTiming";

export const RESERVATION_STATUS_LABEL: Record<ReservationStatus, string> = {
  waiting: "예약 대기", confirmed: "예약 확정", cancelled: "예약 취소", done: "이용 완료", no_show: "미방문",
};

/**
 * Bookings made on this device never reach the shop, so they are "예약 완료" (submitted),
 * never "예약 확정", which is reserved for shop-confirmed bookings.
 */
export function reservationStatusLabel(reservation: Reservation, now = Date.now()) {
  if (!reservation.isPreview) return RESERVATION_STATUS_LABEL[reservation.status];
  if (reservation.status === "cancelled") return "예약 취소";
  if (reservation.status === "done") return "이용 완료";
  if (Date.parse(reservation.endAt) <= now) return "방문 확인 전";
  return "예약 완료";
}

/** Upcoming bookings; past ones move to the usage tab even before a visit is confirmed. */
export function isUpcoming(reservation: Reservation, now = Date.now()) {
  return (reservation.status === "waiting" || reservation.status === "confirmed") && Date.parse(reservation.endAt) > now;
}

export function isAwaitingVisitCheck(reservation: Reservation, now = Date.now()) {
  return (reservation.status === "waiting" || reservation.status === "confirmed") && Date.parse(reservation.endAt) <= now;
}

export function canManageReservation(reservation: Reservation, now = Date.now()) {
  return (reservation.status === "waiting" || reservation.status === "confirmed")
    && new Date(reservation.reservedAt).getTime() > now;
}

/** A visit can only be marked finished once its booked time has ended. */
export function canCompleteVisit(reservation: Reservation, now = Date.now()) {
  return reservation.isPreview && (reservation.status === "waiting" || reservation.status === "confirmed") && Date.parse(reservation.endAt) <= now;
}

/** Reads the free-cancellation window ("예약 3시간 전까지 무료 취소") from a shop's policy text. */
export function parseCancellationPolicy(text: string | undefined): { text: string; freeCancelHours: number | null } {
  const value = text?.trim() || "방문 시작 전까지 예약을 취소할 수 있습니다.";
  const hours = value.match(/(\d+)\s*시간\s*전까지\s*무료\s*취소/);
  return { text: value, freeCancelHours: hours ? Number(hours[1]) : null };
}

/**
 * Only the free window is unambiguous in the supplied policies. What happens after it
 * (deposit kept, same-day rules, or nothing stated) is a business decision still open,
 * so late cancellations are flagged for review instead of computing a refund.
 */
export function cancellationTerm(reservation: Reservation, now = Date.now()): "free" | "needs_review" {
  const hours = reservation.policy?.freeCancelHours;
  if (hours === null || hours === undefined) return "needs_review";
  return now <= Date.parse(reservation.reservedAt) - hours * 3_600_000 ? "free" : "needs_review";
}

export function freeCancelDeadline(reservation: Reservation) {
  const hours = reservation.policy?.freeCancelHours;
  return hours === null || hours === undefined ? null : new Date(Date.parse(reservation.reservedAt) - hours * 3_600_000).toISOString();
}

/** Slots a booking of this kind may use; regular and package bookings follow opening hours. */
export function slotsFor(deal: ConsumerDeal, kind: BookingKind) {
  return kind === "timedeal" ? deal.slots : deal.regularSlots?.length ? deal.regularSlots : deal.slots;
}

/** Another active booking of the customer that overlaps [start, end). */
export function findOverlap(reservations: Reservation[], start: number, end: number, excludeIds: string[] = []) {
  return reservations.find(reservation => !excludeIds.includes(reservation.id) && (reservation.status === "waiting" || reservation.status === "confirmed")
    && Date.parse(reservation.reservedAt) < end && start < Date.parse(reservation.endAt));
}

export function validateBooking(
  deal: ConsumerDeal,
  slot: string,
  reservations: Reservation[],
  now = Date.now(),
  excludeReservationId?: string,
  kind: BookingKind = bookingOffer(deal, now).kind,
): string | null {
  if (!deal.serviceId) return "시술 정보가 없어 예약할 수 없습니다.";
  if (!Number.isFinite(deal.price) || deal.price < 0) return "예약 금액을 확인할 수 없습니다.";
  const timeDeal = kind === "timedeal";
  if (timeDeal && !excludeReservationId && (!Number.isInteger(deal.remainingCapacity) || deal.remainingCapacity <= 0)) return "품절된 타임딜입니다.";
  if (timeDeal && !excludeReservationId && !hasActiveSale(deal.startAt, deal.endAt, deal.remainingCapacity, now)) return "타임딜이 마감되었습니다. 정상가로 다시 예약해 주세요.";
  const slotTime = new Date(slot).getTime();
  if (!Number.isFinite(slotTime) || slotTime <= now) return "현재 시간 이후의 일정을 선택해 주세요.";
  if (!slotsFor(deal, kind).includes(slot)) return "선택할 수 없는 일정입니다. 일정을 다시 확인해 주세요.";
  const activeReservations = reservations.filter(reservation => reservation.id !== excludeReservationId && reservation.status !== "cancelled");
  if (activeReservations.some(reservation => reservation.dealId === deal.id && reservation.reservedAt === slot)) {
    return "같은 시술과 일정으로 이미 예약한 내역이 있습니다.";
  }
  const overlapping = findOverlap(activeReservations, slotTime, slotTime + (deal.durationMinutes ?? 60) * 60_000);
  if (overlapping) return `같은 시간에 ${overlapping.shopName} 예약이 있어요. 다른 시간을 선택해 주세요.`;
  const sameRound = activeReservations.filter(reservation => (reservation.kind ?? "timedeal") === "timedeal" && reservation.dealId === deal.id && (!deal.rotationKey || reservation.rotationKey === deal.rotationKey));
  if (timeDeal && !excludeReservationId && sameRound.length >= deal.remainingCapacity) {
    return "타임딜 수량이 모두 소진되었습니다. 정상가로 예약할 수 있어요.";
  }
  return null;
}

export function validateReview(rating: number, content: string): string | null {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return "평점을 1점부터 5점 사이에서 선택해 주세요.";
  if (content.trim().length < 10) return "리뷰를 10자 이상 작성해 주세요.";
  if (content.trim().length > 1000) return "리뷰는 1,000자까지 작성할 수 있습니다.";
  return null;
}

export function paymentStatusLabel(reservation: Reservation) {
  const paid = (reservation.paidAmount ?? reservation.price).toLocaleString();
  switch (reservation.paymentStatus) {
    case "paid": return `결제 완료 · ${paid}원`;
    case "refunded": return `결제 취소 · ${paid}원 환불`;
    case "on_site": return `방문 시 매장 결제 · ${paid}원`;
    case "test": return `예약 금액 · ${paid}원`;
    case "test_cancelled": return "예약 취소";
    default: return "결제 정보 없음";
  }
}

const KST = "Asia/Seoul";
/** Calendar day of a slot in Korea time, used to group time choices by date. */
export function slotDay(value: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: KST, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}
export function formatSlotDay(value: string) {
  return new Date(value).toLocaleDateString("ko-KR", { timeZone: KST, month: "long", day: "numeric", weekday: "short" });
}
export function formatSlotTime(value: string) {
  return new Date(value).toLocaleTimeString("ko-KR", { timeZone: KST, hour: "2-digit", minute: "2-digit" });
}

export function formatReservationDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "일정 정보 없음" : date.toLocaleString("ko-KR", {
    timeZone: KST, month: "long", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit",
  });
}
