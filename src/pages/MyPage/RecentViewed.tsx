import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { requestRecentViewedShops } from "@/api/mypage";
import type { RecentViewedShop } from "@/type/mypage";

export default function RecentViewed() {
  const navigate = useNavigate();
  const [shops, setShops] = useState<RecentViewedShop[]>([]);

  useEffect(() => {
    requestRecentViewedShops().then(data => {
      if (data) setShops(data);
    });
  }, []);

  return (
    <ul className="flex flex-col gap-3 px-4 py-4">
      {shops.map(shop => (
        <li key={shop.id}>
          <button onClick={() => navigate(`/product/${shop.id}`)} className="flex items-center gap-3 text-left">
            <img src={shop.thumbnail} alt={shop.name} className="h-16 w-16 rounded-xl object-cover" />
            <p className="text-sm text-page-heading">{shop.name}</p>
          </button>
        </li>
      ))}
    </ul>
  );
}
