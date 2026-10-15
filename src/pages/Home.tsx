import { useCallback, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toHomeTimeDeals } from "@/api/home";
import { useConsumerCatalog } from "@/features/consumer/catalog";
import { useDealTime } from "@/features/consumer/dealTiming";
import { groupActiveTimeDeals } from "@/features/consumer/dealSchedule";
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
import type { TimeDealBusiness } from "@/type/home";
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
  const [selection, setSelection] = useState<{ businessId: number; endAt: string } | null>(null);
  const closeTimeDealModal = useCallback(() => setSelection(null), []);
  const selectTimeDealBusiness = useCallback((business: TimeDealBusiness) => setSelection({ businessId: business.businessId, endAt: business.endAt }), []);
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
  const bannerDeals = useMemo(
    () =>
      activeTimeDeals.slice(0, 5),
    [activeTimeDeals],
  );
  const visibleSelectedTimeDeal = activeTimeDeals.find(business => business.businessId === selection?.businessId && business.endAt === selection.endAt) ?? null;

  return (
    <main className="mx-auto min-h-screen w-full max-w-[480px] bg-page-background pb-20 md:pb-16">
      <HomeHeader />
      <TimeDealBanner
        currentTime={currentTime}
        deals={bannerDeals}
        onSelectDeal={selectTimeDealBusiness}
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
        <div className="flex items-center justify-between px-4 pt-4">
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
        key={selection ? `${selection.businessId}:${selection.endAt}` : "closed"}
        currentTime={currentTime}
        business={visibleSelectedTimeDeal}
        onClose={closeTimeDealModal}
      />
    </main>
  );
}
