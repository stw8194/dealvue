import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useConsumerCatalog } from "@/features/consumer/catalog";
import { usePreviewStore } from "@/features/consumer/preview";
import { EmptyState, Page } from "@/features/consumer/ui";
import BusinessProfile from "./BusinessProfile";
import { readConsumerBusiness, type ConsumerBusiness } from "./business";
import { useBusinessHistory } from "@/features/consumer/history";

export function BusinessDetailPage() {
  const { businessId } = useParams();
  const preview = usePreviewStore((state) => state.enabled);
  const { deals, loading: catalogLoading, error: catalogError } = useConsumerCatalog();
  const [result, setResult] = useState<{ key: string; business: ConsumerBusiness | null; error: string | null } | null>(null);
  const requestKey = `${preview}:${businessId}`;
  useEffect(() => {
    if (preview) return;
    let current = true;
    const id = Number(businessId);
    if (!Number.isSafeInteger(id) || id <= 0) return;
    readConsumerBusiness(id).then((business) => {
      if (current) setResult({ key: requestKey, business, error: null });
    }).catch((error: unknown) => {
      if (current) setResult({ key: requestKey, business: null, error: error instanceof Error ? error.message : "매장 정보를 불러오지 못했습니다." });
    });
    return () => { current = false; };
  }, [businessId, preview, requestKey]);
  const businessDeals = deals.filter((deal) => deal.businessId === Number(businessId));
  const first = businessDeals[0];
  const previewBusiness: ConsumerBusiness | null = first ? {
    id: first.businessId, name: first.businessName, address: first.address,
    number: "", description: "시술과 방문 일정을 확인하고 나에게 맞는 타임딜을 찾아보세요.",
    services: [...new Map(businessDeals.filter((deal) => deal.serviceId !== null).map((deal) => [deal.serviceId, { id: deal.serviceId!, name: deal.serviceName, price: deal.originalPrice, duration_minutes: null, description: deal.description }])).values()],
    staff: [], categories: first.category ? [first.category] : [], images: first.imageUrl ? [first.imageUrl] : [],
  } : null;
  const invalidId = !Number.isSafeInteger(Number(businessId)) || Number(businessId) <= 0;
  const loading = !invalidId && (preview ? catalogLoading : result?.key !== requestKey);
  const error = preview ? catalogError : result?.key === requestKey ? result.error : null;
  const business = preview ? previewBusiness : result?.key === requestKey ? result.business : null;
  const visitedId = business?.id;
  const visitedName = business?.name;
  useEffect(() => {
    if (visitedId && visitedName) useBusinessHistory.getState().record({ id: visitedId, name: visitedName, preview });
  }, [visitedId, visitedName, preview]);
  if (loading) return <Page title="매장 상세"><p role="status">매장 정보를 불러오는 중입니다.</p></Page>;
  if (error) return <Page title="매장 상세"><EmptyState title="매장 정보를 불러오지 못했습니다" description={error} action={<button type="button" onClick={() => window.location.reload()} className="text-accent">다시 시도</button>} /></Page>;
  if (!business) return <Page title="매장 상세"><EmptyState title="매장을 찾을 수 없습니다" action={<Link to="/search" className="text-accent">다른 매장 찾기</Link>} /></Page>;
  return <BusinessProfile key={`${preview}:${business.id}`} business={business} deals={businessDeals} dealsLoading={catalogLoading} dealsError={catalogError} preview={preview} />;
}
