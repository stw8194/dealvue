import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Clock,
  Copy,
  Heart,
  Image as ImageIcon,
  MapPin,
  Phone,
  Search,
  Share2,
  Store,
  UserRound,
  X,
} from "lucide-react";
import type { ConsumerBusiness } from "./business";
import type { ConsumerDeal } from "@/features/consumer/types";
import { SERVICE_CATEGORIES } from "@/data/packageOptions";
import { useDiscoveryFavorites } from "./favorites";
import { isOpenDeal, useDealTime } from "@/features/consumer/dealTiming";
import { DealKitManagementLink } from "./DealKitManager";
import { BusinessDealKits, BusinessTimeDeals } from "./BusinessPromotions";
import BusinessReviews from "./BusinessReviews";
import { BusinessMenuManagementLink } from "./BusinessMenuManager";
import BusinessBookingFlow from "@/features/consumer/booking/BusinessBookingFlow";

const tabs = ["홈", "시술 메뉴", "담당자", "사진", "리뷰", "정보"] as const;
type Tab = (typeof tabs)[number];
type Props = {
  business: ConsumerBusiness;
  deals: ConsumerDeal[];
  dealsLoading: boolean;
  dealsError: string | null;
  preview: boolean;
};
const box = "rounded-2xl border border-page-border bg-white p-5";

export default function BusinessProfile({
  business,
  deals,
  dealsLoading,
  dealsError,
  preview,
}: Props) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("홈");
  const [bookingOpen, setBookingOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("default");
  const [message, setMessage] = useState("");
  const [selectedService, setSelectedService] = useState<
    ConsumerBusiness["services"][number] | null
  >(null);
  const [photo, setPhoto] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const tabsRef = useRef<HTMLElement>(null);
  const liked = useDiscoveryFavorites((state) =>
    state.businessIds.includes(business.id),
  );
  const toggleBusiness = useDiscoveryFavorites((state) => state.toggleBusiness);
  const now = useDealTime();
  const activeDeals = dealsLoading || dealsError ? [] : deals.filter((deal) => isOpenDeal(deal, now));
  const images = [...new Set(business.images ?? [])];
  const phone = business.number?.replace(/[^\d+]/g, "");
  const categories = (business.categories ?? [])
    .map((id) => SERVICE_CATEGORIES.find((item) => item.id === id)?.label)
    .filter(Boolean);
  const services = business.services
    .filter((service) =>
      `${service.name} ${service.description ?? ""}`
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase()),
    )
    .sort((a, b) =>
      sort === "price"
        ? a.price - b.price
        : sort === "duration"
          ? (a.duration_minutes ?? Infinity) - (b.duration_minutes ?? Infinity)
          : a.id - b.id,
    );

  useEffect(() => {
    const dialog = dialogRef.current;
    if ((selectedService || photo !== null) && dialog && !dialog.open)
      dialog.showModal();
    if (!selectedService && photo === null && dialog?.open) dialog.close();
  }, [selectedService, photo]);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 3000);
    return () => clearTimeout(timer);
  }, [message]);
  const selectTab = (next: Tab) => {
    setTab(next);
    requestAnimationFrame(() =>
      tabsRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }),
    );
  };
  const copy = async (text: string, success: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setMessage(success);
    } catch {
      setMessage("복사하지 못했어요. 브라우저 권한을 확인해 주세요.");
    }
  };
  const share = async () => {
    if (!navigator.share)
      return copy(window.location.href, "매장 링크를 복사했어요.");
    try {
      await navigator.share({
        title: business.name,
        url: window.location.href,
      });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError"))
        setMessage("공유하지 못했어요. 다시 시도해 주세요.");
    }
  };
  const closeDialog = () => {
    setSelectedService(null);
    setPhoto(null);
  };
  const serviceCard = (service: ConsumerBusiness["services"][number]) => (
    <button
      type="button"
      key={service.id}
      onClick={() => setSelectedService(service)}
      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-page-border bg-white p-4 text-left hover:border-accent"
    >
      <span className="min-w-0 space-y-2">
        <span className="block font-semibold">{service.name}</span>
        {service.description && (
          <span className="line-clamp-2 text-sm text-page-text">
            {service.description}
          </span>
        )}
        <span className="flex flex-wrap items-center gap-3">
          <strong className="text-accent">
            {service.price.toLocaleString()}원
          </strong>
          {service.duration_minutes && (
            <span className="flex items-center gap-1 text-xs text-page-text">
              <Clock size={13} />
              {service.duration_minutes}분
            </span>
          )}
          {activeDeals.some((deal) => deal.serviceId === service.id) && (
            <span className="rounded-md bg-[#fff3f7] px-2 py-1 text-[10px] font-bold text-accent">
              타임딜
            </span>
          )}
        </span>
      </span>
      <ChevronRight className="shrink-0 text-gray-400" size={18} />
    </button>
  );
  const locationInfo = (
    <div className="space-y-4">
      <div className="flex gap-3">
        <MapPin className="mt-1 shrink-0 text-accent" size={19} />
        <div className="space-y-3">
          <p className="text-sm leading-6">
            {business.address || "주소 정보 준비 중"}
          </p>
          {business.address && (
            <div className="flex flex-wrap gap-3 text-xs font-semibold">
              <button
                type="button"
                onClick={() =>
                  void copy(business.address, "주소를 복사했어요.")
                }
                className="flex items-center gap-1 text-page-text"
              >
                <Copy size={13} />
                주소 복사
              </button>
              <a
                href={`https://map.kakao.com/link/search/${encodeURIComponent(business.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent"
              >
                지도에서 위치 보기 ↗
              </a>
            </div>
          )}
        </div>
      </div>
      {phone && (
        <a href={`tel:${phone}`} className="flex items-center gap-3 text-sm">
          <Phone size={18} className="text-accent" />
          {business.number}
        </a>
      )}
    </div>
  );

  return (
    <main className="min-h-screen bg-[#fafafb] pb-44 text-page-heading">
      <header className="flex h-14 items-center justify-between border-b border-page-border bg-white px-4">
        <button
          type="button"
          aria-label="뒤로 가기"
          onClick={() =>
            window.history.length > 1 ? navigate(-1) : navigate("/businesses")
          }
          className="p-2"
        >
          <ArrowLeft size={21} />
        </button>
        <span className="text-sm font-semibold">매장 상세</span>
        <button
          type="button"
          aria-label="매장 공유"
          onClick={() => void share()}
          className="p-2"
        >
          <Share2 size={19} />
        </button>
      </header>
      <div className="mx-auto max-w-3xl">
        <div className={`relative flex aspect-[16/8] items-center justify-center overflow-hidden bg-[#fff0f5] ${activeDeals.length ? "min-h-[300px]" : ""}`}>
          <div className="flex flex-col items-center gap-3 text-[#d795ae]">
            <Store size={48} strokeWidth={1.4} />
            <span className="text-xs">
              {images.length ? business.name : "매장 사진을 준비하고 있어요"}
            </span>
          </div>
          {images[0] && (
            <button
              type="button"
              aria-label="대표 사진 크게 보기"
              onClick={() => setPhoto(0)}
              className="absolute inset-0"
            >
              <img
                src={images[0]}
                alt={`${business.name} 대표 사진`}
                className="h-full w-full object-cover"
                onError={(event) => {
                  event.currentTarget.style.visibility = "hidden";
                }}
              />
            </button>
          )}
          <button
            type="button"
            onClick={() => selectTab("사진")}
            className={`absolute right-4 flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-1.5 text-xs text-white ${activeDeals.length ? "top-4" : "bottom-4"}`}
          >
            <ImageIcon size={14} />
            사진 {images.length}
          </button>
          <BusinessTimeDeals deals={activeDeals} now={now} />
        </div>
        <section className="space-y-4 bg-white px-5 py-6">
          <div className="flex flex-wrap gap-2">
            {categories.map((label) => (
              <span
                key={label}
                className="rounded-full bg-[#fff3f7] px-2.5 py-1 text-xs font-semibold text-accent"
              >
                {label}
              </span>
            ))}
          </div>
          <h1 className="text-2xl font-black tracking-tight">
            {business.name}
          </h1>
          <p className="flex items-start gap-1.5 text-sm text-page-text">
            <MapPin size={16} className="mt-0.5 shrink-0" />
            {business.address || "주소 정보 준비 중"}
          </p>
          <div className="grid grid-cols-3 divide-x divide-page-border rounded-2xl border border-page-border py-3 text-sm">
            {phone ? (
              <a
                href={`tel:${phone}`}
                className="flex flex-col items-center gap-1.5"
              >
                <Phone size={19} />
                전화
              </a>
            ) : (
              <span className="flex flex-col items-center gap-1.5 text-gray-400">
                <Phone size={19} />
                전화 미등록
              </span>
            )}
            {preview ? (
              <button
                type="button"
                aria-pressed={liked}
                onClick={() => toggleBusiness(business.id)}
                className="flex flex-col items-center gap-1.5"
              >
                <Heart
                  size={19}
                  className={liked ? "fill-accent text-accent" : ""}
                />
                {liked ? "매장 찜 해제" : "매장 찜 추가"}
              </button>
            ) : (
              <Link
                to="/wishlist"
                className="flex flex-col items-center gap-1.5"
              >
                <Heart size={19} />내 찜
              </Link>
            )}
            <button
              type="button"
              onClick={() => void share()}
              className="flex flex-col items-center gap-1.5"
            >
              <Share2 size={19} />
              공유
            </button>
          </div>
        </section>
        <nav
          ref={tabsRef}
          aria-label="매장 상세 메뉴"
          className="sticky top-0 z-30 flex overflow-x-auto border-y border-page-border bg-white px-2"
        >
          {tabs.map((item) => (
            <button
              type="button"
              key={item}
              aria-current={tab === item ? "page" : undefined}
              onClick={() => selectTab(item)}
              className={`min-w-fit flex-1 whitespace-nowrap border-b-2 px-3 py-4 text-sm font-semibold ${tab === item ? "border-accent text-accent" : "border-transparent text-page-text"}`}
            >
              {item}
            </button>
          ))}
        </nav>
        <div className="space-y-5 p-5">
          {tab === "정보" && !preview && (
            <div className="flex flex-wrap gap-2"><BusinessMenuManagementLink businessId={business.id} /><DealKitManagementLink businessId={business.id} /></div>
          )}
          {tab === "홈" && (
            <>
              <BusinessDealKits businessId={business.id} />
              <section className={box}>
                <h2 className="mb-3 text-lg font-bold">매장 소개</h2>
                <p className="whitespace-pre-wrap text-sm leading-7 text-page-text">
                  {business.description || "매장 소개를 준비하고 있어요."}
                </p>
              </section>
              <section className={box}>
                <h2 className="mb-4 text-lg font-bold">오시는 길</h2>
                {locationInfo}
              </section>
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold">제공 시술</h2>
                  <button
                    type="button"
                    onClick={() => selectTab("시술 메뉴")}
                    className="text-sm text-accent"
                  >
                    전체 보기
                  </button>
                </div>
                {business.services.length ? (
                  business.services.slice(0, 3).map(serviceCard)
                ) : (
                  <p className={`${box} text-sm text-page-text`}>
                    등록된 시술이 없어요.
                  </p>
                )}
              </section>
            </>
          )}
          {tab === "시술 메뉴" && (
            <section className="space-y-4">
              <h2 className="text-lg font-bold">
                시술 메뉴{" "}
                <span className="text-accent">{business.services.length}</span>
              </h2>
              <label className="flex items-center gap-2 rounded-xl border border-page-border bg-white p-3">
                <Search size={18} className="text-gray-400" />
                <input
                  type="search"
                  aria-label="시술 검색"
                  placeholder="원하는 시술을 검색해 보세요"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                />
              </label>
              <label className="flex justify-end gap-2 text-sm text-page-text">
                정렬
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                  className="bg-transparent"
                >
                  <option value="default">기본순</option>
                  <option value="price">낮은 가격순</option>
                  <option value="duration">짧은 소요시간순</option>
                </select>
              </label>
              {services.length ? (
                services.map(serviceCard)
              ) : (
                <p
                  className={`${box} py-10 text-center text-sm text-page-text`}
                >
                  검색된 시술이 없어요.
                </p>
              )}
              <p className="text-xs leading-5 text-page-text">
                모발 길이와 추가 시술에 따라 금액이 달라질 수 있어요. 예약 전
                매장에 확인해 주세요.
              </p>
            </section>
          )}
          {tab === "담당자" && (
            <section className="space-y-4">
              <h2 className="text-lg font-bold">
                함께할 담당자{" "}
                <span className="text-accent">{business.staff.length}</span>
              </h2>
              {business.staff.length ? (
                business.staff.map((staff) => (
                  <article
                    key={staff.id}
                    className={`${box} flex items-center gap-4`}
                  >
                    <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#fff3f7] text-[#d795ae]">
                      <UserRound size={30} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs text-accent">{staff.position}</p>
                      <h3 className="mt-1 font-bold">{staff.name}</h3>
                      <button
                        type="button"
                        onClick={() => selectTab("시술 메뉴")}
                        className="mt-2 text-xs text-page-text"
                      >
                        매장 시술 메뉴 보기 →
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <p className={`${box} text-sm text-page-text`}>
                  담당자 정보를 준비하고 있어요.
                </p>
              )}
              <p className="text-xs text-page-text">
                예약하기에서 시술자와 메뉴를 차례로 선택하면 가능한 시간을
                확인할 수 있어요.
              </p>
            </section>
          )}
          {tab === "사진" && (
            <section className="space-y-4">
              <h2 className="text-lg font-bold">
                매장 사진 <span className="text-accent">{images.length}</span>
              </h2>
              {images.length ? (
                <div className="grid grid-cols-2 gap-3">
                  {images.map((src, index) => (
                    <button
                      type="button"
                      key={src}
                      onClick={() => setPhoto(index)}
                      aria-label={`매장 사진 ${index + 1} 크게 보기`}
                      className="aspect-square overflow-hidden rounded-2xl bg-[#fff3f7]"
                    >
                      <img
                        src={src}
                        alt={`${business.name} 사진 ${index + 1}`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              ) : (
                <div className={`${box} py-12 text-center`}>
                  <ImageIcon className="mx-auto mb-3 text-gray-300" />
                  <p className="text-sm text-page-text">
                    등록된 매장 사진이 없어요.
                  </p>
                </div>
              )}
            </section>
          )}
          {tab === "리뷰" && (
            <BusinessReviews
              key={`${preview}:${business.id}`}
              businessId={business.id}
              preview={preview}
            />
          )}
          {tab === "정보" && (
            <>
              <section className={box}>
                <h2 className="mb-4 text-lg font-bold">위치 · 연락처</h2>
                {locationInfo}
              </section>
              <section className={box}>
                <h2 className="mb-3 text-lg font-bold">예약 · 이용 안내</h2>
                <ul className="space-y-3 text-sm leading-6 text-page-text">
                  <li>시술 메뉴에서 가격과 소요시간을 확인해 주세요.</li>
                  <li>
                    영업시간, 휴무일, 주차 가능 여부는 매장에 문의해 주세요.
                  </li>
                  <li>
                    시술 변경과 추가 비용은 방문 전 담당자와 상담해 주세요.
                  </li>
                  <li>예약 변경·취소는 내 예약내역에서 확인할 수 있어요.</li>
                </ul>
                <Link
                  to="/reservation"
                  className="mt-4 inline-block text-sm font-semibold text-accent"
                >
                  내 예약내역 보기 →
                </Link>
              </section>
            </>
          )}
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-16 z-40 border-t border-page-border bg-white/95 px-5 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-page-text">{business.name}</p>
            <p className="mt-1 text-sm font-bold">
              {business.services.length
                ? `${Math.min(...business.services.map((service) => service.price)).toLocaleString()}원부터`
                : "매장에 문의해 주세요"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setBookingOpen(true)}
            className="rounded-xl bg-accent px-6 py-3.5 text-sm font-bold text-white"
          >
            예약하기
          </button>
        </div>
      </div>
      {bookingOpen && (
        <BusinessBookingFlow
          business={business}
          preview={preview}
          onClose={() => setBookingOpen(false)}
        />
      )}
      {message && (
        <p
          role="status"
          className="fixed bottom-40 left-1/2 z-50 flex max-w-[90vw] -translate-x-1/2 items-center gap-2 rounded-xl bg-page-heading px-4 py-3 text-sm text-white shadow-lg"
        >
          <Check size={16} className="shrink-0" />
          {message}
        </p>
      )}
      <dialog
        ref={dialogRef}
        onCancel={(event) => {
          event.preventDefault();
          closeDialog();
        }}
        onClose={(event) => {
          if (!event.currentTarget.open) closeDialog();
        }}
        className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-3xl border-0 bg-white p-5 text-page-heading backdrop:bg-black/40"
        aria-label={selectedService ? "시술 상세" : "매장 사진 크게 보기"}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold">
            {selectedService ? "시술 상세" : "매장 사진"}
          </h2>
          <button
            type="button"
            aria-label="닫기"
            onClick={closeDialog}
            className="rounded-full bg-gray-100 p-2"
          >
            <X size={19} />
          </button>
        </div>
        {photo !== null && images[photo] && (
          <>
            <img
              src={images[photo]}
              alt={`${business.name} 사진 ${photo + 1}`}
              className="max-h-[60dvh] w-full rounded-xl object-contain"
            />
            <div className="mt-4 flex items-center justify-between text-sm">
              <button
                type="button"
                disabled={photo === 0}
                onClick={() => setPhoto(photo - 1)}
                className="p-2 disabled:opacity-30"
              >
                이전
              </button>
              <span>
                {photo + 1} / {images.length}
              </span>
              <button
                type="button"
                disabled={photo === images.length - 1}
                onClick={() => setPhoto(photo + 1)}
                className="p-2 disabled:opacity-30"
              >
                다음
              </button>
            </div>
          </>
        )}
        {selectedService && (
          <div className="space-y-5">
            <div>
              <h3 className="text-xl font-bold">{selectedService.name}</h3>
              <p className="mt-3 text-2xl font-black text-accent">
                {selectedService.price.toLocaleString()}원
              </p>
              {selectedService.duration_minutes && (
                <p className="mt-2 text-sm text-page-text">
                  예상 소요시간 {selectedService.duration_minutes}분
                </p>
              )}
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-page-text">
                {selectedService.description ||
                  "자세한 시술 내용은 매장에 문의해 주세요."}
              </p>
            </div>
          </div>
        )}
      </dialog>
    </main>
  );
}
