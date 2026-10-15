import type { AdBanner, DealKitRecommend, IconCategory, PopularSearchKeyword, TimeDeal } from "@/type/home";
import { requestConsumerCatalog } from "@/features/consumer/catalogData";
import { axiosInstance } from "./axiosInstance";

export async function requestTimeDeals(): Promise<TimeDeal[]> {
  const deals = await requestConsumerCatalog();
  return toHomeTimeDeals(deals);
}

export function toHomeTimeDeals(deals: import("@/features/consumer/types").ConsumerDeal[]): TimeDeal[] {
  return deals.map(deal => ({
    id: deal.id, businessId: deal.businessId, businessName: deal.businessName,
    category: deal.category, serviceName: deal.serviceName, imageUrl: deal.imageUrl,
    title: deal.serviceName, originalPrice: deal.originalPrice, price: deal.price,
    discountRate: deal.discountRate ?? (deal.originalPrice > 0 ? Math.round((1 - deal.price / deal.originalPrice) * 100) : 0),
    capacity: deal.remainingCapacity, remaining_capacity: deal.remainingCapacity,
    endAt: deal.endAt || null,
    startAt: deal.startAt,
  }));
}

export async function requestPopularSearchKeywords() {
  try {
    const { data }: { data: PopularSearchKeyword[] } = await axiosInstance.get("home/popular-keywords");
    return data;
  } catch (err) {
    console.error(err);
  }
}

export async function requestIconCategories() {
  try {
    const { data }: { data: IconCategory[] } = await axiosInstance.get("home/categories");
    return data;
  } catch (err) {
    console.error(err);
  }
}

export async function requestDealKitRecommends() {
  try {
    const { data }: { data: DealKitRecommend[] } = await axiosInstance.get("home/deal-kits");
    return data;
  } catch (err) {
    console.error(err);
  }
}

export async function requestAdBanners() {
  try {
    const { data }: { data: AdBanner[] } = await axiosInstance.get("home/ad-banners");
    return data;
  } catch (err) {
    console.error(err);
  }
}
