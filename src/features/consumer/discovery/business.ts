import { getSupabaseClient } from "@/api/supabase";
import type { ServiceCategory } from "@/type/package";
import { serviceMinutes } from "@/features/consumer/booking/serviceSelection";
import { resolveBusinessImage } from "../businessImages";
import { businessAddress } from "../businessAddress";

export type BusinessSummary = Pick<ConsumerBusiness, "id" | "name" | "address" | "description"> & { business_images?: { img_url: string }[] };

export async function readCategoryBusinesses(category?: ServiceCategory): Promise<BusinessSummary[]> {
  const client = getSupabaseClient();
  const businesses: BusinessSummary[] = [];
  const pageSize = 1000;

  for (let page = 0; ; page += 1) {
    let query = client.from("businesses")
      .select("id, name, address, description, business_images(img_url), business_category!inner(category)")
      .like("source_key", "provided:%")
      .order("id", { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1);
    if (category) query = query.eq("business_category.category", category);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    businesses.push(...rows.map(row => ({ ...row, address: businessAddress(row.address) })));
    if (rows.length < pageSize) return businesses;
  }
}

export interface SuppliedBusinessDetails {
  is_sample: boolean;
  opening_hours: string;
  closed_days: string;
  hashtags: string;
  amenities: string;
  parking: string;
  average_rating: number;
  review_count: number;
  favorite_count: number;
  deposit: string;
  cancellation_policy: string;
  location_is_approximate: boolean;
  review_images: string[];
  review_samples: { id: string; service_name: string; rating: number; content: string }[];
  deal_templates?: { service_name: string; start_time: string; end_time: string; original_price: number; deal_price: number; discount_rate: number; capacity: number; status: string }[];
}

export interface ConsumerBusiness {
  id: number;
  name: string;
  address: string;
  number: string;
  description: string | null;
  services: { id: number; name: string; price: number; duration_minutes: number | null; description: string | null; exclusive_group?: string | null; menu_category_id?: number | null; display_duration_minutes?: number | null; source_details?: { hashtags?: string; additional_charge?: string; regular_discount_price?: number } | null }[];
  staff: { id: number; name: string; position: string }[];
  categories?: ServiceCategory[];
  images?: string[];
  source_details?: SuppliedBusinessDetails | null;
}

export async function readConsumerBusiness(id: number): Promise<ConsumerBusiness | null> {
  const { data, error } = await getSupabaseClient().from("businesses")
    .select("*, services(*), staff(id, name, position), business_category(category), business_images(img_url)")
    .eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as unknown as ConsumerBusiness & {
    business_category: { category: ServiceCategory }[] | null;
    business_images: { img_url: string | null }[] | null;
  };
  const categories = (row.business_category ?? []).map((item) => item.category);
  return {
    ...row,
    address: businessAddress(row.address),
    services: (row.services ?? []).map((service) => ({ ...service, duration_minutes: service.display_duration_minutes ?? serviceMinutes(service) })),
    staff: row.staff ?? [],
    categories,
    images: (row.business_images ?? []).flatMap((item) => {
      const url = resolveBusinessImage(item.img_url);
      return url ? [url] : [];
    }),
  } as ConsumerBusiness;
}

export async function readBusinessStaff(businessId: number): Promise<ConsumerBusiness["staff"]> {
  const { data, error } = await getSupabaseClient().from("staff").select("id, name, position").eq("business_id", businessId).order("id");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export type BusinessReview = { id: number | string; rating: number; content: string; created_at: string };

export async function readBusinessReviews(businessId: number): Promise<BusinessReview[] | null> {
  const reviews: BusinessReview[] = [];
  for (let page = 0; ; page += 1) {
    const { data, error } = await getSupabaseClient().from("consumer_reviews")
      .select("id, rating, content, created_at").eq("business_id", businessId)
      .order("created_at", { ascending: false }).order("id", { ascending: false })
      .range(page * 1000, page * 1000 + 999);
    if (error?.code === "PGRST205" || error?.code === "42P01") return null;
    if (error) throw new Error(error.message);
    reviews.push(...(data ?? []));
    if (!data || data.length < 1000) return reviews;
  }
}
