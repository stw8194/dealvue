import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { requestTimeDeals } from "@/api/home";
import HomeHeader from "@/components/home/HomeHeader";
import TimeDealBanner from "@/components/home/TimeDealBanner";
import TimeDealModal from "@/components/home/TimeDealModal";
import PopularSearchBar from "@/components/home/PopularSearchBar";
import IconCategoryGrid from "@/components/home/IconCategoryGrid";
import MiniCategoryMenu from "@/components/home/MiniCategoryMenu";
import PopularTimeDealList from "@/components/home/PopularTimeDealList";
import DealKitRecommend from "@/components/home/DealKitRecommend";
import MiniAdBanner from "@/components/home/MiniAdBanner";
import {
  HomeCouponBanner,
  HomePlaygroundBanner,
} from "@/components/home/HomePromoLinks";
import { SERVICE_CATEGORIES } from "@/data/packageOptions";
import type { TimeDeal } from "@/type/home";
import type { ServiceCategory } from "@/type/package";
import { Clock } from "lucide-react";

function getDealTime(deal: TimeDeal) {
  return deal.endAt ? new Date(deal.endAt).getTime() : Number.POSITIVE_INFINITY;
}

function isActiveTimeDeal(deal: TimeDeal, currentTime: number) {
  if (!deal.endAt) return true;

  const endTime = new Date(deal.endAt).getTime();
  return Number.isFinite(endTime) && endTime > currentTime;
}

function isServiceCategory(category: string): category is ServiceCategory {
  return SERVICE_CATEGORIES.some((item) => item.id === category);
}

export default function Home() {
  const [searchParams] = useSearchParams();
  const [timeDeals, setTimeDeals] = useState<TimeDeal[]>([]);
  const [isTimeDealsLoading, setIsTimeDealsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [selectedTimeDeal, setSelectedTimeDeal] = useState<TimeDeal | null>(null);
  const closeTimeDealModal = useCallback(() => setSelectedTimeDeal(null), []);
  const selectedCategory = useMemo(() => {
    const categoryParam = searchParams.get("category");
    return categoryParam && isServiceCategory(categoryParam)
      ? categoryParam
      : SERVICE_CATEGORIES[0].id;
  }, [searchParams]);
  const activeTimeDeals = useMemo(
    () => timeDeals.filter((deal) => isActiveTimeDeal(deal, currentTime)),
    [currentTime, timeDeals],
  );
  const bannerDeals = useMemo(
    () =>
      [...activeTimeDeals]
        .sort((a, b) => getDealTime(a) - getDealTime(b))
        .slice(0, 5),
    [activeTimeDeals],
  );
  const visibleSelectedTimeDeal =
    selectedTimeDeal && isActiveTimeDeal(selectedTimeDeal, currentTime)
      ? selectedTimeDeal
      : null;

  useEffect(() => {
    let isCurrent = true;

    async function loadTimeDeals() {
      setIsTimeDealsLoading(true);

      try {
        const deals = await requestTimeDeals();
        if (isCurrent) {
          setTimeDeals(deals);
        }
      } catch (error) {
        console.error(error);
        if (isCurrent) {
          setTimeDeals([]);
        }
      } finally {
        if (isCurrent) {
          setIsTimeDealsLoading(false);
        }
      }
    }

    loadTimeDeals();

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    const timerId = window.setInterval(() => setCurrentTime(Date.now()), 1000);

    return () => window.clearInterval(timerId);
  }, []);

  return (
    <main className="min-h-screen w-full bg-page-background pb-20 md:pb-16">
      <HomeHeader />
      <TimeDealBanner
        currentTime={currentTime}
        deals={bannerDeals}
        onSelectDeal={setSelectedTimeDeal}
      />
      <PopularSearchBar />
      <IconCategoryGrid />
      <MiniCategoryMenu />
      <section className="px-5 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 whitespace-nowrap text-lg font-black text-page-heading md:text-xl">
              <Clock className="h-5 w-5 shrink-0 text-accent" />
              <span>실시간 인기 타임딜</span>
            </h2>
            <p className="mt-2 text-sm text-gray-400">
              지금 가장 핫한 딜을 확인해보세요!
            </p>
          </div>
          <button className="shrink-0 text-sm font-medium text-gray-400">
            더보기 ›
          </button>
        </div>
      </section>
      <PopularTimeDealList
        category={selectedCategory}
        currentTime={currentTime}
        deals={activeTimeDeals}
        isLoading={isTimeDealsLoading}
        onSelectDeal={setSelectedTimeDeal}
      />
      <HomeCouponBanner />
      <section>
        <h2 className="px-4 pt-4 text-base font-semibold text-page-heading">
          딜키트 추천
        </h2>
        <DealKitRecommend />
      </section>
      <HomePlaygroundBanner />
      <MiniAdBanner />
      <TimeDealModal
        currentTime={currentTime}
        deal={visibleSelectedTimeDeal}
        onClose={closeTimeDealModal}
      />
    </main>
  );
}
