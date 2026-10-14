import { useNavigate } from "react-router-dom";
import { useBusinessHistory } from "@/features/consumer/history";
import { usePreviewStore } from "@/features/consumer/preview";

export default function RecentViewed() {
  const navigate = useNavigate();
  const preview = usePreviewStore((state) => state.enabled);
  const visits = useBusinessHistory((state) => state.visits);
  const shops = visits.filter((visit) => visit.preview === preview);

  return (
    <ul className="flex flex-col gap-3 px-4 py-4">
      <li className="text-sm">이 브라우저에서 최근 확인한 매장입니다.</li>
      {shops.length === 0 && <li className="text-sm">아직 방문한 매장 상세가 없습니다.</li>}
      {shops.map(shop => (
        <li key={shop.id}>
          <button onClick={() => navigate(`/business/${shop.id}`)} className="flex items-center gap-3 rounded border border-page-border p-4 text-left">
            <p className="text-sm text-page-heading">{shop.name}</p>
          </button>
        </li>
      ))}
    </ul>
  );
}
