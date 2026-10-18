import type { ServiceCategory } from "@/type/package";

export interface ConsumerDeal {
  id: number;
  businessId: number;
  serviceId: number | null;
  businessName: string;
  serviceName: string;
  category: ServiceCategory | null;
  description: string;
  imageUrl: string | null;
  address: string;
  originalPrice: number;
  price: number;
  remainingCapacity: number;
  endAt: string;
  slots: string[];
  durationMinutes?: number;
  startAt?: string;
  scheduleKind?: "rotation";
  rotationKey?: string;
  timeWindow?: string;
  discountRate?: number;
  /** Menu price and visit times used when the shop has no time deal running. */
  regularPrice?: number;
  regularSlots?: string[];
  cancellationPolicy?: string;
  kitId?: number;
  /** Package visits: one leg per shop, booked back to back in this order. */
  legs?: KitLeg[];
}

export interface KitLeg {
  businessId: number;
  businessName: string;
  address: string;
  serviceIds: number[];
  serviceNames: string[];
  /** Minutes the shop blocks for the visit (booking durations). */
  durationMinutes: number;
  /** Minutes shown to customers (sum of displayed treatment times). */
  displayMinutes: number;
  /** Sum of the leg's menu prices, used to split the package price per shop. */
  menuPrice: number;
  openingHours?: string;
  closedDays?: string;
  cancellationPolicy?: string;
}

export type BookingKind = "timedeal" | "regular" | "package";
