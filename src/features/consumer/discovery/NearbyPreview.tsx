import { Link } from "react-router-dom";
import { useConsumerCatalog } from "@/features/consumer/catalog";
import { Page } from "@/features/consumer/ui";
import { DealCard } from "./DealCard";

export default function NearbyPreview() {
  const { deals } = useConsumerCatalog();
  return <Page title="내 주변"><p className="text-sm">예시 동네의 매장과 타임딜 목록입니다. 실제 지도는 설정에서 ‘실제 데이터 보기’로 전환하면 확인할 수 있습니다.</p><Link to="/settings" className="inline-block text-sm text-accent">설정 →</Link><Link to="/location" className="ml-4 inline-block text-sm text-accent">동네 설정 →</Link><div className="space-y-3">{deals.map((deal) => <DealCard key={deal.id} deal={deal} />)}</div></Page>;
}
