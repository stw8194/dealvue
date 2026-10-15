import { useCallback, useEffect, useRef, useState } from "react";
import type { TimeDealBusiness } from "@/type/home";

type TimeDealBannerProps = {
  currentTime: number | null;
  deals: TimeDealBusiness[];
  onSelectDeal: (deal: TimeDealBusiness) => void;
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
    <span className="flex w-[27%] flex-col items-center gap-[0.6vw] md:w-auto md:gap-1">
      <span className="grid aspect-[1.22/1] w-full place-items-center rounded-[2.4vw] bg-black/75 text-[clamp(13px,4.2vw,18px)] font-black leading-none text-white md:h-14 md:min-w-16 md:rounded-2xl md:px-4 md:text-3xl">
        {value}
      </span>
      <span className="text-[clamp(8px,2.4vw,11px)] leading-none text-white/75 md:text-xs">
        {label}
      </span>
    </span>
  );
}

function TimeDealSlide({
  currentTime,
  deal,
  onSelectDeal,
}: {
  currentTime: number | null;
  deal: TimeDealBusiness;
  onSelectDeal: (deal: TimeDealBusiness) => void;
}) {
  const remainingTime = getRemainingTime(deal.endAt, currentTime);
  const singleDeal = deal.deals.length === 1 ? deal.deals[0] : null;

  const openDeal = () => onSelectDeal(deal);

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`${deal.businessName} 타임딜 상세 보기`}
      data-business-id={deal.businessId}
      onClick={openDeal}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openDeal();
        }
      }}
      className="relative aspect-[1.78/1] w-full min-w-0 shrink-0 snap-center cursor-pointer overflow-hidden rounded-[6vw] bg-[#262128] shadow-[0_8px_24px_rgb(0_0_0/18%)] md:aspect-[1.68/1] md:rounded-[26px]"
    >
      {deal.imageUrl ? (
        <img
          src={deal.imageUrl}
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

      <div className="absolute inset-x-[4.5vw] top-[4vw] flex items-center justify-between md:inset-x-7 md:top-6">
        <span className="rounded-full bg-accent px-3 py-1 text-[clamp(10px,3vw,13px)] font-black text-white md:px-4 md:py-1.5 md:text-sm">
          LIVE
        </span>
        <span className="rounded-full bg-black/45 px-3 py-1 text-[clamp(9px,2.7vw,12px)] font-bold text-white backdrop-blur-sm md:px-4 md:py-1.5 md:text-sm">
          {singleDeal ? `${deal.remainingCapacity.toLocaleString()}자리 남음` : `타임딜 ${deal.deals.length}개`}
        </span>
      </div>

      <div className="absolute inset-x-[4.5vw] bottom-[5vw] text-white md:inset-x-7 md:bottom-7">
        <p className="truncate text-[clamp(10px,3vw,14px)] font-semibold text-white/80 md:text-base">
          {deal.businessName}
        </p>
        <h2 className="mt-[0.7vw] truncate text-[clamp(15px,4.5vw,21px)] font-black md:mt-1 md:text-2xl">
          {singleDeal ? singleDeal.serviceName : `진행 중인 타임딜 ${deal.deals.length}개`}
        </h2>

        <div className="mt-[2.2vw] flex items-end justify-between gap-3 md:mt-4">
          <div className="flex w-[48%] items-start justify-between md:w-auto md:gap-2">
            <TimeBox value={remainingTime.hours} label="시간" />
            <TimeBox value={remainingTime.minutes} label="분" />
            <TimeBox value={remainingTime.seconds} label="초" />
          </div>
          <div className="min-w-0 pb-[3vw] text-right md:pb-4">
            {singleDeal && <p className="truncate text-[clamp(9px,2.7vw,12px)] text-white/65 line-through md:text-sm">
              {singleDeal.originalPrice.toLocaleString()}원
            </p>}
            <p className="truncate text-[clamp(16px,5vw,24px)] font-black text-white md:text-3xl">
              {singleDeal ? `${singleDeal.price.toLocaleString()}원` : deal.discountLabel}
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
    <section aria-label="진행 중인 매장 타임딜 배너" className="px-[4vw] pb-4 pt-2 sm:px-5">
      <div className="relative">
        <div
          ref={carouselRef}
          onScroll={handleScroll}
          onPointerDown={pauseAutoAdvance}
          onWheel={pauseAutoAdvance}
          className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {deals.map((deal) => (
            <TimeDealSlide
              key={deal.businessId}
              currentTime={currentTime}
              deal={deal}
              onSelectDeal={onSelectDeal}
            />
          ))}
        </div>

        {deals.length > 1 && (
          <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5 md:bottom-4">
            {deals.map((deal, index) => (
              <button
                key={deal.businessId}
                type="button"
                aria-label={`${index + 1}번째 타임딜 보기`}
                aria-current={visibleActiveIndex === index ? "true" : undefined}
                onClick={() => {
                  pauseAutoAdvance();
                  scrollToDeal(index);
                }}
                className={`h-1.5 cursor-pointer rounded-full transition-all ${
                  visibleActiveIndex === index
                    ? "w-5 bg-white"
                    : "w-1.5 bg-white/45"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
