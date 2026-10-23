import { getSupabaseClient } from "@/api/supabase";

export const WELCOME_COUPON_CODE = "FIRST_VISIT_3000";

export type CouponClaimResult = {
  claimed: boolean;
  alreadyClaimed: boolean;
};

export type UserCoupon = {
  id: number;
  title: string;
  description: string | null;
  discountAmount: number;
  minimumOrderAmount: number;
  claimedAt: string;
  expiresAt: string | null;
  used: boolean;
};

type UserCouponRow = {
  id: number;
  claimed_at: string;
  expires_at: string | null;
  used_at: string | null;
  coupons:
    | {
        title: string;
        description: string | null;
        discount_amount: number;
        minimum_order_amount: number;
      }
    | {
        title: string;
        description: string | null;
        discount_amount: number;
        minimum_order_amount: number;
      }[]
    | null;
};

async function hasSession() {
  const { data, error } = await getSupabaseClient().auth.getSession();
  if (error) throw error;
  return Boolean(data.session);
}

export async function requestWelcomeCouponStatus() {
  if (!(await hasSession())) return null;

  const { data, error } = await getSupabaseClient().rpc(
    "has_claimed_coupon",
    { coupon_code: WELCOME_COUPON_CODE },
  );

  if (error) throw error;
  return Boolean(data);
}

export async function requestWelcomeCouponClaim(): Promise<CouponClaimResult> {
  if (!(await hasSession())) throw new Error("로그인 후 쿠폰을 받아 주세요.");

  const { data, error } = await getSupabaseClient().rpc("claim_coupon", {
    coupon_code: WELCOME_COUPON_CODE,
  });

  if (error) throw error;

  const result = data as Partial<CouponClaimResult> | null;
  if (!result?.claimed) throw new Error("쿠폰을 받지 못했습니다.");

  return {
    claimed: true,
    alreadyClaimed: Boolean(result.alreadyClaimed),
  };
}

export async function requestUserCoupons(): Promise<UserCoupon[]> {
  const { data: auth, error: authError } = await getSupabaseClient().auth.getUser();
  if (authError || !auth.user) throw new Error("로그인 후 쿠폰함을 확인해 주세요.");

  const { data, error } = await getSupabaseClient()
    .from("user_coupons")
    .select(
      "id, claimed_at, expires_at, used_at, coupons(title, description, discount_amount, minimum_order_amount)",
    )
    .eq("user_id", auth.user.id)
    .order("claimed_at", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as UserCouponRow[]).flatMap((row) => {
    const coupon = Array.isArray(row.coupons) ? row.coupons[0] : row.coupons;
    if (!coupon) return [];

    return [
      {
        id: row.id,
        title: coupon.title,
        description: coupon.description,
        discountAmount: coupon.discount_amount,
        minimumOrderAmount: coupon.minimum_order_amount,
        claimedAt: row.claimed_at,
        expiresAt: row.expires_at,
        used: Boolean(row.used_at),
      },
    ];
  });
}
