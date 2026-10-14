import type { Reservation, ReservationStatus } from "@/type/reservation";
import { getSupabaseClient } from "./supabase";

interface ReservationRow {
  id: number;
  business_id: number;
  service_id: number;
  status: ReservationStatus;
  start_at: string;
  end_at: string;
  price: number;
  created_at: string;
  updated_at: string;
  booking_summary?: string | null;
  businesses: { name: string } | null;
  services: { name: string } | null;
}

/** Read only. RLS must additionally enforce ownership in Supabase. */
export async function requestReservations(status?: ReservationStatus): Promise<Reservation[]> {
  const client = getSupabaseClient();
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth.user) throw new Error("예약내역을 보려면 로그인해 주세요.");
  let query = client.from("reservations")
    .select("*,businesses(name),services(name)")
    .eq("user_id", auth.user.id)
    .order("start_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data, error } = await query.returns<ReservationRow[]>();
  if (error) throw new Error("예약내역을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
  return (data ?? []).map(row => ({
    id: String(row.id),
    // Existing reservations have no time_deal_id. Never infer it from a service ID.
    dealId: null,
    businessId: row.business_id,
    serviceId: row.service_id,
    productName: row.booking_summary || row.services?.name || "시술 정보 없음",
    shopName: row.businesses?.name ?? "매장 정보 없음",
    status: row.status,
    reservedAt: row.start_at,
    endAt: row.end_at,
    price: Number(row.price),
    paymentStatus: "unavailable",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isPreview: false,
  }));
}
