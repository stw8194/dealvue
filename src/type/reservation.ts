/** Mirrors public.reservation_status_enum. Payment state is separate. */
export type ReservationStatus = "waiting" | "confirmed" | "cancelled" | "done" | "no_show";

/** "on_site": nothing is paid when booking; the customer pays at the shop. */
export type ReservationPaymentStatus = "on_site" | "test" | "test_cancelled" | "unavailable" | "paid" | "refunded";

export type PaymentMethod = "card" | "kakaopay" | "naverpay" | "tosspay";

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  card: "신용·체크카드", kakaopay: "카카오페이", naverpay: "네이버페이", tosspay: "토스페이",
};

export interface Reservation {
  rotationKey?: string;
  id: string;
  /** Account that made a device-ledger booking; bookings are only shown to that account. */
  userId?: string;
  dealId: number | null;
  businessId: number;
  serviceId: number;
  productName: string;
  shopName: string;
  status: ReservationStatus;
  reservedAt: string;
  endAt: string;
  price: number;
  paymentStatus: ReservationPaymentStatus;
  createdAt: string;
  updatedAt: string;
  isPreview: boolean;
  requestKey?: string;
  cancellationReason?: string;
  kind?: "timedeal" | "regular" | "package";
  /** Price before the time-deal discount. */
  originalPrice?: number;
  couponId?: string;
  couponDiscount?: number;
  pointsUsed?: number;
  /** Amount actually charged: price minus coupon and points. */
  paidAmount?: number;
  paymentMethod?: PaymentMethod;
  staffName?: string;
  address?: string;
  imageUrl?: string | null;
  /** Package visits share a group; each leg is a booking at one shop. */
  groupId?: string;
  legIndex?: number;
  legCount?: number;
  /** Cancellation terms shown and agreed at booking time. */
  policy?: { text: string; freeCancelHours: number | null };
  /** Whether the cancellation fell inside the free-cancellation window. */
  cancelTerm?: "free" | "needs_review";
  /** Set when the visit was marked finished; reviews require it. */
  completedAt?: string;
}

export interface ReservationReview {
  id: string;
  reservationId: string;
  businessId: number;
  serviceId: number;
  productName: string;
  shopName: string;
  rating: number;
  content: string;
  createdAt: string;
  updatedAt: string;
}
