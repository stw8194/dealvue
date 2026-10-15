import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ConsumerDeal } from "@/features/consumer/types";
import type { Reservation, ReservationReview } from "@/type/reservation";
import { canManageReservation, validateBooking, validateReview } from "./rules";

interface CreateReservationInput {
  deal: ConsumerDeal;
  slot: string;
  agreed: boolean;
  idempotencyKey: string;
}

interface BookingState {
  reservations: Reservation[];
  reviews: ReservationReview[];
  createReservation: (input: CreateReservationInput) => Reservation;
  cancelReservation: (id: string, reason?: string) => void;
  rescheduleReservation: (id: string, deal: ConsumerDeal, slot: string) => void;
  saveReview: (id: string, input: { rating: number; content: string }) => ReservationReview;
  resetDemo: () => void;
}

export const useBookingStore = create<BookingState>()(persist((set, get) => ({
  reservations: [],
  reviews: [],
  createReservation: ({ deal, slot, agreed, idempotencyKey }) => {
    if (!agreed) throw new Error("예약 안내에 동의해 주세요.");
    if (!idempotencyKey.trim()) throw new Error("예약 요청을 다시 시작해 주세요.");
    const previous = get().reservations.find(reservation => reservation.requestKey === idempotencyKey);
    if (previous) return previous;
    const error = validateBooking(deal, slot, get().reservations);
    if (error) throw new Error(error);
    const timestamp = new Date().toISOString();
    const reservation: Reservation = {
      id: `preview-${crypto.randomUUID()}`,
      dealId: deal.id,
      businessId: deal.businessId,
      serviceId: deal.serviceId!,
      productName: deal.serviceName,
      shopName: deal.businessName,
      status: "waiting",
      reservedAt: slot,
      endAt: new Date(new Date(slot).getTime() + (deal.durationMinutes ?? 60) * 60 * 1000).toISOString(),
      price: deal.price,
      paymentStatus: "test",
      createdAt: timestamp,
      updatedAt: timestamp,
      isPreview: true,
      requestKey: idempotencyKey,
      rotationKey: deal.rotationKey,
    };
    set(state => ({ reservations: [reservation, ...state.reservations] }));
    return reservation;
  },
  cancelReservation: (id, reason = "소비자 취소") => {
    const reservation = get().reservations.find(item => item.id === id);
    if (!reservation || !reservation.isPreview) throw new Error("예약을 찾을 수 없습니다.");
    if (reservation.status === "cancelled") return;
    if (!canManageReservation(reservation)) throw new Error("시작 전 예약 대기·확정 상태에서만 취소할 수 있습니다.");
    set(state => ({ reservations: state.reservations.map(item => item.id === id ? {
      ...item, status: "cancelled", paymentStatus: "test_cancelled", cancellationReason: reason.trim().slice(0, 200), updatedAt: new Date().toISOString(),
    } : item) }));
  },
  rescheduleReservation: (id, deal, slot) => {
    const reservation = get().reservations.find(item => item.id === id);
    if (!reservation || !reservation.isPreview) throw new Error("예약을 찾을 수 없습니다.");
    if (!canManageReservation(reservation)) throw new Error("시작 전 예약 대기·확정 상태에서만 변경할 수 있습니다.");
    if (reservation.dealId !== deal.id || reservation.businessId !== deal.businessId || reservation.serviceId !== deal.serviceId) {
      throw new Error("기존 예약과 같은 타임딜의 일정만 변경할 수 있습니다.");
    }
    const error = validateBooking(deal, slot, get().reservations, Date.now(), id);
    if (error) throw new Error(error);
    set(state => ({ reservations: state.reservations.map(item => item.id === id ? {
      ...item, reservedAt: slot, endAt: new Date(new Date(slot).getTime() + (deal.durationMinutes ?? 60) * 60 * 1000).toISOString(), updatedAt: new Date().toISOString(),
    } : item) }));
  },
  saveReview: (id, input) => {
    const reservation = get().reservations.find(item => item.id === id);
    if (!reservation || !reservation.isPreview || reservation.status !== "done") {
      throw new Error("이용 완료된 예약에만 리뷰를 작성할 수 있습니다.");
    }
    const error = validateReview(input.rating, input.content);
    if (error) throw new Error(error);
    const previous = get().reviews.find(review => review.reservationId === id);
    const timestamp = new Date().toISOString();
    const review: ReservationReview = {
      id: previous?.id ?? `preview-review-${crypto.randomUUID()}`,
      reservationId: id,
      businessId: reservation.businessId,
      serviceId: reservation.serviceId,
      productName: reservation.productName,
      shopName: reservation.shopName,
      rating: input.rating,
      content: input.content.trim(),
      createdAt: previous?.createdAt ?? timestamp,
      updatedAt: timestamp,
    };
    set(state => ({ reviews: [review, ...state.reviews.filter(item => item.reservationId !== id)] }));
    return review;
  },
  resetDemo: () => {
    set({ reservations: [], reviews: [] });
  },
}), {
  name: "dealvue-consumer-preview-bookings-v1",
  storage: createJSONStorage(() => localStorage),
  partialize: state => ({ reservations: state.reservations, reviews: state.reviews }),
}));
