import type { TimeDealBusiness } from "@/type/home";
import type { ServiceCategory } from "@/type/package";
import { useDiscoveryFavorites } from "@/features/consumer/discovery/favorites";

type PopularTimeDealListProps = {
  category: ServiceCategory;
  currentTime: number | null;
  deals: TimeDealBusiness[];
  isLoading: boolean;
  onSelectDeal: (deal: TimeDealBusiness) => void;
};

function getCountdown(endAt: string | null, currentTime: number | null) {
  if (!endAt || currentTime === null) return "--:--:--";

  const remainingMilliseconds = Math.max(
    new Date(endAt).getTime() - currentTime,
    0,
  );
  const totalSeconds = Math.floor(remainingMilliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

export default function PopularTimeDealList({
  category,
  currentTime,
  deals,
  isLoading,
  onSelectDeal,
}: PopularTimeDealListProps) {
  const likedBusinesses = useDiscoveryFavorites(state => state.businessIds);
  const toggleBusiness = useDiscoveryFavorites(state => state.toggleBusiness);
  const filteredDeals = deals.filter((deal) => deal.category === category);

  if (isLoading) {
    return (
      <p className="px-5 py-10 text-center text-sm text-page-text">
        타임딜을 불러오는 중입니다.
      </p>
    );
  }

  if (filteredDeals.length === 0) {
    return (
      <p className="px-5 py-10 text-center text-sm text-page-text">
        선택한 카테고리의 타임딜이 없습니다.
      </p>
    );
  }

  return (
    <ul aria-label="진행 중인 매장 타임딜 목록" className="space-y-4 px-4 py-6 min-[390px]:px-5">
      {filteredDeals.map((deal) => {
        const singleDeal = deal.deals.length === 1 ? deal.deals[0] : null;
        return (
        <li
          key={deal.businessId}
          data-business-id={deal.businessId}
          className="rounded-[18px] border border-page-border bg-white p-3 shadow-[0_2px_10px_rgb(0_0_0/10%)] min-[390px]:p-3.5"
        >
          <article
            role="button"
            tabIndex={0}
            aria-label={`${deal.businessName} 타임딜 상세 보기`}
            onClick={() => onSelectDeal(deal)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelectDeal(deal);
              }
            }}
            className="grid cursor-pointer grid-cols-[minmax(0,35%)_minmax(0,1fr)] gap-3 min-[390px]:gap-4"
          >
            <div className="relative aspect-square self-start overflow-hidden rounded-[14px] bg-[#f3f4f6]">
              {deal.imageUrl ? (
                <img
                  src={deal.imageUrl}
                  alt={deal.businessName}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full w-full place-items-center px-3 text-center text-[11px] font-medium text-[#a0a4ad]">
                  이미지 준비중
                </div>
              )}
              <span className="absolute left-2 top-2 rounded-md bg-accent px-2 py-1 text-xs font-bold text-white">
                {deal.discountLabel}
              </span>
              <span aria-label="마감까지 남은 시간" className="absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-black/70 px-2 py-1 text-xs font-black tabular-nums text-white min-[390px]:text-sm">
                {getCountdown(deal.endAt, currentTime)}
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="line-clamp-2 text-sm font-bold leading-snug text-page-heading">
                    {deal.businessName}
                  </p>
                  <p className="mt-1 text-xs text-page-text">
                    실시간 타임딜
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`${deal.businessName} ${likedBusinesses.includes(deal.businessId) ? "매장 찜 해제" : "매장 찜 추가"}`}
                  aria-pressed={likedBusinesses.includes(deal.businessId)}
                  onClick={(event) => { event.stopPropagation(); toggleBusiness(deal.businessId); }}
                  onKeyDown={(event) => event.stopPropagation()}
                  className={`shrink-0 text-2xl leading-none ${likedBusinesses.includes(deal.businessId) ? "text-accent" : "text-[#cfd2d8]"}`}
                >
                  {likedBusinesses.includes(deal.businessId) ? "♥" : "♡"}
                </button>
              </div>

              <p className="mt-2 line-clamp-2 text-base font-black leading-snug text-page-heading">
                {singleDeal ? singleDeal.serviceName : `진행 중인 타임딜 ${deal.deals.length}개`}
              </p>

              {singleDeal && <p className="mt-3 text-xs text-page-text line-through">
                {singleDeal.originalPrice.toLocaleString()}원
              </p>}
              <div className={`${singleDeal ? "mt-1" : "mt-3"} flex items-center justify-between gap-2`}>
                <p className="whitespace-nowrap text-lg font-black text-accent min-[390px]:text-xl">
                  {singleDeal ? <>{singleDeal.price.toLocaleString()} <span className="text-sm">원</span></> : deal.discountLabel}
                </p>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectDeal(deal);
                  }}
                  onKeyDown={(event) => event.stopPropagation()}
                  className="shrink-0 whitespace-nowrap rounded-full bg-accent px-3 py-2 text-xs font-bold text-white"
                >
                  예약하기
                </button>
              </div>

              <p className="mt-2 text-xs text-page-text">
                {singleDeal ? `${deal.remainingCapacity.toLocaleString()}자리 남음` : "시술을 선택하고 예약하세요"}
              </p>
            </div>
          </article>
        </li>
      ); })}
    </ul>
  );
}
