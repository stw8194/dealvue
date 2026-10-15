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
}
