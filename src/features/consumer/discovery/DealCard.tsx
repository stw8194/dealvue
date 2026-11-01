import { Heart, MapPin, Clock3 } from "lucide-react";
import { Link } from "react-router-dom";
import type { ConsumerDeal } from "@/features/consumer/types";
import { SERVICE_CATEGORIES } from "@/data/packageOptions";
import { useDiscoveryFavorites } from "./favorites";
import { bookingOffer, isOpenDeal, remainingLabel, useDealTime } from "@/features/consumer/dealTiming";
import BusinessImage from "@/components/common/BusinessImage";

export function DealCard({ deal }: { deal: ConsumerDeal }) {
  const now = useDealTime();
  const liked = useDiscoveryFavorites(state => state.dealIds.includes(deal.id));
  const toggleDeal = useDiscoveryFavorites(state => state.toggleDeal);
  const open = isOpenDeal(deal, now);
  const offer = bookingOffer(deal, now);
  const discount = open && deal.originalPrice > deal.price && deal.originalPrice > 0 ? (deal.discountRate ?? Math.round((1 - deal.price / deal.originalPrice) * 100)) : 0;
  return <article className="relative rounded-2xl border border-page-border bg-white p-3 shadow-[0_2px_6px_rgb(32_38_50/4%)]">
    <div className="flex gap-3">
      <Link to={`/deal/${deal.id}`} className="relative w-[104px] shrink-0 overflow-hidden rounded-xl bg-gray-50">
        <BusinessImage src={deal.imageUrl} className="h-full min-h-[126px] w-full" />
        {discount > 0 && <span className="absolute left-1.5 top-1.5 rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">-{discount}%</span>}
      </Link>
      <div className="min-w-0 flex-1 py-0.5">
        <Link to={`/business/${deal.businessId}`} className="block truncate pr-7 text-[11px] font-medium text-page-text">{deal.businessName}</Link>
        <Link to={`/deal/${deal.id}`} className="mt-1 block line-clamp-2 text-[14px] font-bold leading-snug text-page-heading">{deal.serviceName}</Link>
        <p className="mt-1.5 flex items-center gap-1 truncate text-[10px] text-gray-400"><MapPin size={10} className="shrink-0" />{deal.address || "위치 정보 확인하기"}</p>
        <span className="mt-2 inline-block rounded border border-page-border px-1.5 py-0.5 text-[9px] text-gray-400">{SERVICE_CATEGORIES.find(item => item.id === deal.category)?.label ?? "시술"}</span>
        <div className="mt-2 flex items-end justify-between gap-1"><div>{discount > 0 && <s className="block text-[10px] text-gray-400">{deal.originalPrice.toLocaleString()}원</s>}<strong className="text-[18px] font-extrabold text-accent">{offer.price.toLocaleString()}<span className="text-[11px]">원</span></strong></div><Link to={`/deal/${deal.id}`} className="rounded-full bg-accent px-2.5 py-1.5 text-[10px] font-semibold text-white">상세보기</Link></div>
        <p className="mt-2 flex items-center gap-1 text-[9px] text-gray-400"><Clock3 size={10} />{open ? `${deal.remainingCapacity}자리 · ${deal.timeWindow ?? remainingLabel(deal.endAt, now)}` : "정상가 예약 가능"}</p>
      </div>
    </div>
    <button type="button" aria-label={`${deal.serviceName} ${liked ? "찜 해제" : "찜 추가"}`} aria-pressed={liked} onClick={() => toggleDeal(deal.id)} className={`absolute right-2.5 top-2.5 p-1 ${liked ? "text-accent" : "text-gray-300"}`}><Heart size={19} strokeWidth={1.7} fill={liked ? "currentColor" : "none"} /></button>
  </article>;
}
