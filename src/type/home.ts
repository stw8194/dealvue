import type { ServiceCategory } from "@/type/package";

export interface TimeDeal {
  id: number;
  businessId: number;
  businessName: string;
  category: ServiceCategory | null;
  serviceName: string;
  imageUrl: string | null;
  title: string;
  discountRate: number;
  originalPrice: number;
  price: number;
  capacity: number;
  remaining_capacity: number;
  endAt: string | null;
}

export interface PopularSearchKeyword {
  rank: number;
  keyword: string;
  type: "product" | "shop";
}

export interface IconCategory {
  id: string;
  label: string;
  icon: string;
  path: string;
}

export interface DealKitRecommend {
  id: number;
  title: string;
  thumbnail: string;
  discountRate: number;
}

export interface AdBanner {
  id: number;
  image: string;
  title: string;
  linkTo: string;
}
