import type { AdBanner, DealKitRecommend, IconCategory, PopularSearchKeyword, TimeDeal } from "@/type/home";
import type { ServiceCategory } from "@/type/package";
import { getSupabaseClient } from "@/api/supabase";
import { axiosInstance } from "./axiosInstance";

const BUSINESS_IMAGE_BUCKET =
  import.meta.env.VITE_SUPABASE_BUSINESS_IMAGES_BUCKET ?? "businesses";

type TimeDealRow = {
  id: number;
  business_id: number;
  service_id?: number | null;
  service_name?: string | null;
  title?: string | null;
  original_price?: number | null;
  price?: number | null;
  deal_price?: number | null;
  discount_rate?: number | null;
  capacity?: number | null;
  remaining_capacity?: number | null;
  end_at?: string | null;
};

type BusinessRow = {
  id: number;
  name: string;
  business_category?: { category: ServiceCategory }[] | { category: ServiceCategory } | null;
};

type BusinessImageRow = {
  business_id: number;
  img_url: string;
};

type ServiceRow = {
  id: number;
  name: string;
  price: number | null;
};

function getBusinessCategory(business?: BusinessRow) {
  const categoryRelation = business?.business_category;

  if (Array.isArray(categoryRelation)) {
    return categoryRelation[0]?.category ?? null;
  }

  return categoryRelation?.category ?? null;
}

function isWebUrl(url: string) {
  return /^(https?:|data:|blob:)/.test(url);
}

function getBusinessImagePublicUrl(imgUrl: string) {
  const trimmedUrl = imgUrl.trim();

  if (!trimmedUrl || isWebUrl(trimmedUrl)) {
    return trimmedUrl;
  }

  return getSupabaseClient()
    .storage
    .from(BUSINESS_IMAGE_BUCKET)
    .getPublicUrl(trimmedUrl)
    .data
    .publicUrl;
}

function getDiscountRate(originalPrice: number, price: number, discountRate?: number | null) {
  if (typeof discountRate === "number") return discountRate;
  if (!originalPrice || originalPrice <= price) return 0;

  return Math.round(((originalPrice - price) / originalPrice) * 100);
}

export async function requestTimeDeals(): Promise<TimeDeal[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("time_deals")
    .select("*")
    .order("end_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const dealRows = (data ?? []) as TimeDealRow[];
  const businessIds = [...new Set(dealRows.map((deal) => deal.business_id).filter(Boolean))];
  const serviceIds = [
    ...new Set(
      dealRows
        .map((deal) => deal.service_id)
        .filter((serviceId): serviceId is number => typeof serviceId === "number"),
    ),
  ];

  const [{ data: businessData, error: businessError }, { data: imageData, error: imageError }, { data: serviceData, error: serviceError }] =
    await Promise.all([
      businessIds.length > 0
        ? client
            .from("businesses")
            .select("id, name, business_category(category)")
            .in("id", businessIds)
        : Promise.resolve({ data: [], error: null }),
      businessIds.length > 0
        ? client
            .from("business_images")
            .select("business_id, img_url")
            .in("business_id", businessIds)
            .order("created_at", { ascending: true })
        : Promise.resolve({ data: [], error: null }),
      serviceIds.length > 0
        ? client.from("services").select("id, name, price").in("id", serviceIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

  if (businessError) throw new Error(businessError.message);
  if (imageError) throw new Error(imageError.message);
  if (serviceError) throw new Error(serviceError.message);

  const businessesById = ((businessData ?? []) as BusinessRow[]).reduce<Record<number, BusinessRow>>(
    (businesses, business) => {
      businesses[business.id] = business;
      return businesses;
    },
    {},
  );
  const servicesById = ((serviceData ?? []) as ServiceRow[]).reduce<Record<number, ServiceRow>>(
    (services, service) => {
      services[service.id] = service;
      return services;
    },
    {},
  );
  const imagesByBusinessId = ((imageData ?? []) as BusinessImageRow[]).reduce<Record<number, string>>(
    (images, image) => {
      images[image.business_id] ??= getBusinessImagePublicUrl(image.img_url);
      return images;
    },
    {},
  );

  return dealRows.map((deal) => {
    const service = deal.service_id ? servicesById[deal.service_id] : undefined;
    const price = deal.deal_price ?? deal.price ?? service?.price ?? 0;
    const originalPrice = deal.original_price ?? service?.price ?? price;
    const serviceName = deal.service_name ?? service?.name ?? "타임딜 서비스";
    const business = businessesById[deal.business_id];
    const businessName = business?.name ?? "딜뷰 제휴점";

    return {
      id: deal.id,
      businessId: deal.business_id,
      businessName,
      category: getBusinessCategory(business),
      serviceName,
      imageUrl: imagesByBusinessId[deal.business_id] ?? null,
      title: deal.title ?? serviceName,
      discountRate: getDiscountRate(originalPrice, price, deal.discount_rate),
      originalPrice,
      price,
      capacity: deal.capacity ?? 0,
      remaining_capacity: deal.remaining_capacity ?? 0,
      endAt: deal.end_at ?? null,
    };
  });
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
