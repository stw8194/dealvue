import { useCallback, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toHomeTimeDeals } from "@/api/home";
import { useConsumerCatalog } from "@/features/consumer/catalog";
import { useDealTime } from "@/features/consumer/dealTiming";
import { groupActiveTimeDeals, topDiscountDeals } from "@/features/consumer/dealSchedule";
import HomeHeader from "@/components/home/HomeHeader";
import TimeDealBanner from "@/components/home/TimeDealBanner";
import TimeDealModal from "@/components/home/TimeDealModal";
import PopularSearchBar from "@/components/home/PopularSearchBar";
import IconCategoryGrid from "@/components/home/IconCategoryGrid";
import MiniCategoryMenu from "@/components/home/MiniCategoryMenu";
import PopularTimeDealList from "@/components/home/PopularTimeDealList";
import DealKitRecommend from "@/components/home/DealKitRecommend";
import {
  HomeCouponBanner,
  HomePlaygroundBanner,
} from "@/components/home/HomePromoLinks";
import { SERVICE_CATEGORIES } from "@/data/packageOptions";
import type { TimeDeal, TimeDealBusiness } from "@/type/home";
import type { ServiceCategory } from "@/type/package";
import { Clock } from "lucide-react";

function isServiceCategory(category: string): category is ServiceCategory {
  return SERVICE_CATEGORIES.some((item) => item.id === category);
}

export default function Home() {
  return <ConnectedHome />;
}

function ConnectedHome() {
  const [searchParams] = useSearchParams();
  const { deals, loading: isTimeDealsLoading } = useConsumerCatalog();
  const currentTime = useDealTime();
  // The modal keeps the shop as it was when opened, so a deal ending while it is open is shown as closed.
  const [selection, setSelection] = useState<{ business: TimeDealBusiness; dealId?: number } | null>(null);
  const closeTimeDealModal = useCallback(() => setSelection(null), []);
  const selectTimeDealBusiness = useCallback((business: TimeDealBusiness) => setSelection({ business }), []);
  const selectedCategory = useMemo(() => {
    const categoryParam = searchParams.get("category");
    return categoryParam && isServiceCategory(categoryParam)
      ? categoryParam
      : SERVICE_CATEGORIES[0].id;
  }, [searchParams]);
  const activeTimeDeals = useMemo(
    () => groupActiveTimeDeals(toHomeTimeDeals(deals), currentTime),
    [currentTime, deals],
  );
  const homeTimeDeals = useMemo(() => toHomeTimeDeals(deals), [deals]);
  const bannerDeals = useMemo(
    () => topDiscountDeals(homeTimeDeals, currentTime, 5),
    [homeTimeDeals, currentTime],
  );
  const selectBannerDeal = useCallback((deal: TimeDeal) => {
    const business = activeTimeDeals.find(item => item.businessId === deal.businessId && item.deals.some(candidate => candidate.id === deal.id));
    setSelection({ business: business ?? { businessId: deal.businessId, businessName: deal.businessName, category: deal.category, imageUrl: deal.imageUrl, deals: [deal], endAt: deal.endAt ?? "", remainingCapacity: deal.remaining_capacity, discountLabel: "" }, dealId: deal.id });
  }, [activeTimeDeals]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-[480px] bg-page-background pb-20 md:pb-16">
      <HomeHeader />
      <TimeDealBanner
        currentTime={currentTime}
        deals={bannerDeals}
        onSelectDeal={selectBannerDeal}
      />
      <PopularSearchBar />
      <IconCategoryGrid />
      <MiniCategoryMenu />
      {(isTimeDealsLoading || activeTimeDeals.length > 0) && <><section className="px-5 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 whitespace-nowrap text-lg font-black text-page-heading md:text-xl">
              <Clock className="h-5 w-5 shrink-0 text-accent" />
              <span>실시간 인기 타임딜</span>
            </h2>
            <p className="mt-2 text-sm text-gray-400">
              지금 가장 핫한 타임딜을 확인해보세요!
            </p>
          </div>
          <Link
            to="/search"
            className="shrink-0 text-sm font-medium text-gray-400"
          >
            더보기 ›
          </Link>
        </div>
      </section>
      <PopularTimeDealList
        category={selectedCategory}
        currentTime={currentTime}
        deals={activeTimeDeals}
        isLoading={isTimeDealsLoading}
        onSelectDeal={selectTimeDealBusiness}
      />
      </>}
      <HomeCouponBanner />
      <section>
        <div className="flex items-center justify-between px-4 pt-4 min-[390px]:px-5">
          <h2 className="text-base font-semibold text-page-heading">
            딜키트 추천
          </h2>
          <Link to="/package" className="text-xs text-gray-400">
            더보기 ›
          </Link>
        </div>
        <DealKitRecommend />
      </section>
      <HomePlaygroundBanner />
      <TimeDealModal
        key={selection ? `${selection.business.businessId}:${selection.business.endAt}:${selection.dealId ?? "best"}` : "closed"}
        currentTime={currentTime}
        business={selection?.business ?? null}
        initialDealId={selection?.dealId}
        onClose={closeTimeDealModal}
      />
    </main>
  );
}
