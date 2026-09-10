export type WishlistTargetType = "shop" | "designer" | "product";

export interface WishlistItem {
  id: number;
  targetType: WishlistTargetType;
  targetId: number;
  name: string;
  thumbnail: string;
}
