import { useCallback, useEffect, useRef, useState } from "react";
import type { TimeDeal } from "@/type/home";
import { timeDealDiscount } from "@/features/consumer/dealSchedule";

type TimeDealBannerProps = {
  currentTime: number | null;
  deals: TimeDeal[];
  onSelectDeal: (deal: TimeDeal) => void;
};

function getRemainingTime(endAt: string | null, currentTime: number | null) {
  if (!endAt) {
    return { hours: "--", minutes: "--", seconds: "--" };
  }

  const remainingSeconds = Math.max(
    Math.floor((new Date(endAt).getTime() - (currentTime ?? Date.now())) / 1000),
    0,
  );

  return {
    hours: String(Math.floor(remainingSeconds / 3600)).padStart(2, "0"),
    minutes: String(Math.floor((remainingSeconds % 3600) / 60)).padStart(
      2,
      "0",
    ),
    seconds: String(remainingSeconds % 60).padStart(2, "0"),
  };
}

function TimeBox({ value, label }: { value: string; label: string }) {
  return (
    <span className="flex flex-col items-center gap-1">
      <span className="grid h-10 w-11 place-items-center rounded-xl bg-black/75 text-[21px] font-extrabold leading-none tabular-nums text-white">{value}</span>
      <span className="text-[9px] leading-none text-white/65">{label}</span>
    </span>
  );
}

function TimeDealSlide({
  currentTime,
  deal,
  priority,
  onSelectDeal,
}: {
  currentTime: number | null;
  deal: TimeDeal;
  priority: boolean;
  onSelectDeal: (deal: TimeDeal) => void;
}) {
  const remainingTime = getRemainingTime(deal.endAt, currentTime);

  const openDeal = () => onSelectDeal(deal);

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`${deal.businessName} ${deal.serviceName} 타임딜 상세 보기`}
      data-business-id={deal.businessId}
      data-deal-id={deal.id}
      onClick={openDeal}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openDeal();
        }
      }}
      className="hero-slide relative aspect-[1.68/1] w-full min-w-0 shrink-0 snap-center cursor-pointer overflow-hidden rounded-[20px] bg-[#262128]"
    >
      {deal.imageUrl ? (
        <img
          src={deal.imageUrl}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full select-none object-cover"
        />
      ) : (
        <div className="grid h-full w-full place-items-center text-sm font-semibold text-white/55">
          이미지 준비중
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-black/25" />

      <div className="absolute inset-x-4 top-4 flex items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-[11px] font-bold text-white"><span className="h-1.5 w-1.5 rounded-full bg-white/65" />LIVE</span>
        <span className="rounded-full bg-black/55 px-3 py-1.5 text-[10px] font-medium text-white">{deal.remaining_capacity.toLocaleString()}자리 남음</span>
      </div>
      <div className="absolute inset-x-4 bottom-7 text-white">
        <p className="truncate text-[12px] font-medium text-white/80">{deal.businessName}</p>
        <h2 className="mt-1 truncate text-[21px] font-extrabold leading-snug">{deal.serviceName}</h2>
        <div className="mt-3 flex items-end justify-between gap-2">
          <div className="flex shrink-0 gap-1.5">
            <TimeBox value={remainingTime.hours} label="시간" />
            <TimeBox value={remainingTime.minutes} label="분" />
            <TimeBox value={remainingTime.seconds} label="초" />
          </div>
          <div className="min-w-0 pb-3 text-right">
            <p className="text-[10px] text-white/65 line-through">{deal.originalPrice.toLocaleString()}원</p>
            <p className="mt-1 flex flex-wrap items-center justify-end gap-1 text-accent">
              <span className="rounded bg-accent px-1.5 py-0.5 text-[11px] font-bold text-white">{timeDealDiscount(deal)}%</span>
              <strong className="whitespace-nowrap text-[23px] font-extrabold leading-none tracking-[-.05em]">{deal.price.toLocaleString()}<span className="ml-0.5 text-[14px]">원</span></strong>
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function TimeDealBanner({
  currentTime,
  deals,
  onSelectDeal,
}: TimeDealBannerProps) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const activeIndexRef = useRef(0);
  const scrollFrameRef = useRef<number | null>(null);
  const pauseAutoUntilRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const scrollToDeal = useCallback((index: number) => {
    const carousel = carouselRef.current;
    const slide = carousel?.children.item(index) as HTMLElement | null;

    if (!carousel || !slide) return;

    activeIndexRef.current = index;
    setActiveIndex(index);
    carousel.scrollTo({ left: slide.offsetLeft, behavior: "smooth" });
  }, []);

  const pauseAutoAdvance = () => {
    pauseAutoUntilRef.current = Date.now() + 6000;
  };

  const handleScroll = () => {
    if (scrollFrameRef.current !== null) {
      window.cancelAnimationFrame(scrollFrameRef.current);
    }

    scrollFrameRef.current = window.requestAnimationFrame(() => {
      const carousel = carouselRef.current;
      if (!carousel) return;

      const slides = Array.from(carousel.children) as HTMLElement[];
      let closestIndex = 0;
      let closestDistance = Number.POSITIVE_INFINITY;

      slides.forEach((slide, index) => {
        const distance = Math.abs(slide.offsetLeft - carousel.scrollLeft);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });

      if (closestIndex !== activeIndexRef.current) {
        activeIndexRef.current = closestIndex;
        setActiveIndex(closestIndex);
      }
    });
  };

  useEffect(() => {
    if (deals.length <= 1) return;

    const timerId = window.setInterval(() => {
      if (Date.now() < pauseAutoUntilRef.current) return;

      const currentIndex =
        activeIndexRef.current < deals.length ? activeIndexRef.current : 0;
      scrollToDeal((currentIndex + 1) % deals.length);
    }, 4500);

    return () => window.clearInterval(timerId);
  }, [deals.length, scrollToDeal]);

  useEffect(
    () => () => {
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }
    },
    [],
  );

  if (deals.length === 0) return null;

  const visibleActiveIndex = activeIndex < deals.length ? activeIndex : 0;

  return (
    <section aria-label="할인율 높은 타임딜 배너" className="px-[18px] pb-1 pt-1">
      <div className="relative">
        <div
          ref={carouselRef}
          onScroll={handleScroll}
          onPointerDown={pauseAutoAdvance}
          onWheel={pauseAutoAdvance}
          className="hero-carousel flex snap-x snap-mandatory overflow-x-auto scroll-smooth overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {deals.map((deal, index) => (
            <TimeDealSlide
              key={deal.id}
              currentTime={currentTime}
              deal={deal}
              priority={index === 0}
              onSelectDeal={onSelectDeal}
            />
          ))}
        </div>

        {deals.length > 1 && (
          <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5 ">
            {deals.map((deal, index) => (
              <button
                key={deal.id}
                type="button"
                aria-label={`${index + 1}번째 타임딜 보기`}
                aria-current={visibleActiveIndex === index ? "true" : undefined}
                onClick={() => {
                  pauseAutoAdvance();
                  scrollToDeal(index);
                }}
                className={`h-1.5 cursor-pointer rounded-full transition-all ${
                  visibleActiveIndex === index
                    ? "w-1.5 bg-white"
                    : "w-1.5 bg-white/45"
                }`}
              />
            ))}
          </div>
        )}
      </div>
      <button type="button" onClick={() => onSelectDeal(deals[visibleActiveIndex])} className="mt-3 flex h-12 w-full items-center justify-center rounded-xl bg-accent text-[14px] font-bold text-white transition hover:brightness-95">지금 예약하고 할인 받기 →</button>
    </section>
  );
}
