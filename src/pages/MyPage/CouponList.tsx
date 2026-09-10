import { useEffect, useState } from "react";
import { Ticket } from "lucide-react";
import { requestUserCoupons, type UserCoupon } from "@/api/coupon";

function formatDate(date: string | null) {
  if (!date) return "사용 기한 없음";

  return `${new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date))}까지`;
}

export default function CouponList() {
  const [coupons, setCoupons] = useState<UserCoupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCurrent = true;

    requestUserCoupons()
      .then((data) => {
        if (isCurrent) setCoupons(data);
      })
      .catch((error) => console.error(error))
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  if (isLoading) {
    return (
      <p className="px-5 py-12 text-center text-sm text-gray-400">
        쿠폰을 불러오는 중입니다.
      </p>
    );
  }

  if (coupons.length === 0) {
    return (
      <p className="px-5 py-12 text-center text-sm text-gray-400">
        보유한 쿠폰이 없습니다.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-4 px-4 py-5 min-[390px]:px-5">
      {coupons.map((coupon) => (
        <li
          key={coupon.id}
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
