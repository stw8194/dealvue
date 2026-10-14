import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { MapPin, Store } from "lucide-react";
import { hasActiveNearbyDeal, type NearbyBusiness } from "@/api/nearby";
import { SERVICE_CATEGORIES } from "@/data/packageOptions";
import { useSheetSnap } from "./useSheetSnap";

type Props = {
  businesses: NearbyBusiness[];
  loading: boolean;
  error: string | null;
  scrollRequest: number;
  selectedId?: number;
  now: number;
  onRetry: () => void;
};

export default function NearbyResultsSheet({ businesses, loading, error, scrollRequest, selectedId, now, onRetry }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  useSheetSnap(scrollRef, spacerRef);
  const timeDealBusinesses = businesses.filter((business) => hasActiveNearbyDeal(business, now));
  const regularBusinesses = businesses.filter((business) => !hasActiveNearbyDeal(business, now));

  useEffect(() => {
    if (!scrollRequest) return;
    scrollRef.current?.scrollTo({
      top: spacerRef.current?.offsetHeight ?? 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  }, [scrollRequest]);

  useEffect(() => {
    if (selectedId === undefined) return;
    sectionRef.current?.querySelector<HTMLElement>(`[data-business-id="${selectedId}"]`)
      ?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [selectedId]);

  return <>
    {/* Reserve the same space even when the result list is empty. */}
    <div aria-hidden="true" className="h-[clamp(240px,34dvh,290px)] shrink-0" />
    <div
      ref={scrollRef}
      aria-label="주변 매장 스크롤 목록"
      className="pointer-events-none absolute inset-0 z-30 overflow-y-auto overscroll-y-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {/* The transparent spacer preserves map interaction. Native gestures move
          the sheet continuously; useSheetSnap settles it after scrolling ends. */}
      <div ref={spacerRef} aria-hidden="true" className="h-[max(0px,calc(100%-clamp(240px,34dvh,290px)))]" />
      <section
        ref={sectionRef}
        tabIndex={0}
        aria-labelledby="nearby-results-title"
        className="pointer-events-auto relative min-h-full rounded-t-3xl bg-white pb-5 shadow-[0_-5px_24px_rgb(0_0_0/8%)] outline-offset-[-3px]"
      >
        <div className="sticky top-0 z-10 rounded-t-3xl bg-white px-5 pb-3 pt-3">
          <div aria-hidden="true" className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-300" />
          <div className="flex items-center justify-between gap-3">
            <h2 id="nearby-results-title" className="text-base font-bold text-page-heading">주변 매장 <span className="text-accent">{businesses.length}</span>곳</h2>
            <span className="text-[11px] text-page-text">스크롤해서 둘러보세요</span>
          </div>
          <div className="mt-3 flex gap-3 text-[11px] text-page-text">
            <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-[#da6b91]" />타임딜</span>
            <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-[#e8acbf]" />일반 매장</span>
            <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-[#1677f2]" />내 위치</span>
          </div>
        </div>
        <div className="px-5">
          {loading ? <p role="status" className="py-8 text-center text-sm text-page-text">주변 매장을 검색하고 있어요.</p>
            : error ? <div role="alert" className="py-5 text-center"><p className="text-sm text-page-text">매장을 불러오지 못했어요.</p><button type="button" onClick={onRetry} className="mt-2 text-sm font-semibold text-accent">다시 검색</button></div>
            : businesses.length === 0 ? <div className="flex flex-col items-center gap-2 py-5 text-center"><MapPin className="text-gray-300" size={28} /><p className="font-semibold text-page-heading">검색결과 없음</p><p className="text-xs text-page-text">다른 카테고리를 선택하거나 지도를 이동해 다시 검색해 주세요.</p></div>
            : <div className="space-y-5">
              {timeDealBusinesses.length > 0 && <ul aria-label="타임딜 매장" className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {timeDealBusinesses.map((business) => <li key={business.id} data-business-id={business.id} className="w-[136px] shrink-0 snap-start">
                  <Link to={`/business/${business.id}`} className={`block overflow-hidden rounded-2xl border bg-white shadow-sm ${selectedId === business.id ? "border-accent ring-2 ring-accent/20" : "border-gray-100"}`}>
                    <div className="relative flex h-20 items-center justify-center bg-[#fff1f5]">
                      <Store className="text-[#dea2b6]" size={24} />
                      {business.imageUrl && <img src={business.imageUrl} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} />}
                      <span className="absolute left-1.5 top-1.5 rounded bg-[#da6b91] px-1.5 py-0.5 text-[10px] font-semibold text-white">타임딜</span>
                    </div>
                    <div className="space-y-1 p-2"><h3 className="truncate text-xs font-bold text-page-heading">{business.name}</h3><p className="truncate text-[10px] text-page-text">{business.categories.map((category) => SERVICE_CATEGORIES.find((item) => item.id === category)?.label).filter(Boolean).join(" · ") || "뷰티 매장"}</p></div>
                  </Link>
                </li>)}
              </ul>}
              {regularBusinesses.length > 0 && <ul aria-label="일반 매장" className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {regularBusinesses.map((business) => <li key={business.id} data-business-id={business.id} className="min-w-0">
                <Link to={`/business/${business.id}`} className={`block overflow-hidden rounded-2xl border bg-white shadow-sm ${selectedId === business.id ? "border-accent ring-2 ring-accent/20" : "border-gray-100"}`}>
                  <div className="relative flex h-24 items-center justify-center bg-[#fff1f5]">
                    <Store className="text-[#dea2b6]" size={30} />
                    {business.imageUrl && <img src={business.imageUrl} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} />}
                  </div>
                  <div className="space-y-1 p-2.5">
                    <h3 className="truncate text-xs font-bold text-page-heading">{business.name}</h3>
                    <p className="truncate text-[11px] text-page-text">{business.categories.map((category) => SERVICE_CATEGORIES.find((item) => item.id === category)?.label).filter(Boolean).join(" · ") || "뷰티 매장"}</p>
                    <p className="line-clamp-2 text-xs text-page-text">{business.address}</p>
                  </div>
                </Link>
              </li>)}
            </ul>}
            </div>}
        </div>
      </section>
    </div>
  </>;
}
