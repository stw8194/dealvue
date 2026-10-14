import { getSupabaseClient } from "@/api/supabase";
import type { ServiceMenuCategory } from "@/features/consumer/booking/serviceSelection";

export async function getServiceMenuCategories(businessId: number): Promise<ServiceMenuCategory[]> {
  const { data, error } = await getSupabaseClient().from("service_menu_categories")
    .select("id,name,selection_mode,sort_order").eq("business_id", businessId).order("sort_order").order("id");
  if (error?.code === "PGRST205" || error?.code === "42P01") return [];
  if (error) throw new Error("시술 카테고리를 불러오지 못했어요. 다시 시도해 주세요.");
  return data ?? [];
}

export async function canManageServiceMenu(businessId: number) {
  const { data, error } = await getSupabaseClient().rpc("can_manage_service_menu", { p_business_id: businessId });
  return !error && data === true;
}

export async function saveServiceMenuCategory(businessId: number, category: Omit<ServiceMenuCategory, "id"> & { id?: number }, serviceIds: number[]) {
  const { error } = await getSupabaseClient().rpc("save_service_menu_category", {
    p_business_id: businessId, p_category_id: category.id ?? null, p_name: category.name,
    p_selection_mode: category.selection_mode, p_sort_order: category.sort_order, p_service_ids: serviceIds,
  });
  if (error) throw new Error(error.message);
}

export async function deleteServiceMenuCategory(businessId: number, categoryId: number) {
  const { error } = await getSupabaseClient().rpc("delete_service_menu_category", { p_business_id: businessId, p_category_id: categoryId });
  if (error) throw new Error(error.message);
}
export type BookingMode = "app" | "phone" | "both";
export type BookingSlot = { start_at: string; end_at: string; available: boolean };
export async function getBookingMode(businessId: number): Promise<BookingMode> {
  const { data, error } = await getSupabaseClient().from("business_booking_settings").select("booking_mode").eq("business_id", businessId).maybeSingle();
  if (error || !data) throw new Error("매장의 예약 설정을 준비 중입니다. 잠시 후 다시 확인해 주세요.");
  if (!["app", "phone", "both"].includes(data.booking_mode)) throw new Error("예약 방식이 올바르지 않습니다.");
  return data.booking_mode;
}
export async function getBookingSlots(businessId: number, staffId: number, serviceIds: number[], date: string): Promise<BookingSlot[]> {
  const { data, error } = await getSupabaseClient().rpc("salon_booking_slots", { p_business_id: businessId, p_staff_id: staffId, p_service_ids: serviceIds, p_date: date });
  if (error) throw new Error(error.message);
  return data ?? [];
}
export async function createSalonBooking(businessId: number, staffId: number, serviceIds: number[], start: string, requestId: string): Promise<number> {
  const client = getSupabaseClient();
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth.user) throw new Error("로그인 후 예약해 주세요.");
  const { data, error } = await client.rpc("create_salon_booking", { p_business_id: businessId, p_staff_id: staffId, p_service_ids: serviceIds, p_start_at: start, p_request_id: requestId });
  if (error) throw new Error(error.message);
  return data as number;
}
