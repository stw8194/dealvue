import { Link } from "react-router-dom";
import { useReservations } from "@/features/consumer/booking/useReservations";
import { useBookingStore } from "@/features/consumer/booking/store";
import { useDiscoveryFavorites } from "@/features/consumer/discovery/favorites";
import { pointBalance, useEngagementStore } from "@/features/consumer/engagement/store";

export default function Stats() {
  const { reservations } = useReservations();
  const reviews = useBookingStore((state) => state.reviews);
  const points = useEngagementStore((state) => pointBalance(state.pointHistory));
  const favoriteShops = useDiscoveryFavorites((state) => state.businessIds.length);
  const kept = reservations.filter((reservation) => reservation.status !== "cancelled");
  const saved = kept.reduce((sum, reservation) => sum + Math.max(0, (reservation.originalPrice ?? reservation.price) - (reservation.paidAmount ?? reservation.price)), 0);
  const spent = kept.reduce((sum, reservation) => sum + (reservation.paidAmount ?? reservation.price), 0);
  const shops = new Map<string, number>();
  kept.forEach((reservation) => shops.set(reservation.shopName, (shops.get(reservation.shopName) ?? 0) + 1));
  const favoriteShop = [...shops.entries()].sort((a, b) => b[1] - a[1])[0];
  const rows = [
    ["전체 예약", `${kept.length}건`, "/reservation"],
    ["이용 완료", `${kept.filter((reservation) => reservation.status === "done").length}건`, "/reservation/usage"],
    ["딜뷰로 아낀 금액", `${saved.toLocaleString()}원`, "/reservation"],
    ["누적 예약 금액", `${spent.toLocaleString()}원`, "/reservation"],
    ["작성한 리뷰", `${reviews.length}개`, "/mypage/review"],
    ["보유 포인트", `${points.toLocaleString()} P`, "/mypage/point"],
    ["찜한 매장", `${favoriteShops}곳`, "/wishlist"],
  ] as const;
  return (
    <div className="space-y-4 p-4">
      <h2 className="font-semibold">내 통계</h2>
      <ul className="divide-y divide-page-border rounded-xl border border-page-border bg-white">
        {rows.map(([label, value, path]) => <li key={label}><Link to={path} className="flex items-center justify-between px-4 py-3 text-sm"><span className="text-page-text">{label}</span><strong>{value}</strong></Link></li>)}
      </ul>
      {favoriteShop && <p className="text-sm text-page-text">가장 많이 예약한 매장은 <strong className="text-page-heading">{favoriteShop[0]}</strong>({favoriteShop[1]}건)이에요.</p>}
    </div>
  );
}
