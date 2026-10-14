import { Link, useParams } from "react-router-dom";
import { useConsumerCatalog } from "@/features/consumer/catalog";
import { usePreviewStore } from "@/features/consumer/preview";
import { EmptyState, Page } from "@/features/consumer/ui";
import { useDiscoveryFavorites } from "./favorites";
import { isOpenDeal, remainingLabel, useDealTime } from "@/features/consumer/dealTiming";

export function DealDetailPage() {
  const { dealId } = useParams();
  const { deals, loading, error } = useConsumerCatalog();
  const preview = usePreviewStore((state) => state.enabled);
  const liked = useDiscoveryFavorites((state) => state.dealIds.includes(Number(dealId)));
  const toggleDeal = useDiscoveryFavorites((state) => state.toggleDeal);
  const now = useDealTime();
  const deal = deals.find((item) => item.id === Number(dealId));
  if (loading) return <Page title="타임딜 상세"><p role="status">타임딜 정보를 불러오는 중입니다.</p></Page>;
  if (error) return <Page title="타임딜 상세"><EmptyState title="타임딜 정보를 불러오지 못했습니다" description={error} action={<button type="button" onClick={() => window.location.reload()} className="text-accent">다시 시도</button>} /></Page>;
  if (!deal) return <Page title="타임딜 상세"><EmptyState title="이 타임딜을 찾을 수 없습니다" description="판매가 종료되었거나 더 이상 제공하지 않는 타임딜입니다." action={<Link to="/search" className="text-accent">다른 타임딜 찾기</Link>} /></Page>;
  const closed = !isOpenDeal(deal, now);
  return (
    <Page title="타임딜 상세">
      <div className="space-y-5">
        {deal.imageUrl && <img src={deal.imageUrl} alt={deal.serviceName} className="aspect-video w-full rounded-xl object-cover" />}
        <section className="space-y-2">
          <Link to={`/business/${deal.businessId}`} className="text-sm text-accent underline underline-offset-4">{deal.businessName} · 매장 보기</Link>
          <h1 className="text-xl font-bold text-page-heading">{deal.serviceName}</h1>
          <p className="text-sm text-page-text">{deal.description || "상세 시술 설명은 준비 중입니다."}</p>
          <p className="text-sm text-page-text">{deal.address || "매장 주소 준비 중"}</p>
          {deal.originalPrice > deal.price && <p className="text-sm text-page-text line-through">{deal.originalPrice.toLocaleString()}원</p>}
          <p className="text-2xl font-bold text-accent">{deal.price.toLocaleString()}원</p>
          <p className="text-sm">{closed ? "예약 마감" : `${deal.remainingCapacity}자리 남음`}</p>
          <p className="text-sm">{remainingLabel(deal.endAt, now)}</p>
          <p className="text-sm text-page-text">마감: {new Date(deal.endAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</p>
        </section>
        <section className="rounded-xl border border-page-border p-4">
          <h2 className="font-semibold">예약 일정</h2>
          {deal.slots.length ? <><p className="mt-2 text-sm text-page-text">예약 단계에서 아래 일정 중 하나를 선택할 수 있습니다.</p><ul className="mt-2 space-y-1 text-sm">{deal.slots.map((slot) => <li key={slot}>{new Date(slot).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</li>)}</ul></> : <p className="mt-2 text-sm text-page-text">예약 가능한 일정은 준비 중입니다.</p>}
        </section>
        <section className="space-y-2 text-sm text-page-text">
          <h2 className="font-semibold text-page-heading">이용 안내</h2>
          <p>예약 단계에서 시술, 방문 시간, 금액을 확인해주세요. 추가 시술은 매장과 별도로 상담해주세요.</p>
          <p>취소 · 환불 안내는 예약 확인 화면에서 확인할 수 있습니다.</p>
        </section>
        <div className="flex gap-2">
          {preview ? <button type="button" aria-pressed={liked} onClick={() => toggleDeal(deal.id)} className="rounded-lg border border-page-border px-4 py-3 text-sm">{liked ? "찜 해제" : "찜 추가"}</button> : <Link to="/wishlist" className="rounded-lg border border-page-border px-4 py-3 text-sm">내 찜</Link>}
          {closed || !deal.serviceId ? <p className="flex-1 rounded-lg bg-gray-100 px-4 py-3 text-center text-sm text-page-text">{closed ? "마감된 타임딜입니다" : "예약할 시술을 준비 중입니다"}</p> : <Link to={`/checkout/${deal.id}`} className="flex-1 rounded-lg bg-accent px-4 py-3 text-center text-sm font-bold text-white">{preview ? "일정 선택 · 예약하기" : "예약 안내 확인"}</Link>}
        </div>
      </div>
    </Page>
  );
}
