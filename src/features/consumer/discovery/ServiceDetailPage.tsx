import { Link, useParams } from "react-router-dom";
import { useConsumerCatalog } from "@/features/consumer/catalog";
import { EmptyState, Page } from "@/features/consumer/ui";
import { DealCard } from "./DealCard";

export default function ServiceDetailPage() {
  const { productId } = useParams();
  const { deals, loading, error } = useConsumerCatalog();
  const matching = deals.filter((deal) => deal.serviceId === Number(productId));
  return <Page title="시술의 타임딜">{loading ? <p role="status">시술 정보를 불러오는 중입니다.</p> : error ? <EmptyState title="시술 정보를 불러오지 못했습니다" description={error} /> : matching.length ? matching.map((deal) => <DealCard key={deal.id} deal={deal} />) : <EmptyState title="연결된 타임딜이 없습니다" description="다른 시술과 매장을 검색해 보세요." action={<Link to="/search" className="text-accent">타임딜 검색</Link>} />}</Page>;
}
