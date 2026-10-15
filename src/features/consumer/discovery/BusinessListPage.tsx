import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { SERVICE_CATEGORIES } from "@/data/packageOptions";
import { EmptyState, Page } from "@/features/consumer/ui";
import { readCategoryBusinesses, type BusinessSummary } from "./business";

export function BusinessListPage() {
  const [searchParams] = useSearchParams();
  const categoryParam = searchParams.get("category");
  const category = SERVICE_CATEGORIES.find((item) => item.id === categoryParam);
  const categoryId = category?.id;
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    businesses: BusinessSummary[];
    error: string | null;
  } | null>(null);
  const requestKey = `${categoryId}:${attempt}`;

  useEffect(() => {
    let current = true;
    readCategoryBusinesses(categoryId).then((businesses) => {
      if (current) setResult({ key: requestKey, businesses, error: null });
    }).catch((error: unknown) => {
      if (current) setResult({
        key: requestKey,
        businesses: [],
        error: error instanceof Error ? error.message : "잠시 후 다시 시도해 주세요.",
      });
    });
    return () => { current = false; };
  }, [categoryId, requestKey]);

  const currentResult = result?.key === requestKey ? result : null;

  return (
    <Page title={category ? `${category.label} 매장` : "카테고리별 매장"}>
      <nav aria-label="매장 카테고리" className="flex flex-wrap gap-2">
        <Link to="/businesses" className={`rounded-full border px-4 py-2 text-sm font-semibold ${!categoryId ? "border-accent bg-accent text-white" : "border-page-border text-page-text"}`}>전체</Link>
        {SERVICE_CATEGORIES.map((item) => (
          <Link
            key={item.id}
            to={`/businesses?category=${item.id}`}
            aria-current={categoryId === item.id ? "page" : undefined}
            className={`rounded-full border px-4 py-2 text-sm font-semibold ${categoryId === item.id ? "border-accent bg-accent text-white" : "border-page-border text-page-text"}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      {!currentResult ? (
        <p role="status">매장 목록을 불러오는 중입니다.</p>
      ) : currentResult.error ? (
        <EmptyState title="매장 목록을 불러오지 못했습니다" description={currentResult.error} action={
          <button type="button" onClick={() => setAttempt((value) => value + 1)} className="text-accent">다시 시도</button>
        } />
      ) : (
        <section className="space-y-3">
          <h1 className="text-lg font-bold text-page-heading">{category?.label ?? ""} 전체 매장 <span className="text-accent">{currentResult.businesses.length}</span></h1>
          {currentResult.businesses.length ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              {currentResult.businesses.map((business) => (
                <li key={business.id}>
                  <Link to={`/business/${business.id}`} className="block h-full space-y-2 rounded-xl border border-page-border p-4 hover:border-accent">
                    {business.business_images?.[0]?.img_url && <img src={business.business_images[0].img_url} alt={business.name} loading="lazy" className="aspect-video w-full rounded-lg object-cover" />}
                    <h2 className="font-bold text-page-heading">{business.name}</h2>
                    <p className="text-sm text-page-text">{business.address || "주소 정보 준비 중"}</p>
                    {business.description && <p className="line-clamp-2 text-sm text-page-text">{business.description}</p>}
                    <span className="inline-block text-sm font-semibold text-accent">매장 상세 보기 →</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <EmptyState title="등록된 매장이 없습니다" description="다른 카테고리의 매장도 둘러보세요." />}
        </section>
      )}
    </Page>
  );
}
