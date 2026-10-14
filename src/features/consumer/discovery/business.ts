import { getSupabaseClient } from "@/api/supabase";
import type { ServiceCategory } from "@/type/package";
import { serviceMinutes } from "@/features/consumer/booking/serviceSelection";

export type BusinessSummary = Pick<ConsumerBusiness, "id" | "name" | "address" | "description">;

export async function readCategoryBusinesses(category: ServiceCategory): Promise<BusinessSummary[]> {
  const client = getSupabaseClient();
  const businesses: BusinessSummary[] = [];
  const pageSize = 1000;

  for (let page = 0; ; page += 1) {
    const { data, error } = await client.from("businesses")
      .select("id, name, address, description, business_category!inner(category)")
      .eq("business_category.category", category)
      .order("id", { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    businesses.push(...rows);
    if (rows.length < pageSize) return businesses;
  }
}

export interface ConsumerBusiness {
  id: number;
  name: string;
  address: string;
  number: string;
  description: string | null;
  services: { id: number; name: string; price: number; duration_minutes: number | null; description: string | null; exclusive_group?: string | null; menu_category_id?: number | null }[];
  staff: { id: number; name: string; position: string }[];
  categories?: ServiceCategory[];
  images?: string[];
}

export async function readConsumerBusiness(id: number): Promise<ConsumerBusiness | null> {
  const { data, error } = await getSupabaseClient().from("businesses")
    .select("id, name, address, number, description, services(*), staff(id, name, position), business_category(category), business_images(img_url)")
    .eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const client = getSupabaseClient();
  return {
    ...data,
    services: (data.services ?? []).map((service) => ({ ...service, duration_minutes: serviceMinutes(service as ConsumerBusiness["services"][number]) })),
    categories: (data.business_category ?? []).map((item) => item.category as ServiceCategory),
    images: (data.business_images ?? []).flatMap((item) => {
      const path = item.img_url?.trim();
      if (!path) return [];
      return /^https?:\/\//i.test(path) ? [path] : [client.storage
        .from(import.meta.env.VITE_SUPABASE_BUSINESS_IMAGES_BUCKET ?? "businesses")
        .getPublicUrl(path).data.publicUrl];
    }),
  } as ConsumerBusiness;
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
