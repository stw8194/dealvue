import type { WishlistItem } from "@/type/wishlist";
import { axiosInstance } from "./axiosInstance";

export async function requestWishlist() {
  try {
    const { data }: { data: WishlistItem[] } = await axiosInstance.get("wishlist");
    return data;
  } catch (err) {
    console.error(err);
  }
}

export async function requestRemoveWishlistItem(wishlistItemId: number) {
  try {
    const { status } = await axiosInstance.delete(`wishlist/${wishlistItemId}`);
    return status;
  } catch (err) {
    console.error(err);
  }
}
