/** Mirrors public.reservation_status_enum. Payment state is separate. */
export type ReservationStatus = "waiting" | "confirmed" | "cancelled" | "done" | "no_show";

export type ReservationPaymentStatus = "test" | "test_cancelled" | "unavailable";

export interface Reservation {
  id: string;
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
