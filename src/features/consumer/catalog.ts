import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/api/supabase";
import { SERVICE_CATEGORIES } from "@/data/packageOptions";
import type { ServiceCategory } from "@/type/package";
import { usePreviewStore } from "./preview";
import { PREVIEW_DEALS } from "./fixtures";
import type { ConsumerDeal } from "./types";

type DealRow = { id: number; business_id: number; service_id: number | null; original_price: number; deal_price: number; remaining_capacity: number; end_at: string };
type BusinessRow = { id: number; name: string; address: string; description: string | null; business_category: { category: string }[] | { category: string } | null };
type ServiceRow = { id: number; name: string; description: string | null };

function categoryOf(business: BusinessRow | undefined): ServiceCategory | null {
  const relation = business?.business_category;
  const value = Array.isArray(relation) ? relation[0]?.category : relation?.category;
  return SERVICE_CATEGORIES.find((category) => category.id === value)?.id ?? null;
}

export async function requestConsumerCatalog(): Promise<ConsumerDeal[]> {
  const client = getSupabaseClient();
  const { data, error } = await client.from("time_deals").select("id,business_id,service_id,original_price,deal_price,remaining_capacity,end_at").order("end_at");
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as DealRow[];
  if (!rows.length) return [];
  const businessIds = [...new Set(rows.map((row) => row.business_id))];
  const serviceIds = [...new Set(rows.flatMap((row) => row.service_id === null ? [] : [row.service_id]))];
  const [businesses, services, images] = await Promise.all([
    client.from("businesses").select("id,name,address,description,business_category(category)").in("id", businessIds),
    serviceIds.length ? client.from("services").select("id,name,description").in("id", serviceIds) : Promise.resolve({ data: [], error: null }),
    client.from("business_images").select("business_id,img_url").in("business_id", businessIds).order("created_at"),
  ]);
  if (businesses.error) throw new Error(businesses.error.message);
  if (services.error) throw new Error(services.error.message);
  if (images.error) throw new Error(images.error.message);
  const businessMap = new Map(((businesses.data ?? []) as unknown as BusinessRow[]).map((row) => [row.id, row]));
  const serviceMap = new Map(((services.data ?? []) as ServiceRow[]).map((row) => [row.id, row]));
  return rows.map((row) => {
    const business = businessMap.get(row.business_id);
    const service = row.service_id === null ? undefined : serviceMap.get(row.service_id);
    const storedImage = images.data?.find((image) => image.business_id === row.business_id)?.img_url as string | undefined;
    const imageUrl = !storedImage ? null : /^https?:\/\//.test(storedImage) ? storedImage : client.storage.from(import.meta.env.VITE_SUPABASE_BUSINESS_IMAGES_BUCKET ?? "businesses").getPublicUrl(storedImage).data.publicUrl;
    return {
      id: row.id, businessId: row.business_id, serviceId: row.service_id,
      businessName: business?.name ?? "매장 정보 없음", serviceName: service?.name ?? "타임딜",
      category: categoryOf(business), description: service?.description ?? business?.description ?? "",
      imageUrl, address: business?.address ?? "", originalPrice: row.original_price, price: row.deal_price,
      remainingCapacity: row.remaining_capacity, endAt: row.end_at,
      // Sale windows do not establish bookable service slots. A server slot API is needed.
      slots: [],
    };
  });
}

export function useConsumerCatalog() {
  const enabled = usePreviewStore((state) => state.enabled);
  const [result, setResult] = useState<{ deals: ConsumerDeal[]; error: string | null; ready: boolean }>({ deals: [], error: null, ready: false });
  useEffect(() => {
    if (enabled) return;
    let current = true;
    void requestConsumerCatalog().then(
      (deals) => { if (current) setResult({ deals, error: null, ready: true }); },
      (error: unknown) => { if (current) setResult({ deals: [], error: error instanceof Error ? error.message : "타임딜을 불러오지 못했습니다.", ready: true }); },
    );
    return () => { current = false; };
  }, [enabled]);
  return enabled ? { deals: PREVIEW_DEALS, loading: false, error: null } : { deals: result.deals, loading: !result.ready, error: result.error };
}
