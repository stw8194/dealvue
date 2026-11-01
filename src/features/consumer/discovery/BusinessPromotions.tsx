import { Link } from "react-router-dom";
import { Clock, Zap } from "lucide-react";
import { useDealKits } from "../dealKits";
import { remainingLabel } from "../dealTiming";
import type { ConsumerDeal } from "../types";
import { BookingButton } from "../auth/loginGate";
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
  return <section aria-label="판매 중인 타임딜" className="rounded-[20px] border border-[#f7d6e2] bg-gradient-to-br from-[#fff3f7] to-[#fce7ef] p-4 shadow-[0_2px_6px_#e5a2bb20]">
    <div className="mb-3 flex items-center justify-between"><h2 className="flex items-center gap-2 text-[15px] font-bold text-accent"><Zap size={19} />지금 진행 중인 타임딜</h2><span className="rounded-full bg-accent/10 px-2.5 py-1 text-[10px] font-bold text-accent">LIVE</span></div>
    <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto [scrollbar-width:none]">
      {deals.map(deal => {
        const discount = deal.originalPrice > deal.price && deal.originalPrice > 0 ? (deal.discountRate ?? Math.round((deal.originalPrice - deal.price) * 100 / deal.originalPrice)) : 0;
        return <article key={deal.id} className="w-full shrink-0 snap-center rounded-2xl border border-white bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2"><span className="rounded bg-accent px-2 py-1 text-[10px] font-bold text-white">{discount}% OFF</span><span className="flex items-center gap-1 rounded-lg bg-[#38363a] px-2 py-1 text-[11px] font-semibold tabular-nums text-white"><Clock size={12} />{remainingLabel(deal.endAt, now)}</span></div>
          <Link to={`/deal/${deal.id}`} className="mt-2 block text-[15px] font-bold text-page-heading">{deal.serviceName}</Link>
          <p className="mt-1 text-[10px] text-gray-400">잔여 {deal.remainingCapacity}자리 · {deal.timeWindow ?? "한정 타임딜"}</p>
          <div className="mt-3 flex items-baseline gap-2"><s className="text-[11px] text-gray-400">{deal.originalPrice.toLocaleString()}원</s><strong className="text-[22px] font-extrabold text-accent">{deal.price.toLocaleString()}원</strong></div>
          <BookingButton to={`/checkout/${deal.id}`} className="mt-3 flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-accent text-[13px] font-bold text-white"><Zap size={15} />타임딜 예약하기</BookingButton>
        </article>;
      })}
    </div>
  </section>;
}
