import ChoiceGroup from "@/components/common/ChoiceGroup";
import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { getSupabaseClient } from "@/api/supabase";
import { SPECIAL_PACKAGE_TYPES } from "@/data/packageOptions";
import { groupDealKits, useDealKits, type DealKit, type DealKitType } from "../dealKits";
import { EmptyState, Page } from "../ui";
import { PROVISIONAL_TRAVEL_MINUTES } from "../booking/packageSchedule";
import { BookingButton } from "@/features/consumer/auth/loginGate";

export function DealKitPrice({ kit }: { kit: DealKit }) {
  return <div className="space-y-1"><p className="text-sm text-page-text"><s>{kit.original_price.toLocaleString()}원</s></p><p className="font-bold text-accent">{discount(kit)}% · {kit.price.toLocaleString()}원</p></div>;
}
function discount(kit: DealKit) { return Math.floor((kit.original_price - kit.price) * 100 / kit.original_price); }

function PackagePhoto({ src, title, className }: { src?: string; title: string; className: string }) {
  const [failed, setFailed] = useState(false);
  return src && !failed ? <img src={src} alt={title} loading="lazy" className={className} onError={() => setFailed(true)} /> : <div className={`${className} grid place-items-center bg-pink-50 text-sm text-accent`}>{title}</div>;
}

export function DealKitList({ type, businessId, horizontal = false }: { type?: DealKitType; businessId?: number; horizontal?: boolean }) {
  return horizontal ? <CategoryRecommendations type={type} businessId={businessId} /> : <OfferCatalog type={type} businessId={businessId} />;
}

function CategoryRecommendations({ type, businessId }: { type?: DealKitType; businessId?: number }) {
  const horizontal = true;
  const { kits, loading, error } = useDealKits(businessId);
  const [purpose, setPurpose] = useState("");
  const groups = groupDealKits(kits).filter(({ template, lowest }) => (!type || (template?.type ?? lowest.type) === type) && (!purpose || (template?.purpose ?? lowest.purpose) === purpose));
  return <div className="space-y-4">
    {!horizontal && <p className="text-sm text-page-text">시간제한 없는 패키지 할인 · 판매 중인 등록 상품의 최저가입니다.</p>}
    {type === "special" && <ChoiceGroup label="목적 선택" value={purpose} onChange={setPurpose} options={[{ value: "", label: "전체" }, ...SPECIAL_PACKAGE_TYPES.map(item => ({ value: item.id, label: item.label }))]} />}
    {loading ? <p role="status" className="px-4 text-sm">딜키트를 불러오는 중입니다.</p> : error ? <EmptyState title="딜키트를 불러오지 못했습니다" description={error} /> : groups.length ? <div className={horizontal ? "flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-3 min-[390px]:scroll-px-5 min-[390px]:px-5 [scrollbar-width:none]" : "grid grid-cols-2 gap-3"}>
      {groups.map(({ key, template, lowest }) => {
        const title = template?.title ?? lowest.title;
        return <Link key={key} to={template ? `/package/template/${template.id}` : `/package/detail/${lowest.id}`} className={`overflow-hidden rounded-[20px] border border-[#f0e4e9] bg-white shadow-[0_1px_3px_#eadfe4] ${horizontal ? "w-[168px] shrink-0 snap-start" : "min-w-0"}`}>
          <div className="relative"><PackagePhoto src={template?.image_url} title={title} className="h-[112px] w-full object-cover" /><span className="absolute left-2 top-2 rounded bg-[#db7295] px-2 py-1 text-xs font-bold text-white">{discount(lowest)}%</span></div>
          <div className="space-y-1 px-2 py-3 text-center"><h2 className="truncate text-[13px] font-semibold text-page-heading">{title}</h2><p className="text-base font-bold tracking-wide text-[#d96690]">{lowest.price.toLocaleString()}원~</p></div>
        </Link>;
      })}
    </div> : <EmptyState title="판매 중인 딜키트가 없습니다" />}
  </div>;
}

export function PackageListPage({ type }: { type: DealKitType }) {
  return <Page title={type === "special" ? "목적별 딜키트" : type === "oneShop" ? "원샵 딜키트" : "샵 + 샵 딜키트"}><DealKitList type={type} /></Page>;
}

function offerPhoto(offer: DealKit) {
  const path = offer.business?.business_images?.find((image) => image.img_url?.trim())?.img_url;
  if (!path) return offer.template?.image_url;
  return /^https?:\/\//i.test(path) || path.startsWith("/") ? path : getSupabaseClient().storage.from(import.meta.env.VITE_SUPABASE_BUSINESS_IMAGES_BUCKET ?? "businesses").getPublicUrl(path).data.publicUrl;
}

export function OfferCard({ offer }: { offer: DealKit }) {
  return <Link to={`/package/detail/${offer.id}`} className="overflow-hidden rounded-2xl border border-page-border bg-white">
    <div className="relative"><PackagePhoto src={offerPhoto(offer)} title={offer.title} className="aspect-[3/2] w-full object-cover" /></div>
    <div className="space-y-2 p-3"><p className="text-xs font-bold text-page-text">{offer.business?.name ?? "매장 정보 준비 중"}</p><span className="inline-block rounded bg-pink-50 px-2 py-1 text-[10px] text-accent">{offer.template?.title ?? "딜키트"}</span><h2 className="text-sm font-bold leading-5">{offer.title}</h2><p className="line-clamp-2 text-xs leading-5 text-page-text">{offer.items.join(" · ")}</p><p className="text-xs text-gray-400"><s>{offer.original_price.toLocaleString()}원</s></p><p className="flex flex-wrap items-baseline gap-x-2 text-base font-bold"><span className="text-accent">{discount(offer)}%</span><span>{offer.price.toLocaleString()}원</span></p></div>
  </Link>;
}

function OfferCatalog({ type, businessId, templateId }: { type?: DealKitType; businessId?: number; templateId?: string }) {
  const { kits, loading, error } = useDealKits(businessId);
  const [params, setParams] = useSearchParams();
  const selected = params.get("category") ?? templateId ?? "";
  const sort = params.get("sort") ?? "newest";
  const available = kits.filter((kit) => kit.active && (!type || kit.type === type));
  const categories = groupDealKits(available).flatMap((group) => group.template ? [group.template] : []);
  const visible = available.filter((kit) => !selected || kit.template_id === Number(selected)).sort((a, b) => sort === "price" ? a.price - b.price || a.id - b.id : sort === "discount" ? discount(b) - discount(a) || a.id - b.id : b.id - a.id);
  const categoryPath = type ? `/package/${type === "oneShop" ? "one-shop" : type === "shopShop" ? "shop-shop" : "special"}` : "/package";
  return <div className="space-y-5">
    <nav aria-label="딜키트 상품종류" className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]"><Link to={categoryPath} aria-current={!selected ? "page" : undefined} className={`shrink-0 rounded-full border px-4 py-2 text-sm ${!selected ? "border-accent bg-accent text-white" : "border-page-border"}`}>전체</Link>{categories.map((category) => <Link key={category.id} to={`${categoryPath}?category=${category.id}`} aria-current={selected === String(category.id) ? "page" : undefined} className={`shrink-0 rounded-full border px-4 py-2 text-sm ${selected === String(category.id) ? "border-accent bg-accent text-white" : "border-page-border"}`}>{category.title}</Link>)}</nav>
    {loading ? <p role="status">패키지 상품을 불러오는 중입니다.</p> : error ? <EmptyState title="딜키트를 불러오지 못했습니다" description={error} /> : <><div className="space-y-3"><p className="text-sm">상품 <strong>{visible.length}</strong>개</p><ChoiceGroup label="상품 정렬" value={sort} onChange={value => { const next = new URLSearchParams(params); next.set("sort", value); setParams(next); }} options={[{ value: "newest", label: "최신 등록순" }, { value: "price", label: "낮은 가격순" }, { value: "discount", label: "높은 할인율순" }]} /></div>{visible.length ? <div className="grid grid-cols-2 gap-3">{visible.map((offer) => <OfferCard key={offer.id} offer={offer} />)}</div> : <EmptyState title="판매 중인 딜키트가 없습니다" description="다른 상품종류를 선택해 보세요." />}</>}
  </div>;
}

export function PackageDetailPage() {
  const { templateId } = useParams();
  return templateId ? <Page title="딜키트 상품"><OfferCatalog templateId={templateId} /></Page> : <PackageOfferDetail />;
}

function PackageOfferDetail() {
  const { packageId } = useParams();
  const { kits, loading, error } = useDealKits();
  const offer = kits.find((kit) => kit.id === Number(packageId));
  const template = offer?.template;
  return <Page title="딜키트 상세">{loading ? <p role="status">딜키트를 불러오는 중입니다.</p> : error ? <EmptyState title="딜키트를 불러오지 못했습니다" description={error} /> : !offer ? <EmptyState title="판매 중인 딜키트를 찾을 수 없습니다" action={<Link to="/package">딜키트 목록으로</Link>} /> : <div className="space-y-5">
    <PackagePhoto src={offerPhoto(offer)} title={offer.title} className="aspect-[3/2] w-full rounded-2xl object-cover" />
    <Link to={`/business/${offer.business_id}`} className="block text-sm font-bold">{offer.business?.name ?? "매장 정보 준비 중"} ›</Link><p className="text-xs text-page-text">{offer.business?.address}</p>
    {template && <Link to={`/package/template/${template.id}`} className="inline-block rounded-full bg-pink-50 px-3 py-1 text-xs text-accent">{template.title}</Link>}
    <h1 className="text-xl font-bold">{offer.title}</h1><DealKitPrice kit={offer} /><p className="text-xs text-page-text">시간제한 없는 패키지 할인</p>
    <p className="whitespace-pre-wrap text-sm leading-6">{offer.description}</p>
    <section className="space-y-3 rounded-2xl border border-page-border p-4"><h2 className="font-bold">이 상품의 서비스 구성</h2><ul className="list-inside list-disc space-y-2 text-sm">{offer.items.map((item, index) => <li key={index}>{item}</li>)}</ul></section>
    {offer.legs?.length ? <section className="space-y-2 rounded-2xl border border-page-border p-4"><h2 className="font-bold">방문 일정</h2><ol className="space-y-2 text-sm">{offer.legs.map((leg, index) => <li key={`${leg.businessId}-${index}`}><strong>{index + 1}. {leg.businessName}</strong> · {leg.serviceNames.join(" + ")}<span className="block text-xs text-page-text">시술 약 {leg.displayMinutes}분 · 예약 점유 {leg.durationMinutes}분</span></li>)}</ol>{offer.legs.length > 1 && <p className="text-xs text-page-text">매장 간 이동시간은 {PROVISIONAL_TRAVEL_MINUTES}분 기준(임시)으로 각 매장 예약을 이어서 잡습니다.</p>}</section> : null}
    {offer.legs?.length ? <BookingButton to={`/checkout/kit/${offer.id}`} className="block w-full rounded-xl bg-accent p-3 text-center text-sm font-bold text-white">일정 선택 · 예약하기</BookingButton> : <p className="text-sm text-page-text">이 딜키트는 구성 시술이 매장 메뉴와 연결되어 있지 않아 앱에서 예약할 수 없어요. 매장에 문의해 주세요.</p>}
  </div>}</Page>;
}
