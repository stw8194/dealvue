import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { requestDealKitRecommends } from "@/api/home";
import type { DealKitRecommend as DealKitRecommendItem } from "@/type/home";

export default function DealKitRecommend() {
  const navigate = useNavigate();
  const [items, setItems] = useState<DealKitRecommendItem[]>([]);

  useEffect(() => {
    requestDealKitRecommends().then(data => {
      if (data) setItems(data);
    });
  }, []);

  return (
    <ul className="flex gap-3 overflow-x-auto px-4 py-4 min-[390px]:px-5">
      {items.map(item => (
        <li key={item.id} className="w-36 shrink-0 min-[390px]:w-40">
          <button onClick={() => navigate(`/package/detail/${item.id}`)} className="text-left">
            <img src={item.thumbnail} alt={item.title} className="aspect-square w-full rounded-xl object-cover" />
            <p className="mt-2 text-sm text-page-heading">{item.title}</p>
            <p className="text-sm font-semibold text-accent">최대 {item.discountRate}%</p>
          </button>
        </li>
      ))}
    </ul>
  );
}
