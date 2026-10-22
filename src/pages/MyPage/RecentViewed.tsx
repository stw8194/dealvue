import { useNavigate } from "react-router-dom";
import { useBusinessHistory } from "@/features/consumer/history";
import { useBusinessImages } from "@/features/consumer/useBusinessImages";
import BusinessImage from "@/components/common/BusinessImage";

export default function RecentViewed() {
  const navigate = useNavigate();
  const visits = useBusinessHistory((state) => state.visits);
  const shops = visits.filter((visit) => !visit.preview);
  const images = useBusinessImages(shops.map(shop => shop.id));

  return (
    <ul className="flex flex-col gap-3 px-4 py-4">
      <li className="text-sm">최근 둘러본 매장을 다시 만나보세요.</li>
      {shops.length === 0 && <li className="text-sm">아직 방문한 매장 상세가 없습니다.</li>}
      {shops.map(shop => (
        <li key={shop.id}>
          <button onClick={() => navigate(`/business/${shop.id}`)} className="flex w-full items-center gap-3 rounded-xl border border-page-border bg-white p-3 text-left">
            <BusinessImage src={images[shop.id]} className="h-16 w-16 shrink-0 rounded-full" />
            <p className="text-sm text-page-heading">{shop.name}</p>
          </button>
        </li>
      ))}
    </ul>
  );
}
