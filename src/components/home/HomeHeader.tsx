import { useEffect, useState } from "react";
import { Bell, ChevronDown, Heart, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import {
  getCachedCurrentLocation,
  requestCurrentLocation,
} from "@/api/location";

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
    <header className="home-header relative flex h-[60px] w-full items-center bg-white px-[18px]">
      <Link
        to="/"
        aria-label="딜뷰 홈"
        className="shrink-0 text-[clamp(17px,5vw,22px)] font-black leading-none tracking-normal text-accent md:text-2xl"
      >
        <span className="text-[23px] font-extrabold tracking-[-.045em] text-accent">DEALVUE</span>
      </Link>

      <Link
        to="/location"
        aria-live="polite"
        aria-label="동네 및 위치 설정"
        title={locationError ?? "동네 및 위치 설정"}
        className="ml-auto mr-2 flex min-w-0 max-w-[38%] items-center justify-center gap-1 px-1 text-page-heading"
      >
        <MapPin className="h-4 w-4 shrink-0 md:h-5 md:w-5" strokeWidth={2.4} />
        <span className="truncate text-[11px] font-medium leading-none">
          {locationLabel}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 transition-transform ${
            locationStatus === "loading" ? "animate-pulse" : ""
          }`}
          strokeWidth={2.5}
        />
      </Link>

      <div className="flex shrink-0 items-center justify-end gap-0.5">
        <Link
          to="/notifications"
          aria-label="알림"
          className="relative grid h-8 w-8 place-items-center text-page-heading"
        >
          <Bell className="h-[22px] w-[22px]" strokeWidth={2.2} />
          {unreadNotificationCount > 0 && (
            <span className="absolute right-0 top-0 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[9px] font-bold leading-none text-white">
              {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
            </span>
          )}
        </Link>
        <Link
          to="/wishlist"
          aria-label="찜 목록"
          className="grid h-8 w-8 place-items-center text-page-heading"
        >
          <Heart className="h-[22px] w-[22px]" strokeWidth={2.2} />
        </Link>
      </div>
    </header>
  );
}
