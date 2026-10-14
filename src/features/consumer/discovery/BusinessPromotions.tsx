import { Link } from "react-router-dom";
import { Clock, Zap } from "lucide-react";
import { useDealKits } from "../dealKits";
import { remainingLabel } from "../dealTiming";
import type { ConsumerDeal } from "../types";
import { OfferCard } from "./PackagePages";

export function BusinessDealKits({ businessId }: { businessId: number }) {
  const { kits, loading, error } = useDealKits(businessId);
  const available = kits.filter((kit) => kit.active);
  const enabled = !loading && !error && available.length > 0;
  return <section aria-label="딜키트" aria-disabled={!enabled} className={`rounded-2xl border p-5 ${enabled ? "border-page-border bg-white" : "border-gray-100 bg-gray-50"}`}>
    <div className="flex items-center justify-between gap-3"><h2 className={`font-bold ${enabled ? "text-page-heading" : "text-gray-400"}`}>딜키트</h2>
      {!enabled && <span role={error ? "alert" : loading ? "status" : undefined} className="text-xs text-gray-400">{loading ? "확인 중" : error ? "판매 정보를 불러오지 못했어요" : "판매 중인 상품 없음"}</span>}
      {enabled && <span className="text-xs text-accent">{available.length}개</span>}
    </div>
    {enabled && <div className="mt-4 grid grid-cols-2 gap-3">{available.map((kit) => <OfferCard key={kit.id} offer={kit} />)}</div>}
  </section>;
}

export function BusinessTimeDeals({ deals, now }: { deals: ConsumerDeal[]; now: number }) {
  if (!deals.length) return null;
  return <section aria-label="판매 중인 타임딜" className="absolute inset-x-4 bottom-4 z-10">
    <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto rounded-2xl shadow-[0_8px_30px_rgb(0_0_0/25%)] [scrollbar-width:none]">
      {deals.map((deal, index) => {
        const discount = deal.originalPrice > deal.price && deal.originalPrice > 0 ? Math.floor((deal.originalPrice - deal.price) * 100 / deal.originalPrice) : 0;
        return <Link key={deal.id} to={`/deal/${deal.id}`} className="w-full shrink-0 snap-center rounded-2xl border border-white/70 bg-white/95 p-4 backdrop-blur-md">
          <div className="mb-2 flex items-center justify-between gap-2"><span className="flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-1 text-[11px] font-bold text-white"><Zap size={12} fill="currentColor" />타임딜 특가</span><span className="flex items-center gap-1 text-[10px] font-semibold tabular-nums text-rose-600"><Clock size={12} />{remainingLabel(deal.endAt, now)}</span></div>
          <h2 className="truncate text-sm font-bold text-gray-900">{deal.serviceName}</h2>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2"><strong className="text-xl font-black text-rose-600">{discount > 0 ? `${discount}%` : "특가"}</strong><strong className="text-xl font-black text-gray-900">{deal.price.toLocaleString()}원</strong>{discount > 0 && <s className="text-xs text-gray-400">{deal.originalPrice.toLocaleString()}원</s>}<span className="ml-auto text-[10px] text-gray-500">{deals.length > 1 ? `${index + 1} / ${deals.length} · ` : ""}상세 보기 ›</span></div>
        </Link>;
      })}
    </div>
  </section>;
}
