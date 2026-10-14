import { useEffect, useState } from "react";
import { Bell, ChevronDown, Heart, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import {
  getCachedCurrentLocation,
  requestCurrentLocation,
} from "@/api/location";
import logoUrl from "@/assets/logo.svg";

type LocationStatus = "idle" | "loading" | "success" | "error";

type HomeHeaderProps = {
  unreadNotificationCount?: number;
};

export default function HomeHeader({
  unreadNotificationCount = 0,
}: HomeHeaderProps) {
  const [cachedLocation] = useState(getCachedCurrentLocation);
  const [locationLabel, setLocationLabel] = useState(cachedLocation?.label ?? "위치 확인 중");
  const [locationStatus, setLocationStatus] = useState<LocationStatus>(cachedLocation ? "success" : "loading");
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    if (cachedLocation) return;
    let current = true;
    void requestCurrentLocation().then((location) => {
      if (current) { setLocationLabel(location.label); setLocationStatus("success"); }
    }).catch((error: unknown) => {
      if (current) {
        setLocationLabel("위치 설정");
        setLocationError(error instanceof Error ? error.message : "현재 위치를 확인할 수 없습니다.");
        setLocationStatus("error");
      }
    });
    return () => { current = false; };
  }, [cachedLocation]);

  return (
    <header className="relative flex h-14 w-full max-w-[100dvw] items-center bg-page-background px-4 min-[390px]:px-5 md:h-16">
      <Link
        to="/"
        aria-label="딜뷰 홈"
        className="shrink-0 text-[clamp(17px,5vw,22px)] font-black leading-none tracking-normal text-accent md:text-2xl"
      >
        <img src={logoUrl} alt="DEALVUE" className="h-8 w-auto" />
      </Link>

      <Link
        to="/location"
        aria-live="polite"
        aria-label="동네 및 위치 설정"
        title={locationError ?? "동네 및 위치 설정"}
        className="absolute left-1/2 top-1/2 flex w-[44vw] max-w-72 -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-1 px-1 text-page-heading"
      >
        <MapPin className="h-4 w-4 shrink-0 md:h-5 md:w-5" strokeWidth={2.4} />
        <span className="max-w-[34vw] truncate text-[clamp(11px,3.3vw,14px)] font-bold leading-none md:max-w-none md:text-base">
          {locationLabel}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 transition-transform ${
            locationStatus === "loading" ? "animate-pulse" : ""
          }`}
          strokeWidth={2.5}
        />
      </Link>

      <div className="ml-auto flex shrink-0 items-center justify-end gap-1 md:gap-3">
        <Link
          to="/notifications"
          aria-label="알림"
          className="relative grid h-8 w-8 place-items-center text-page-heading md:h-9 md:w-9"
        >
          <Bell className="h-5 w-5 md:h-6 md:w-6" strokeWidth={2.2} />
          {unreadNotificationCount > 0 && (
            <span className="absolute right-0 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[9px] font-bold leading-none text-white">
              {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
            </span>
          )}
        </Link>
        <Link
          to="/wishlist"
          aria-label="찜 목록"
          className="grid h-8 w-8 place-items-center text-page-heading md:h-9 md:w-9"
        >
          <Heart className="h-5 w-5 md:h-6 md:w-6" strokeWidth={2.2} />
        </Link>
      </div>
    </header>
  );
}
