import { Link } from "react-router-dom";
import { SERVICE_CATEGORIES } from "@/data/packageOptions";
import { useConsumerCatalog } from "@/features/consumer/catalog";
import { EmptyState, Page } from "@/features/consumer/ui";
import { DealKitList } from "./PackagePages";
import { DealCard } from "./DealCard";
import { isOpenDeal, useDealTime } from "@/features/consumer/dealTiming";

const menus = [
  ["내 주변", "/nearby"], ["딜키트", "/package"], ["예약내역", "/reservation"],
  ["찜", "/wishlist"], ["쿠폰", "/mypage/coupon"], ["놀이터", "/rewards"],
  ["오늘의 운세", "/fortune"], ["우리동네", "/community"], ["알림", "/notifications"],
  ["뷰티 콘텐츠", "/shorts"], ["마이페이지", "/mypage"], ["설정", "/settings"],
];

export function ConsumerHome() {
  const { deals: catalog, loading, error } = useConsumerCatalog();
  const now = useDealTime();
  const deals = catalog.filter((deal) => isOpenDeal(deal, now));
  return (
    <Page title="딜뷰">
      <div className="space-y-6">
        <section className="space-y-3">
          <h2 className="text-lg font-bold">나에게 맞는 뷰티 타임딜 찾기</h2>
          <Link to="/search" className="block rounded-xl border border-page-border p-4 text-sm text-page-text">매장명, 시술, 동네 검색 →</Link>
          <div className="flex flex-wrap gap-2">
            {SERVICE_CATEGORIES.map((category) => <Link key={category.id} to={`/search?category=${category.id}`} className="rounded-lg border border-page-border px-3 py-2 text-sm">{category.label}</Link>)}
          </div>
        </section>
        <nav aria-label="소비자 기능" className="grid grid-cols-3 gap-2">
          {menus.map(([label, path]) => <Link key={path} to={path} className="rounded-lg border border-page-border p-3 text-center text-sm">{label}</Link>)}
        </nav>
        <section className="space-y-3">
          <div className="flex items-center justify-between"><h2 className="font-bold">타임딜</h2><Link to="/search" className="text-sm text-accent">전체 보기</Link></div>
          {loading ? <p role="status">타임딜을 불러오는 중입니다.</p> : error ? <EmptyState title="타임딜을 불러오지 못했습니다" description={error} action={<button type="button" onClick={() => window.location.reload()} className="text-accent">다시 시도</button>} /> : deals.length ? <div className="space-y-3">{deals.slice(0, 4).map((deal) => <DealCard key={deal.id} deal={deal} />)}</div> : <EmptyState title="진행 중인 타임딜이 없습니다" description="다른 카테고리나 동네도 살펴보세요." action={<Link to="/nearby" className="text-accent">내 주변 보기</Link>} />}
        </section>
        <section className="-mx-4 space-y-3"><div className="flex items-center justify-between px-4"><h2 className="font-bold">딜키트 추천</h2><Link to="/package" className="text-xs text-gray-400">더보기 ›</Link></div><DealKitList horizontal /></section>
      </div>
    </Page>
  );
}
