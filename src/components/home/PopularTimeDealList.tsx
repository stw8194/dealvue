import type { TimeDeal } from "@/type/home";
import { useNavigate } from "react-router-dom";
import type { ServiceCategory } from "@/type/package";

type PopularTimeDealListProps = {
  category: ServiceCategory;
  currentTime: number | null;
  deals: TimeDeal[];
  isLoading: boolean;
  onSelectDeal: (deal: TimeDeal) => void;
};

function getCountdown(endAt: string | null, currentTime: number | null) {
  if (!endAt || currentTime === null) return "00:00:00";

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
  const navigate = useNavigate();
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
    <ul className="space-y-5 px-4 py-6 min-[390px]:px-5">
      {filteredDeals.map((deal) => (
        <li
          key={deal.id}
          className="rounded-[18px] border border-page-border bg-white p-3 shadow-[0_2px_10px_rgb(0_0_0/10%)] min-[390px]:p-4"
        >
          <article
            role="button"
            tabIndex={0}
            aria-label={`${deal.businessName} ${deal.serviceName} 타임딜 상세 보기`}
            onClick={() => onSelectDeal(deal)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelectDeal(deal);
              }
            }}
            className="grid cursor-pointer grid-cols-[40%_1fr] gap-3 min-[390px]:grid-cols-[42%_1fr] min-[390px]:gap-4"
          >
            <div className="relative aspect-square overflow-hidden rounded-[14px] bg-[#f3f4f6]">
              {deal.imageUrl ? (
                <img
                  src={deal.imageUrl}
                  alt={deal.businessName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full w-full place-items-center px-3 text-center text-[11px] font-medium text-[#a0a4ad]">
                  이미지 준비중
                </div>
              )}
              <span className="absolute left-2 top-2 rounded-md bg-accent px-3 py-1 text-sm font-bold text-white">
                -{deal.discountRate}%
              </span>
              <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-md bg-black/70 px-2.5 py-1 text-base font-black text-white min-[390px]:px-3 min-[390px]:text-lg">
                {getCountdown(deal.endAt, currentTime)}
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="line-clamp-2 text-sm font-bold leading-snug text-page-heading min-[390px]:text-base">
                    {deal.businessName}
                  </p>
                  <p className="mt-1 text-xs text-page-text min-[390px]:text-sm">
                    실시간 타임딜
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="찜 목록 보기"
                  onClick={(event) => { event.stopPropagation(); navigate("/wishlist"); }}
                  onKeyDown={(event) => event.stopPropagation()}
                  className="text-2xl leading-none text-[#cfd2d8] min-[390px]:text-3xl"
                >
                  ♡
                </button>
              </div>

              <p className="mt-2 line-clamp-2 text-base font-black leading-snug text-page-heading min-[390px]:mt-3 min-[390px]:text-lg">
                {deal.serviceName}
              </p>

              <p className="mt-3 text-xs text-page-text line-through min-[390px]:mt-4 min-[390px]:text-sm">
                {deal.originalPrice.toLocaleString()}원
              </p>
              <div className="mt-1 flex items-end justify-between gap-2 min-[390px]:gap-3">
                <p className="text-xl font-black text-accent min-[390px]:text-2xl">
                  {deal.price.toLocaleString()}{" "}
                  <span className="text-base">원</span>
                </p>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    navigate(`/deal/${deal.id}`);
                  }}
                  onKeyDown={(event) => event.stopPropagation()}
                  className="shrink-0 rounded-full bg-accent px-3 py-2 text-xs font-bold text-white min-[390px]:px-5 min-[390px]:py-3 min-[390px]:text-sm"
                >
                  예약하기
                </button>
              </div>

              <p className="mt-2 text-xs text-page-text min-[390px]:mt-3 min-[390px]:text-sm">
                {deal.remaining_capacity.toLocaleString()}자리 남음
              </p>
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}
