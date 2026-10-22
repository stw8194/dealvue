import { useEffect, useRef, useState } from "react";
import { Check, ChevronRight, Gamepad2, Gift, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useCouponStore, WELCOME_COUPON } from "@/features/consumer/coupons";
import {
  requestWelcomeCouponClaim,
  requestWelcomeCouponStatus,
} from "@/api/coupon";

type CouponButtonState = "checking" | "available" | "claiming" | "claimed";

export function HomeCouponBanner() {
  const effectTimer = useRef<number | null>(null);
  const [buttonState, setButtonState] = useState<CouponButtonState>("checking");
  const [message, setMessage] = useState("");
  const [showEffect, setShowEffect] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    const claimedHere = useCouponStore.getState().coupons.some((coupon) => coupon.id === WELCOME_COUPON.id);
    requestWelcomeCouponStatus()
      .then((hasClaimed) => {
        if (!isCurrent) return;
        // A coupon claimed on the account is also usable at this device's checkout.
        if (hasClaimed) void useCouponStore.getState().claimWelcome();
        setButtonState(hasClaimed || claimedHere ? "claimed" : "available");
      })
      .catch(() => {
        if (!isCurrent) return;
        setButtonState(claimedHere ? "claimed" : "available");
      });

    return () => {
      isCurrent = false;
      if (effectTimer.current !== null) {
        window.clearTimeout(effectTimer.current);
      }
    };
  }, []);

  const handleCouponClaim = async () => {
    if (buttonState !== "available") return;

    try {
      setMessage("");
      setButtonState("claiming");
      // Guests get the coupon on this device; signed-in users also get it on their account.
      const result = await requestWelcomeCouponClaim().catch(() => null);
      const claimedNow = await useCouponStore.getState().claimWelcome();

      setButtonState("claimed");
      setMessage("쿠폰함에 담았어요.");

      if (claimedNow || (result && !result.alreadyClaimed)) {
        setShowEffect(true);
        effectTimer.current = window.setTimeout(() => {
          setShowEffect(false);
          effectTimer.current = null;
        }, 1200);
      }
    } catch (error) {
      setButtonState("available");
      setMessage(
        error instanceof Error ? error.message : "쿠폰을 받지 못했습니다.",
      );
    }
  };

  const isButtonDisabled = buttonState !== "available";
  const buttonLabel =
    buttonState === "checking"
      ? "확인 중"
      : buttonState === "claiming"
        ? "받는 중"
        : buttonState === "claimed"
          ? "받기 완료"
          : "쿠폰 받기";

  return (
    <section className="px-4 py-5 min-[390px]:px-5">
      <article className="grid min-h-36 grid-cols-[1fr_auto] items-center gap-4 overflow-hidden rounded-2xl border border-page-border border-l-4 border-l-accent bg-white px-5 py-5 shadow-[0_3px_14px_rgb(0_0_0/8%)]">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-accent">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-pink-50">
              <Gift className="h-5 w-5" strokeWidth={2.2} />
            </span>
            <span className="rounded-full bg-pink-50 px-3 py-1 text-xs font-bold">
              첫방문 혜택
            </span>
          </div>
          <h2 className="mt-4 text-xl font-black text-page-heading">
            3,000원 쿠폰팩
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            15,000원 이상 예약 시 사용 가능
          </p>
          {message && (
            <p role="status" className="mt-2 text-sm font-bold text-accent">
              {message}
            </p>
          )}
        </div>

        <button
          type="button"
          disabled={isButtonDisabled}
          onClick={() => void handleCouponClaim()}
          className={`relative flex h-12 min-w-28 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full px-5 text-sm font-bold text-white transition-all disabled:cursor-default ${
            buttonState === "claimed"
              ? "bg-gray-400 shadow-none"
              : "bg-accent shadow-[0_4px_10px_rgb(230_91_138/25%)] hover:opacity-85"
          }`}
        >
          {buttonState === "claimed" && <Check className="h-4 w-4" />}
          {buttonLabel}
          {showEffect && (
            <>
              <Sparkles className="absolute -left-3 -top-5 h-6 w-6 animate-ping text-accent" />
              <Sparkles className="absolute -bottom-5 -right-2 h-5 w-5 animate-bounce text-accent" />
            </>
          )}
        </button>
      </article>
    </section>
  );
}

export function HomePlaygroundBanner() {
  return (
    <section className="px-4 py-7 min-[390px]:px-5">
      <Link
        to="/mypage/playground"
        className="flex min-h-28 items-center gap-4 rounded-2xl border border-page-border bg-white px-5 py-5 shadow-[0_3px_14px_rgb(0_0_0/8%)]"
      >
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-pink-50 text-accent">
          <Gamepad2 className="h-7 w-7" strokeWidth={2.1} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-black text-page-heading">
            딜뷰 놀이터
          </span>
          <span className="mt-1 block text-sm leading-snug text-page-text">
            운세와 룰렛으로 행운을 모으고, 아바타를 꾸며보세요
          </span>
        </span>
        <ChevronRight
          className="h-6 w-6 shrink-0 text-accent"
          strokeWidth={2.4}
        />
      </Link>
    </section>
  );
}
