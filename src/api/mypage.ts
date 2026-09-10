import type { User } from "@/type/auth";
import type { Coupon, PlaygroundCharacter, PointHistory, RecentViewedShop } from "@/type/mypage";
import type { Review } from "@/type/product";
import { axiosInstance } from "./axiosInstance";

export async function requestMyProfile() {
  try {
    const { data }: { data: User } = await axiosInstance.get("mypage/profile");
    return data;
  } catch (err) {
    console.error(err);
  }
}

export async function requestUpdateProfile(form: { nickname?: string; profileImage?: string; address?: string }) {
  try {
    const { status } = await axiosInstance.put("mypage/profile", form);
    return status;
  } catch (err) {
    console.error(err);
  }
}

export async function requestMyReviews() {
  try {
    const { data }: { data: Review[] } = await axiosInstance.get("mypage/reviews");
    return data;
  } catch (err) {
    console.error(err);
  }
}

export async function requestCoupons() {
  try {
    const { data }: { data: Coupon[] } = await axiosInstance.get("mypage/coupons");
    return data;
  } catch (err) {
    console.error(err);
  }
}

export async function requestPointHistory() {
  try {
    const { data }: { data: PointHistory[] } = await axiosInstance.get("mypage/points");
    return data;
  } catch (err) {
    console.error(err);
  }
}

export async function requestRecentViewedShops() {
  try {
    const { data }: { data: RecentViewedShop[] } = await axiosInstance.get("mypage/recent-viewed");
    return data;
  } catch (err) {
    console.error(err);
  }
}

export async function requestPlaygroundCharacters() {
  try {
    const { data }: { data: PlaygroundCharacter[] } = await axiosInstance.get("mypage/playground/characters");
    return data;
  } catch (err) {
    console.error(err);
  }
}
