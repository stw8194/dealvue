export interface Coupon {
  id: number;
  title: string;
  discountRate: number;
  expiresAt: string;
  used: boolean;
}

export interface PointHistory {
  id: number;
  amount: number;
  reason: string;
  createdAt: string;
}

export interface RecentViewedShop {
  id: number;
  name: string;
  thumbnail: string;
  viewedAt: string;
}

export interface PlaygroundCharacter {
  id: number;
  name: string;
  level: number;
  imageUrl: string;
}
