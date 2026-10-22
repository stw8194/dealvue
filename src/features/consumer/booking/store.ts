import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ConsumerDeal } from "@/features/consumer/types";
import type { Reservation, ReservationReview } from "@/type/reservation";
import { bookingOffer, type BookingOffer } from "../dealTiming";
import { useEngagementStore } from "../engagement/store";
import { commitLedger, registerLedgerCache, type LedgerState } from "../ledger";
import { canCompleteVisit, canManageReservation, cancellationTerm, findOverlap, formatReservationDate, parseCancellationPolicy, validateBooking, validateReview } from "./rules";
import { legTimes, splitPrice } from "./packageSchedule";

export const REVIEW_REWARD_POINTS = 100;

/** The price the customer saw and agreed to on the booking screen; it is paid at the shop. */
export interface AgreedQuote {
  kind: BookingOffer["kind"];
  price: number;
}

export class QuoteChangedError extends Error {
  readonly quote: AgreedQuote;
  constructor(quote: AgreedQuote) {
    super("예약 금액이 바뀌었어요. 바뀐 금액을 확인하고 다시 동의해 주세요.");
    this.quote = quote;
  }
}

interface CreateReservationInput {
  deal: ConsumerDeal;
  slot: string;
  agreed: boolean;
  agreedQuote: AgreedQuote;
  idempotencyKey: string;
  userId: string;
  staffName?: string;
}

interface BookingState {
  reservations: Reservation[];
  reviews: ReservationReview[];
  createReservation: (input: CreateReservationInput) => Promise<Reservation>;
  cancelReservation: (id: string, reason?: string) => Promise<void>;
  rescheduleReservation: (id: string, deal: ConsumerDeal, slot: string) => Promise<void>;
  completeVisit: (id: string) => Promise<void>;
  saveReview: (id: string, input: { rating: number; content: string }) => Promise<ReservationReview>;
  resetDemo: () => void;
}

export function quoteFor(offer: BookingOffer): AgreedQuote {
  return { kind: offer.kind, price: offer.price };
}

export function sameQuote(a: AgreedQuote, b: AgreedQuote) {
  return a.kind === b.kind && a.price === b.price;
}

/** Device-ledger bookings of one account; other accounts on the same device are not visible. */
export function ownReservations(reservations: Reservation[], userId: string | undefined) {
  return userId ? reservations.filter(reservation => reservation.userId === userId) : [];
}

function notify(title: string, body: string, link: string, kind: "activity" | "benefits" = "activity") {
  useEngagementStore.getState().notify(title, body, link, kind);
}

function groupOf(state: LedgerState, reservation: Reservation) {
  return reservation.groupId ? state.reservations.filter(item => item.groupId === reservation.groupId) : [reservation];
}

export const useBookingStore = create<BookingState>()(persist(set => ({
  reservations: [],
  reviews: [],
  // Nothing is paid when booking; the agreed price is paid at the shop.
  createReservation: async ({ deal, slot, agreed, agreedQuote, idempotencyKey, userId, staffName }) => {
    if (!userId) throw new Error("로그인 후 예약해 주세요.");
    if (!agreed) throw new Error("예약 내용과 취소 규정에 동의해 주세요.");
    if (!idempotencyKey.trim()) throw new Error("예약 요청을 다시 시작해 주세요.");
    const groupId = crypto.randomUUID();
    const created = await commitLedger(state => {
      const previous = state.reservations.find(reservation => reservation.requestKey === idempotencyKey && reservation.userId === userId);
      if (previous) return { next: state, result: previous };
      const now = Date.now();
      const offer = bookingOffer(deal, now);
      const legs = deal.legs?.length ? deal.legs : null;
      const mine = ownReservations(state.reservations, userId);
      const error = legs ? null : validateBooking(deal, slot, mine, now, undefined, offer.kind);
      if (error) throw new Error(error);
      if (legs && !(deal.regularSlots ?? []).includes(slot)) throw new Error("선택할 수 없는 일정입니다. 일정을 다시 확인해 주세요.");
      const quote = quoteFor(offer);
      if (!sameQuote(quote, agreedQuote)) throw new QuoteChangedError(quote);
      const timestamp = new Date(now).toISOString();
      const parts = legs ?? [null];
      const times = legs ? legTimes(Date.parse(slot), legs) : [{ start: Date.parse(slot), end: Date.parse(slot) + (deal.durationMinutes ?? 60) * 60_000 }];
      const prices = legs ? splitPrice(quote.price, legs) : [quote.price];
      const originals = legs ? splitPrice(offer.originalPrice, legs) : [offer.originalPrice];
      const reservations: Reservation[] = parts.map((leg, index) => {
        const overlap = findOverlap(mine, times[index].start, times[index].end);
        if (overlap) throw new Error(`같은 시간에 ${overlap.shopName} 예약이 있어요. 다른 시간을 선택해 주세요.`);
        return {
          id: `preview-${crypto.randomUUID()}`,
          userId,
          dealId: deal.id,
          businessId: leg?.businessId ?? deal.businessId,
          serviceId: leg?.serviceIds[0] ?? deal.serviceId!,
          productName: leg ? `${deal.serviceName} · ${leg.serviceNames.join(" + ")}` : deal.serviceName,
          shopName: leg?.businessName ?? deal.businessName,
          status: "confirmed",
          reservedAt: new Date(times[index].start).toISOString(),
          endAt: new Date(times[index].end).toISOString(),
          price: prices[index],
          originalPrice: originals[index],
          kind: offer.kind,
          paidAmount: prices[index],
          paymentStatus: "on_site",
          staffName: staffName || undefined,
          address: leg?.address ?? deal.address,
          imageUrl: deal.imageUrl,
          createdAt: timestamp,
          updatedAt: timestamp,
          isPreview: true,
          requestKey: index === 0 ? idempotencyKey : `${idempotencyKey}:${index}`,
          rotationKey: offer.kind === "timedeal" ? deal.rotationKey : undefined,
          policy: parseCancellationPolicy(leg?.cancellationPolicy ?? deal.cancellationPolicy),
          ...(legs ? { groupId, legIndex: index, legCount: legs.length } : {}),
        };
      });
      return { next: { ...state, reservations: [...reservations, ...state.reservations] }, result: reservations[0] };
    });
    notify("예약이 완료되었어요", `${deal.businessName} · ${deal.serviceName} · ${formatReservationDate(created.reservedAt)}`, `/reservation/${created.id}`);
    return created;
  },
  cancelReservation: async (id, reason = "소비자 취소") => {
    const cancelled = await commitLedger(state => {
      const reservation = state.reservations.find(item => item.id === id);
      if (!reservation || !reservation.isPreview) throw new Error("예약을 찾을 수 없습니다.");
      if (reservation.status === "cancelled") return { next: state, result: null };
      const group = groupOf(state, reservation);
      if (!group.every(item => canManageReservation(item) || item.status === "cancelled")) throw new Error("방문이 시작된 예약은 취소할 수 없습니다.");
      const now = Date.now(), first = group.find(item => item.legIndex === 0) ?? reservation;
      const term = cancellationTerm(first, now);
      const ids = new Set(group.map(item => item.id));
      const restoredPoints = group.reduce((sum, item) => sum + (item.pointsUsed ?? 0), 0);
      return {
        next: {
          ...state,
          reservations: state.reservations.map(item => ids.has(item.id) ? { ...item, status: "cancelled", paymentStatus: item.paymentStatus === "test" ? "test_cancelled" : item.paymentStatus, cancelTerm: term, cancellationReason: reason.trim().slice(0, 200), updatedAt: new Date(now).toISOString() } : item),
          coupons: state.coupons.map(coupon => coupon.usedReservationId && ids.has(coupon.usedReservationId) ? { ...coupon, usedReservationId: undefined } : coupon),
          pointHistory: restoredPoints ? [{ id: crypto.randomUUID(), reason: `예약 취소 환급 · ${reservation.shopName}`, amount: restoredPoints, createdAt: new Date(now).toISOString() }, ...state.pointHistory] : state.pointHistory,
        },
        result: { reservation, term },
      };
    });
    if (cancelled) notify("예약이 취소되었어요", `${cancelled.reservation.shopName} · ${cancelled.reservation.productName}`, `/reservation/${id}`);
  },
  rescheduleReservation: async (id, deal, slot) => {
    const moved = await commitLedger(state => {
      const reservation = state.reservations.find(item => item.id === id);
      if (!reservation || !reservation.isPreview) throw new Error("예약을 찾을 수 없습니다.");
      if (reservation.groupId) throw new Error("패키지 예약은 일정을 바꿀 수 없어요. 취소 후 다시 예약해 주세요.");
      if (!canManageReservation(reservation)) throw new Error("방문 전 예약만 변경할 수 있습니다.");
      if (reservation.dealId !== deal.id || reservation.businessId !== deal.businessId || reservation.serviceId !== deal.serviceId) throw new Error("같은 시술의 일정만 변경할 수 있습니다.");
      const error = validateBooking(deal, slot, ownReservations(state.reservations, reservation.userId), Date.now(), id, reservation.kind ?? "timedeal");
      if (error) throw new Error(error);
      const endAt = new Date(new Date(slot).getTime() + (deal.durationMinutes ?? 60) * 60_000).toISOString();
      return { next: { ...state, reservations: state.reservations.map(item => item.id === id ? { ...item, reservedAt: slot, endAt, updatedAt: new Date().toISOString() } : item) }, result: reservation };
    });
    notify("예약 일정이 변경되었어요", `${moved.shopName} · ${formatReservationDate(slot)}`, `/reservation/${id}`);
  },
  completeVisit: async id => {
    const done = await commitLedger(state => {
      const reservation = state.reservations.find(item => item.id === id);
      if (!reservation) throw new Error("예약을 찾을 수 없습니다.");
      if (!canCompleteVisit(reservation)) throw new Error("예약 시간이 끝난 뒤에 방문 완료로 바꿀 수 있어요.");
      const now = new Date().toISOString();
      return { next: { ...state, reservations: state.reservations.map(item => item.id === id ? { ...item, status: "done", completedAt: now, updatedAt: now } : item) }, result: reservation };
    });
    notify("방문은 어떠셨나요?", `${done.shopName} 리뷰를 남기면 ${REVIEW_REWARD_POINTS}P를 드려요.`, `/reservation/${id}/review`, "benefits");
  },
  saveReview: (id, input) => commitLedger(state => {
    const reservation = state.reservations.find(item => item.id === id);
    if (!reservation || !reservation.isPreview || reservation.status !== "done" || !reservation.completedAt) {
      throw new Error("이용 완료된 예약에만 리뷰를 작성할 수 있습니다.");
    }
    const error = validateReview(input.rating, input.content);
    if (error) throw new Error(error);
    const previous = state.reviews.find(review => review.reservationId === id);
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
    // The reward is granted once per booking, in the same transaction as the first review.
    const pointHistory = previous ? state.pointHistory : [{ id: crypto.randomUUID(), reason: `방문 리뷰 작성 · ${reservation.shopName}`, amount: REVIEW_REWARD_POINTS, createdAt: timestamp }, ...state.pointHistory];
    return { next: { ...state, reviews: [review, ...state.reviews.filter(item => item.reservationId !== id)], pointHistory }, result: review };
  }),
  resetDemo: () => set({ reservations: [], reviews: [] }),
}), {
  name: "dealvue-consumer-preview-bookings-v1",
  storage: createJSONStorage(() => localStorage),
  partialize: state => ({ reservations: state.reservations, reviews: state.reviews }),
}));

registerLedgerCache({
  read: () => ({ reservations: useBookingStore.getState().reservations, reviews: useBookingStore.getState().reviews }),
  write: ({ reservations, reviews }) => useBookingStore.setState({ ...(reservations ? { reservations } : {}), ...(reviews ? { reviews } : {}) }),
});
