export type ReservationStatus = "completed" | "used" | "cancelling" | "refunded";

export interface Reservation {
  id: number;
  productId: number;
  productName: string;
  shopName: string;
  status: ReservationStatus;
  reservedAt: string;
  price: number;
}
