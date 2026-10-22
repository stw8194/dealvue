import ChoiceGroup from "@/components/common/ChoiceGroup";
import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { SERVICE_CATEGORIES } from "@/data/packageOptions";
import { useConsumerCatalog } from "@/features/consumer/catalog";
import { DealCard } from "@/features/consumer/discovery/DealCard";
import { EmptyState, Page } from "@/features/consumer/ui";
import { bookingOffer, isOpenDeal, useDealTime } from "@/features/consumer/dealTiming";

function SearchForm({ keyword, onSearch }: { keyword: string; onSearch: (value: string) => void }) {
  const [value, setValue] = useState(keyword);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch(value.trim());
  }
  return (
    <form onSubmit={submit} className="flex gap-2">
      <label className="min-w-0 flex-1"><span className="sr-only">매장, 시술, 동네 검색</span><input type="search" value={value} onChange={(event) => setValue(event.target.value)} placeholder="매장, 시술, 동네 검색" className="w-full rounded-lg border border-page-border px-3 py-3 text-sm" /></label>
      <button type="submit" className="rounded-lg bg-accent px-4 text-sm font-semibold text-white">검색</button>
    </form>
  );
}

export default function Search() {
  const now = useDealTime();
  const [params, setParams] = useSearchParams();
  const { deals, loading, error } = useConsumerCatalog();
  const keyword = params.get("keyword") ?? "";
  const category = params.get("category") ?? "";
  const area = params.get("area") ?? "";
  const sort = params.get("sort") ?? "ending";
  function updateParam(key: string, value: string) {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      if (value) next.set(key, value); else next.delete(key);
      return next;
    });
  }
  const results = deals.filter((deal) => {
    const text = `${deal.businessName} ${deal.serviceName} ${deal.address} ${deal.description}`.toLocaleLowerCase();
    // A keyword search also finds shops whose time deal is not running now; they book at the menu price.
    return (isOpenDeal(deal, now) || keyword.trim() !== "") && text.includes(keyword.toLocaleLowerCase()) && (!category || deal.category === category) && (!area || deal.address.includes(area));
  }).sort((a, b) => {
    const openFirst = Number(isOpenDeal(b, now)) - Number(isOpenDeal(a, now));
    if (openFirst) return openFirst;
    const offerA = bookingOffer(a, now), offerB = bookingOffer(b, now);
    return sort === "price" ? offerA.price - offerB.price : sort === "discount" ? offerB.discount / (offerB.originalPrice || 1) - offerA.discount / (offerA.originalPrice || 1) : new Date(a.endAt).getTime() - new Date(b.endAt).getTime();
  });
  const areas = [...new Set(deals.map((deal) => deal.address.split(" ").slice(0, 2).join(" ")).filter(Boolean))];

  return (
    <Page title="검색">
      <div className="space-y-4">
        <SearchForm key={keyword} keyword={keyword} onSearch={(value) => updateParam("keyword", value)} />
        <div className="flex flex-wrap gap-2" role="group" aria-label="시술 카테고리">
          {[{ id: "", label: "전체" }, ...SERVICE_CATEGORIES].map((item) => <button key={item.id} type="button" aria-pressed={category === item.id} onClick={() => updateParam("category", item.id)} className={`rounded-lg border px-3 py-2 text-sm ${category === item.id ? "border-accent text-accent" : "border-page-border text-page-text"}`}>{item.label}</button>)}
        </div>
        <div className="space-y-4 rounded-2xl bg-[#faf7f8] p-4">
          <ChoiceGroup label="지역" value={area} onChange={value => updateParam("area", value)} options={[{ value: "", label: "전체 지역" }, ...[...new Set([...(area ? [area] : []), ...areas])].map(value => ({ value, label: value.replace(/^서울특별시 /, "") }))]} />
          <ChoiceGroup label="정렬" value={sort} onChange={value => updateParam("sort", value)} options={[{ value: "ending", label: "마감 빠른순" }, { value: "price", label: "낮은 가격순" }, { value: "discount", label: "할인율 높은순" }]} />
        </div>
        {loading ? <p role="status" className="py-8 text-center text-sm">검색 결과를 불러오는 중입니다.</p> : error ? <EmptyState title="검색 결과를 불러오지 못했습니다" description={error} action={<button type="button" onClick={() => window.location.reload()} className="text-accent">다시 시도</button>} /> : <>
          <p className="text-sm text-page-text" aria-live="polite">{keyword ? `“${keyword}” ` : ""}검색 결과 {results.length}건</p>
          {results.length ? <div className="space-y-3">{results.map((deal) => <DealCard key={deal.id} deal={deal} />)}</div> : <EmptyState title="조건에 맞는 타임딜이 없습니다" description="검색어나 카테고리, 지역을 바꿔보세요." action={<button type="button" onClick={() => setParams({})} className="text-accent">검색 조건 초기화</button>} />}
        </>}
      </div>
    </Page>
  );
}
