import { useEffect, useState } from "react";
import { Check, Clock3, X } from "lucide-react";
import type { TimeDeal, TimeDealBusiness } from "@/type/home";
import { compareByDiscount, hasActiveSale, timeDealDiscount } from "@/features/consumer/dealSchedule";
import { useBookingNavigate } from "@/features/consumer/auth/loginReturn";

type TimeDealModalProps = {
  currentTime: number;
  business: TimeDealBusiness | null;
  /** A deal the customer already picked (e.g. from the banner); otherwise the best discount is preselected. */
  initialDealId?: number;
  onClose: () => void;
};

function getRemainingLabel(endAt: string | null, currentTime: number) {
  if (!endAt) return "마감 시간 미정";

  const remainingSeconds = Math.max(
    Math.floor((new Date(endAt).getTime() - currentTime) / 1000),
    0,
  );
  if (remainingSeconds === 0) return "마감";
  const days = Math.floor(remainingSeconds / 86400);
  const hours = Math.floor((remainingSeconds % 86400) / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;

  if (days > 0) return `${days}일 ${hours}시간 남음`;

  return `${[hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":")} 남음`;
}

function formatEndAt(endAt: string | null) {
  if (!endAt) return "마감 시간 미정";

  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(endAt));
}

function isRunning(deal: TimeDeal, now: number) {
  return hasActiveSale(deal.startAt, deal.endAt, deal.remaining_capacity, now);
}

function DealChoice({ deal, checked, running, onSelect }: { deal: TimeDeal; checked: boolean; running: boolean; onSelect: () => void }) {
  return (
    <label className={`relative flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-3.5 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/40 ${checked ? "border-accent bg-accent/5" : "border-page-border bg-white"} ${running ? "" : "opacity-50"}`}>
      <input type="radio" name="time-deal-choice" value={deal.id} checked={checked} onChange={onSelect} className="sr-only" />
      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${checked ? "border-accent bg-accent text-white" : "border-gray-300 text-transparent"}`}>
        <Check size={14} strokeWidth={3} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-page-heading">{deal.serviceName}</span>
        <span className="mt-0.5 block text-xs text-page-text">{running ? `${deal.remaining_capacity.toLocaleString()}자리 남음` : "마감된 타임딜"}</span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-xs text-gray-400 line-through">{deal.originalPrice.toLocaleString()}원</span>
        <span className="block whitespace-nowrap text-sm font-black">
          <span className="mr-1 text-accent">{timeDealDiscount(deal)}%</span>
          {deal.price.toLocaleString()}원
        </span>
      </span>
    </label>
  );
}

export default function TimeDealModal({
  currentTime,
  business,
  initialDealId,
  onClose,
}: TimeDealModalProps) {
  const bookingNavigate = useBookingNavigate();
  const deals = business ? [...business.deals].sort(compareByDiscount) : [];
  const [selectedId, setSelectedId] = useState<number | undefined>(() => initialDealId ?? deals[0]?.id);
  const open = business !== null;
  // The chosen deal stays chosen even after it ends; it is shown as closed instead of being swapped.
  const deal = deals.find((item) => item.id === selectedId) ?? deals[0];
  const running = deal ? isRunning(deal, currentTime) : false;
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!business || !deal) return null;

  return (
    <div
      role="presentation"
      onClick={onClose}
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 px-0 sm:items-center sm:px-4"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="time-deal-modal-title"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-[0_16px_50px_rgb(0_0_0/24%)] sm:rounded-3xl"
      >
        <div className="overflow-y-auto">
          <div className="relative aspect-[16/9] overflow-hidden bg-[#f3f4f6]">
            {business.imageUrl ? (
              <img
                src={business.imageUrl}
                alt={business.businessName}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="grid h-full w-full place-items-center text-sm font-medium text-gray-400">
                이미지 준비중
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <button
              type="button"
              aria-label="타임딜 닫기"
              onClick={onClose}
              className="absolute right-3 top-3 grid h-10 w-10 cursor-pointer place-items-center rounded-full bg-black/55 text-white backdrop-blur"
            >
              <X className="h-5 w-5" strokeWidth={2.3} />
            </button>
            <div className="absolute inset-x-5 bottom-4 text-white">
              <p className="text-sm font-semibold text-white/85">{business.businessName}</p>
              <h2 id="time-deal-modal-title" className="mt-1 truncate text-xl font-black">
                {deal.serviceName}
              </h2>
            </div>
          </div>

          <div className="space-y-5 p-5">
            <p className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm ${running ? "bg-accent/10 text-accent" : "bg-gray-100 text-page-text"}`}>
              <Clock3 className="h-5 w-5 shrink-0" />
              <span className="font-bold tabular-nums">{running ? getRemainingLabel(deal.endAt, currentTime) : "마감된 타임딜이에요"}</span>
              {running && <span className="ml-auto whitespace-nowrap text-xs opacity-80">{formatEndAt(deal.endAt)} 마감</span>}
            </p>

            {deals.length > 1 ? (
              <fieldset className="space-y-2">
                <legend className="mb-2 text-sm font-bold text-page-heading">
                  시술 선택 <span className="font-normal text-page-text">· {deals.length}개 타임딜</span>
                </legend>
                {deals.map((item) => (
                  <DealChoice
                    key={item.id}
                    deal={item}
                    checked={item.id === deal.id}
                    running={isRunning(item, currentTime)}
                    onSelect={() => setSelectedId(item.id)}
                  />
                ))}
              </fieldset>
            ) : (
              <p className="text-sm text-page-text">
                {running ? `한정 수량 타임딜 · ${deal.remaining_capacity.toLocaleString()}자리 남음` : "이 타임딜은 마감되었어요. 매장 상세에서 정상가로 예약할 수 있어요."}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-page-border bg-white px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="min-w-0">
            <p className="text-xs text-gray-400 line-through">{deal.originalPrice.toLocaleString()}원</p>
            <p className="whitespace-nowrap text-xl font-black">
              <span className="mr-1 text-accent">{timeDealDiscount(deal)}%</span>
              {deal.price.toLocaleString()}원
            </p>
          </div>
          <button
            type="button"
            disabled={!running}
            onClick={() => bookingNavigate(`/checkout/${deal.id}`)}
            className="h-12 shrink-0 rounded-full bg-accent px-7 text-sm font-bold text-white hover:opacity-85 disabled:bg-gray-200 disabled:text-gray-400"
          >
            {running ? "예약하기" : "마감"}
          </button>
        </div>
      </section>
    </div>
  );
}
