import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Clock3, Tag, Users, X } from "lucide-react";
import type { TimeDeal } from "@/type/home";

type TimeDealModalProps = {
  currentTime: number;
  deal: TimeDeal | null;
  onClose: () => void;
};

function getRemainingLabel(endAt: string | null, currentTime: number) {
  if (!endAt) return "마감 시간 미정";

  const remainingSeconds = Math.max(
    Math.floor((new Date(endAt).getTime() - currentTime) / 1000),
    0,
  );
  const days = Math.floor(remainingSeconds / 86400);
  const hours = Math.floor((remainingSeconds % 86400) / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;

  if (days > 0) return `${days}일 ${hours}시간 남음`;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
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

export default function TimeDealModal({
  currentTime,
  deal,
  onClose,
}: TimeDealModalProps) {
  useEffect(() => {
    if (!deal) return;

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
  }, [deal, onClose]);

  if (!deal) return null;

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
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white shadow-[0_16px_50px_rgb(0_0_0/24%)] sm:rounded-2xl"
      >
        <div className="relative aspect-[16/9] overflow-hidden bg-[#f3f4f6]">
          {deal.imageUrl ? (
            <img
              src={deal.imageUrl}
              alt={deal.businessName}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-sm font-medium text-gray-400">
              이미지 준비중
            </div>
          )}
          <button
            type="button"
            aria-label="타임딜 닫기"
            onClick={onClose}
            className="absolute right-3 top-3 grid h-10 w-10 cursor-pointer place-items-center rounded-full bg-black/55 text-white backdrop-blur"
          >
            <X className="h-5 w-5" strokeWidth={2.3} />
          </button>
          <span className="absolute bottom-3 left-3 rounded-lg bg-accent px-3 py-2 text-sm font-black text-white">
            {deal.discountRate}% 할인
          </span>
        </div>

        <div className="p-5">
          <p className="text-sm font-semibold text-page-text">
            {deal.businessName}
          </p>
          <h2
            id="time-deal-modal-title"
            className="mt-1 text-xl font-black text-page-heading"
          >
            {deal.serviceName}
          </h2>

          <div className="mt-5 grid gap-3 rounded-xl bg-[#fafafa] p-4 text-sm">
            <p className="flex items-center gap-3 text-page-text">
              <Clock3 className="h-5 w-5 shrink-0 text-accent" />
              <span className="font-bold text-page-heading">
                {getRemainingLabel(deal.endAt, currentTime)}
              </span>
              <span className="ml-auto text-xs">{formatEndAt(deal.endAt)} 마감</span>
            </p>
            <p className="flex items-center gap-3 text-page-text">
              <Users className="h-5 w-5 shrink-0 text-accent" />
              <span>{deal.remaining_capacity.toLocaleString()}자리 남음</span>
            </p>
            <p className="flex items-center gap-3 text-page-text">
              <Tag className="h-5 w-5 shrink-0 text-accent" />
              <span>한정 수량 타임딜</span>
            </p>
          </div>

          <div className="mt-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm text-gray-400 line-through">
                {deal.originalPrice.toLocaleString()}원
              </p>
              <p className="mt-1 text-2xl font-black text-accent">
                {deal.price.toLocaleString()}원
              </p>
            </div>
            <Link
              to={`/deal/${deal.id}`}
              onClick={onClose}
              className="h-12 min-w-28 cursor-pointer rounded-full bg-accent px-6 text-sm font-bold text-white hover:opacity-85"
            >
              상세 · 일정 확인
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
