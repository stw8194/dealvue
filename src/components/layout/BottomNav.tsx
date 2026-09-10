import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  MapPin,
  Heart,
  Home,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

const NAV_ITEMS: { label: string; path: string; icon: LucideIcon }[] = [
  { label: "홈", path: "/", icon: Home },
  { label: "내 주변", path: "/nearby", icon: MapPin },
  { label: "예약내역", path: "/reservation", icon: CalendarDays },
  { label: "찜", path: "/wishlist", icon: Heart },
  { label: "마이", path: "/mypage", icon: UserRound },
];

export default function BottomNav() {
  const { pathname } = useLocation();
  const lastScrollY = useRef(0);
  const frameId = useRef<number | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    lastScrollY.current = window.scrollY;

    const handleScroll = () => {
      if (frameId.current !== null) return;

      frameId.current = window.requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        const maximumScrollY =
          document.documentElement.scrollHeight - window.innerHeight;
        const isNearTop = currentScrollY <= 16;
        const isNearBottom = maximumScrollY - currentScrollY <= 16;
        const isScrollingUp = currentScrollY < lastScrollY.current - 4;
        const isScrollingDown = currentScrollY > lastScrollY.current + 4;

        if (isNearTop || isNearBottom || isScrollingUp) {
          setIsVisible(true);
        } else if (isScrollingDown) {
          setIsVisible(false);
        }

        lastScrollY.current = currentScrollY;
        frameId.current = null;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (frameId.current !== null) {
        window.cancelAnimationFrame(frameId.current);
      }
    };
  }, []);

  if (pathname.startsWith("/auth") || pathname === "/mypage/inquiry") {
    return null;
  }

  return (
    <nav
      aria-label="주요 메뉴"
      className={`fixed inset-x-0 bottom-0 z-50 border-t border-page-border bg-white/95 shadow-[0_-3px_16px_rgb(0_0_0/7%)] backdrop-blur transition-transform duration-300 ease-out ${
        isVisible ? "translate-y-0" : "pointer-events-none translate-y-full"
      }`}
    >
      <div className="mx-auto flex h-16 w-full max-w-2xl items-center justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                `flex h-14 min-w-14 flex-col items-center justify-center gap-1 text-[11px] font-semibold ${
                  isActive ? "text-accent" : "text-gray-400"
                }`
              }
            >
              <Icon className="h-6 w-6" strokeWidth={2.1} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
