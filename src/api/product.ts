import type { Product, Review } from "@/type/product";
import { axiosInstance } from "./axiosInstance";

export async function requestProduct(productId: number) {
  try {
    const { data }: { data: Product } = await axiosInstance.get(`products/${productId}`);
    return data;
  } catch (err) {
    console.error(err);
  }
}

export async function requestProductReviews(productId: number) {
  try {
    const { data }: { data: Review[] } = await axiosInstance.get(`products/${productId}/reviews`);
    return data;
  } catch (err) {
    console.error(err);
  }
}

export async function requestAddToCart(productId: number) {
  try {
    const { status } = await axiosInstance.post("cart", { productId });
    return status;
  } catch (err) {
    console.error(err);
  }
}
