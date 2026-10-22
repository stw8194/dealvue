import { businessAddress } from "./businessAddress";
import { getSupabaseClient } from "@/api/supabase";
import { SERVICE_CATEGORIES } from "@/data/packageOptions";
import type { ServiceCategory } from "@/type/package";
import type { ConsumerDeal } from "./types";
import { resolveBusinessImage } from "./businessImages";
import { applyDealRotation } from "./dealSchedule";

type DealRow = { id: number; business_id: number; service_id: number | null; original_price: number; deal_price: number; remaining_capacity: number; start_at?: string; end_at: string };
type TemplateRow = Omit<DealRow, "id" | "end_at" | "start_at"> & { source_key: string; start_time: string; end_time: string; source_details?: { discount_rate?: number } };
type BusinessRow = { id: number; name: string; address: string; description: string | null; business_category: { category: string }[] | { category: string } | null; source_details?: { closed_days?: string; opening_hours?: string; cancellation_policy?: string } };
type ServiceRow = { id: number; name: string; description: string | null; price?: number; duration_minutes?: number; display_duration_minutes?: number };

function categoryOf(business: BusinessRow | undefined): ServiceCategory | null {
  const relation = business?.business_category;
  const value = Array.isArray(relation) ? relation[0]?.category : relation?.category;
  return SERVICE_CATEGORIES.find((category) => category.id === value)?.id ?? null;
}

// Regular bookings use the shop's opening hours, e.g. "10:00~21:00".
export function openingHourSlots(openingHours: string | undefined, duration: number, closedDays = ""): string[] {
  const match = openingHours?.match(/(\d{1,2}:\d{2})\s*[~\-–]\s*(\d{1,2}:\d{2})/);
  return match ? requestSlots(match[1], match[2], duration, closedDays) : requestSlots("10:00", "20:00", duration, closedDays);
}

// Service visit windows are separate from the rotating sale's start/deadline.
function requestSlots(start: string, end: string, duration: number, closedDays = ""): string[] {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const firstMinute = sh * 60 + sm;
  const lastMinute = eh * 60 + em;
  const base = Date.parse(`${today}T00:00:00+09:00`);
  const slots: string[] = [];
  for (let day = 0; day < 14; day += 1) {
    const date = new Date(base + day * 86400000 + 9 * 3600000);
    const weekday = "일월화수목금토"[date.getUTCDay()];
    const week = Math.ceil(date.getUTCDate() / 7);
    if (closedDays.includes("매주") && closedDays.includes(`${weekday}요일`)) continue;
    if (closedDays.includes("둘째") && closedDays.includes("넷째") && closedDays.includes(`${weekday}요일`) && (week === 2 || week === 4)) continue;
    for (let minute = firstMinute; minute <= Math.max(firstMinute, lastMinute - duration); minute += 30) {
      const time = base + day * 86400000 + minute * 60000;
      if (time > Date.now()) slots.push(new Date(time).toISOString());
    }
  }
  return slots;
}

export async function requestConsumerCatalog(): Promise<ConsumerDeal[]> {
  const client = getSupabaseClient();
  const templates = await client.from("provided_deal_templates").select("*").order("source_key");
  if (templates.error && !["PGRST205", "42P01"].includes(templates.error.code)) throw new Error(templates.error.message);
  const supplied = (templates.data ?? []) as TemplateRow[];
  const live = supplied.length ? null : await client.from("time_deals").select("id,business_id,service_id,original_price,deal_price,remaining_capacity,start_at,end_at").order("end_at");
  if (live?.error) throw new Error(live.error.message);
  const rows: (DealRow | TemplateRow)[] = supplied.length ? supplied : (live?.data ?? []) as DealRow[];
  if (!rows.length) return [];
  const businessIds = [...new Set(rows.map((row) => row.business_id))];
  const serviceIds = [...new Set(rows.flatMap((row) => row.service_id === null ? [] : [row.service_id]))];
  const [businesses, services, images] = await Promise.all([
    client.from("businesses").select("id,name,address,description,source_details,business_category(category)").in("id", businessIds),
    serviceIds.length ? client.from("services").select("id,name,description,price,duration_minutes,display_duration_minutes").in("id", serviceIds) : Promise.resolve({ data: [], error: null }),
    client.from("business_images").select("business_id,img_url").in("business_id", businessIds).order("created_at"),
  ]);
  if (businesses.error) throw new Error(businesses.error.message);
  if (services.error) throw new Error(services.error.message);
  if (images.error) throw new Error(images.error.message);
  const businessMap = new Map(((businesses.data ?? []) as unknown as BusinessRow[]).map((row) => [row.id, row]));
  const serviceMap = new Map(((services.data ?? []) as ServiceRow[]).map((row) => [row.id, row]));
  const deals: ConsumerDeal[] = rows.map((row) => {
    const business = businessMap.get(row.business_id);
    const service = row.service_id === null ? undefined : serviceMap.get(row.service_id);
    const duration = service?.display_duration_minutes ?? service?.duration_minutes ?? 60;
    const template = "source_key" in row ? row : null;
    return {
      id: template ? 1_000_000 + row.service_id! : (row as DealRow).id,
      businessId: row.business_id, serviceId: row.service_id,
      businessName: business?.name ?? "매장 정보 없음", serviceName: service?.name ?? "타임딜",
      category: categoryOf(business), description: service?.description ?? business?.description ?? "",
      imageUrl: resolveBusinessImage(images.data?.find((image) => image.business_id === row.business_id)?.img_url as string | undefined),
      address: businessAddress(business?.address), originalPrice: row.original_price, price: row.deal_price,
      remainingCapacity: row.remaining_capacity, endAt: template ? "" : (row as DealRow).end_at,
      startAt: template ? "" : (row as DealRow).start_at,
      slots: template ? requestSlots(template.start_time, template.end_time, duration, business?.source_details?.closed_days) : [],
      regularPrice: service?.price ?? row.original_price,
      regularSlots: openingHourSlots(business?.source_details?.opening_hours, duration, business?.source_details?.closed_days),
      cancellationPolicy: business?.source_details?.cancellation_policy,
      durationMinutes: duration,
      ...(template ? { scheduleKind: "rotation" as const, timeWindow: `${template.start_time.slice(0, 5)}–${template.end_time.slice(0, 5)}`, discountRate: template.source_details?.discount_rate } : {}),
    };
  });
  return applyDealRotation(deals, Date.now());
}
