import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Ticket } from "lucide-react";
import { requestUserCoupons, type UserCoupon } from "@/api/coupon";
import { useCouponStore } from "@/features/consumer/coupons";
import { useAuthStore } from "@/store/useAuthStore";

function formatDate(date: string | null) {
  if (!date) return "사용 기한 없음";

  return `${new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date))}까지`;
}

type CouponRow = Pick<UserCoupon, "title" | "discountAmount" | "minimumOrderAmount" | "expiresAt" | "used"> & { key: string };

export default function CouponList() {
  const userId = useAuthStore((state) => state.user?.id);
  const localCoupons = useCouponStore((state) => state.coupons);
  const [remote, setRemote] = useState<{ userId: string; coupons: UserCoupon[] } | null>(null);

  useEffect(() => {
    if (!userId) return;
    let isCurrent = true;
    requestUserCoupons()
      .then((coupons) => { if (isCurrent) setRemote({ userId, coupons }); })
      .catch(() => { if (isCurrent) setRemote({ userId, coupons: [] }); });
    return () => {
      isCurrent = false;
    };
  }, [userId]);

  if (userId && remote?.userId !== userId) {
    return (
      <p className="px-5 py-12 text-center text-sm text-gray-400">
        쿠폰을 불러오는 중입니다.
      </p>
    );
  }

  // Coupons on this device are the ones checkout applies; account coupons with the same title are not listed twice.
  const rows: CouponRow[] = [
    ...localCoupons.map((coupon) => ({ key: coupon.id, title: coupon.title, discountAmount: coupon.discountAmount, minimumOrderAmount: coupon.minimumOrderAmount, expiresAt: coupon.expiresAt, used: Boolean(coupon.usedReservationId) })),
    ...(userId && remote ? remote.coupons.filter((coupon) => !localCoupons.some((local) => local.discountAmount === coupon.discountAmount && local.minimumOrderAmount === coupon.minimumOrderAmount)).map((coupon) => ({ ...coupon, key: `account-${coupon.id}` })) : []),
  ];

  if (rows.length === 0) {
    return (
      <div className="px-5 py-12 text-center text-sm text-gray-400">
        <p>보유한 쿠폰이 없습니다.</p>
        <Link to="/" className="mt-3 inline-block font-semibold text-accent">홈에서 첫방문 쿠폰 받기</Link>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-4 px-4 py-5 min-[390px]:px-5">
      {rows.map((coupon) => (
        <li
          key={coupon.key}
          className="flex items-center gap-4 rounded-2xl border border-page-border border-l-4 border-l-accent bg-white px-5 py-5 shadow-[0_2px_12px_rgb(0_0_0/7%)]"
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-pink-50 text-accent">
            <Ticket className="h-6 w-6" strokeWidth={2.1} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-black text-page-heading">
              {coupon.discountAmount.toLocaleString()}원 할인
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-page-text">
              {coupon.title}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              {coupon.minimumOrderAmount.toLocaleString()}원 이상 결제 시 · {formatDate(coupon.expiresAt)}
            </p>
          </div>
          {coupon.used && (
            <span className="shrink-0 text-xs font-bold text-gray-400">사용 완료</span>
          )}
        </li>
      ))}
    </ul>
  );
}
