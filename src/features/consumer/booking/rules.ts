import type { ConsumerDeal } from "@/features/consumer/types";
import type { Reservation, ReservationStatus } from "@/type/reservation";

export const RESERVATION_STATUS_LABEL: Record<ReservationStatus, string> = {
  waiting: "예약 대기", confirmed: "예약 확정", cancelled: "예약 취소", done: "이용 완료", no_show: "미방문",
};

export function canManageReservation(reservation: Reservation, now = Date.now()) {
  return (reservation.status === "waiting" || reservation.status === "confirmed")
    && new Date(reservation.reservedAt).getTime() > now;
}

export function validateBooking(
  deal: ConsumerDeal,
  slot: string,
  reservations: Reservation[],
  now = Date.now(),
  excludeReservationId?: string,
): string | null {
  if (!deal.serviceId) return "시술 정보가 없어 예약할 수 없습니다.";
  if (!Number.isFinite(deal.price) || deal.price < 0) return "예약 금액을 확인할 수 없습니다.";
  const deadline = new Date(deal.endAt).getTime();
  if (!Number.isFinite(deadline) || deadline <= now) return "판매가 종료된 타임딜입니다.";
  if (!Number.isInteger(deal.remainingCapacity) || deal.remainingCapacity <= 0) return "품절된 타임딜입니다.";
  const slotTime = new Date(slot).getTime();
  if (!Number.isFinite(slotTime) || slotTime <= now) return "현재 시간 이후의 일정을 선택해 주세요.";
  if (!deal.slots.includes(slot)) return "선택할 수 없는 일정입니다. 일정을 다시 확인해 주세요.";
  const activeReservations = reservations.filter(reservation =>
    reservation.id !== excludeReservationId && reservation.status !== "cancelled",
  );
  if (activeReservations.some(reservation => reservation.dealId === deal.id && reservation.reservedAt === slot)) {
    return "같은 타임딜과 일정으로 이미 예약한 내역이 있습니다.";
  }
  if (activeReservations.filter(reservation => reservation.dealId === deal.id).length >= deal.remainingCapacity) {
    return "미리보기에서 예약 가능한 수량을 모두 사용했습니다.";
  }
  return null;
}

export function validateReview(rating: number, content: string): string | null {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return "평점을 1점부터 5점 사이에서 선택해 주세요.";
  if (content.trim().length < 10) return "리뷰를 10자 이상 작성해 주세요.";
  if (content.trim().length > 1000) return "리뷰는 1,000자까지 작성할 수 있습니다.";
  return null;
}

export function formatReservationDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "일정 정보 없음" : date.toLocaleString("ko-KR", {
    month: "long", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit",
  });
}
