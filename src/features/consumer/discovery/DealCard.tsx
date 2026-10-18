import { Heart } from "lucide-react";
import { Link } from "react-router-dom";
import type { ConsumerDeal } from "@/features/consumer/types";
import { SERVICE_CATEGORIES } from "@/data/packageOptions";
import { useDiscoveryFavorites } from "./favorites";
import { bookingOffer, isOpenDeal, remainingLabel, useDealTime } from "@/features/consumer/dealTiming";

export function DealCard({ deal }: { deal: ConsumerDeal }) {
  const now = useDealTime();
  const liked = useDiscoveryFavorites((state) => state.dealIds.includes(deal.id));
  const toggleDeal = useDiscoveryFavorites((state) => state.toggleDeal);
  const open = isOpenDeal(deal, now);
  const offer = bookingOffer(deal, now);
  const discount = open && deal.originalPrice > deal.price && deal.originalPrice > 0
    ? (deal.discountRate ?? Math.round((1 - deal.price / deal.originalPrice) * 100)) : 0;
  return (
    <article className="rounded-xl border border-page-border bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <Link to={`/business/${deal.businessId}`} className="text-sm text-page-text underline underline-offset-4">{deal.businessName}</Link>
        {(
          <button type="button" aria-label={`${deal.serviceName} ${liked ? "찜 해제" : "찜 추가"}`} aria-pressed={liked} onClick={() => toggleDeal(deal.id)} className="shrink-0 rounded-lg p-2 text-accent">
            <Heart size={20} fill={liked ? "currentColor" : "none"} />
          </button>
        )}
      </div>
      <Link to={`/deal/${deal.id}`} className="mt-2 block space-y-2">
        {deal.imageUrl && <img src={deal.imageUrl} alt="" loading="lazy" className="h-36 w-full rounded-lg object-cover" />}
        <p className="text-xs text-page-text">{SERVICE_CATEGORIES.find((item) => item.id === deal.category)?.label ?? "시술"}</p>
        <h3 className="font-bold text-page-heading">{deal.serviceName}</h3>
        <p className="text-sm text-page-text">{deal.address || "주소 정보 준비 중"}</p>
        <p className="flex flex-wrap items-baseline gap-2">
          {discount > 0 && <span className="font-bold text-accent">{discount}%</span>}
          <strong className="text-lg text-page-heading">{offer.price.toLocaleString()}원</strong>
          {discount > 0 && <span className="text-xs text-page-text line-through">{deal.originalPrice.toLocaleString()}원</span>}
        </p>
        <p className="text-xs text-page-text">{open ? `${deal.remainingCapacity}자리 · ${deal.timeWindow ?? remainingLabel(deal.endAt, now)}` : `정상가 예약 · 타임딜가 ${deal.price.toLocaleString()}원`}</p>
        <span className="inline-block text-sm font-semibold text-accent">상세 · 일정 확인 →</span>
      </Link>
    </article>
  );
}
