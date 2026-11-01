import type { Reservation, ReservationStatus } from "@/type/reservation";
import { resolveBusinessImage } from "@/features/consumer/businessImages";
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
  staff_id?: number;
  user_id: string;
  consumer_booking?: { offerId: number; kind: "timedeal" | "regular" | "package"; originalPrice: number; rotationKey?: string; groupId?: string; legIndex?: number; legCount?: number; cancellationReason?: string; policy?: string };
  staff: { name: string } | null;
  businesses: { name: string; address?: string; business_images?: { img_url: string }[] } | null;
  services: { name: string } | null;
}

/** Read only. RLS must additionally enforce ownership in Supabase. */
export async function requestReservations(status?: ReservationStatus, expectedUserId?: string): Promise<Reservation[]> {
  const client = getSupabaseClient();
  // The auth bridge establishes identity; RLS still enforces ownership on every
  // DB request. Reading the local session avoids a remote /auth/user poll.
  const { data: { session }, error: authError } = await client.auth.getSession();
  const userId = session?.user.id;
  if (authError || !userId || (expectedUserId && userId !== expectedUserId)) throw new Error("예약내역을 보려면 로그인해 주세요.");
  let query = client.from("reservations")
    .select("id,user_id,business_id,service_id,staff_id,status,start_at,end_at,price,created_at,updated_at,booking_summary,consumer_booking,businesses(name,address,business_images(img_url)),services(name),staff(name)")
    .eq("user_id", userId)
    .order("start_at", { ascending: false })
    .order("created_at", { referencedTable: "businesses.business_images", ascending: true })
    .limit(1, { referencedTable: "businesses.business_images" });
  if (status) query = query.eq("status", status);
  const { data, error } = await query.returns<ReservationRow[]>();
  if (error) throw new Error("예약내역을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
  return (data ?? []).map(row => ({
    id: String(row.id),
    // Existing reservations have no time_deal_id. Never infer it from a service ID.
    dealId: row.consumer_booking?.offerId ?? null,
    userId: row.user_id,
    isShared: !!row.consumer_booking,
    staffId: row.staff_id,
    staffName: row.staff?.name,
    address: row.businesses?.address,
    kind: row.consumer_booking?.kind,
    originalPrice: row.consumer_booking?.originalPrice,
    rotationKey: row.consumer_booking?.rotationKey,
    groupId: row.consumer_booking?.groupId || undefined,
    legIndex: row.consumer_booking?.kind === "package" ? row.consumer_booking.legIndex : undefined,
    legCount: row.consumer_booking?.kind === "package" ? row.consumer_booking.legCount : undefined,
    cancellationReason: row.consumer_booking?.cancellationReason,
    policy: { text: "예약 시 결제하지 않습니다. 방문 시작 전까지 변경·취소할 수 있습니다.", freeCancelHours: null },
    businessId: row.business_id,
    serviceId: row.service_id,
    productName: row.booking_summary || row.services?.name || "시술 정보 없음",
    shopName: row.businesses?.name ?? "매장 정보 없음",
    status: row.status,
    imageUrl: resolveBusinessImage(row.businesses?.business_images?.[0]?.img_url),
    reservedAt: new Date(row.start_at).toISOString(),
    endAt: new Date(row.end_at).toISOString(),
    price: Number(row.price),
    paymentStatus: "on_site",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isPreview: false,
  }));
}
