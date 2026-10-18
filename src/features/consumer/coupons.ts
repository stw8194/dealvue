import { create } from "zustand";
import { persist } from "zustand/middleware";
import { commitLedger, registerLedgerCache } from "./ledger";

export interface LocalCoupon {
  id: string;
  title: string;
  description: string;
  discountAmount: number;
  minimumOrderAmount: number;
  claimedAt: string;
  expiresAt: string;
  usedReservationId?: string;
}

export const WELCOME_COUPON = {
  id: "welcome-3000",
  title: "첫방문 3,000원 쿠폰팩",
  description: "15,000원 이상 예약 시 사용 가능",
  discountAmount: 3000,
  minimumOrderAmount: 15000,
} as const;

const VALID_DAYS = 30;

interface CouponState {
  coupons: LocalCoupon[];
  /** Resolves to true when this call added the coupon, false when it was already claimed. */
  claimWelcome: () => Promise<boolean>;
}

export function isCouponUsable(coupon: LocalCoupon, amount: number, now = Date.now()) {
  return !coupon.usedReservationId && Date.parse(coupon.expiresAt) > now && amount >= coupon.minimumOrderAmount;
}

// The ledger is the source of truth; this store is the screen's copy of its coupons.
export const useCouponStore = create<CouponState>()(persist<CouponState, [], [], Pick<CouponState, "coupons">>(() => ({
  coupons: [],
  claimWelcome: () => commitLedger(state => {
    if (state.coupons.some(coupon => coupon.id === WELCOME_COUPON.id)) return { next: state, result: false };
    const now = Date.now();
    const coupon: LocalCoupon = { ...WELCOME_COUPON, claimedAt: new Date(now).toISOString(), expiresAt: new Date(now + VALID_DAYS * 86400000).toISOString() };
    return { next: { ...state, coupons: [coupon, ...state.coupons] }, result: true };
  }),
}), { name: "dealvue-consumer-coupons-v1", partialize: state => ({ coupons: state.coupons }) }));

registerLedgerCache({
  read: () => ({ coupons: useCouponStore.getState().coupons }),
  write: ({ coupons }) => { if (coupons) useCouponStore.setState({ coupons }); },
});
