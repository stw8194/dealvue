import { useEffect, useState, type ComponentType } from "react";
import {
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  CircleHelp,
  Copy,
  Gift,
  Heart,
  MessageCircle,
  Settings,
  Share2,
  Star,
  Tag,
  UserRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import { requestUserCoupons } from "@/api/coupon";
import { useCouponStore } from "@/features/consumer/coupons";
import { useBusinessHistory } from "@/features/consumer/history";
import { pointBalance, useEngagementStore } from "@/features/consumer/engagement/store";
import { useReservations } from "@/features/consumer/booking/useReservations";
import type { User } from "@/type/auth";

type DashboardProps = {
  isCheckingUser: boolean;
  user: User | null;
};

type MenuItem = {
  label: string;
  path: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  iconClassName: string;
  iconBackgroundClassName: string;
};

const MENU_ITEMS: MenuItem[] = [
  {
    label: "예약내역",
    path: "/reservation",
    icon: CalendarDays,
    iconClassName: "text-[#c6577c]",
    iconBackgroundClassName: "bg-[#fff2f6]",
  },
  {
    label: "찜 목록",
    path: "/wishlist",
    icon: Heart,
    iconClassName: "text-[#c6577c]",
    iconBackgroundClassName: "bg-[#fff2f6]",
  },
  {
    label: "쿠폰함",
    path: "/mypage/coupon",
    icon: Tag,
    iconClassName: "text-[#c6577c]",
    iconBackgroundClassName: "bg-[#fff2f6]",
  },
  {
    label: "포인트",
    path: "/mypage/point",
    icon: Gift,
    iconClassName: "text-[#c6577c]",
    iconBackgroundClassName: "bg-[#fff2f6]",
  },
  {
    label: "리뷰관리",
    path: "/mypage/review",
    icon: Star,
    iconClassName: "text-[#e6aa36]",
    iconBackgroundClassName: "bg-[#fff9ed]",
  },
  {
    label: "친구초대",
    path: "#invite-friends",
    icon: Share2,
    iconClassName: "text-[#ce6388]",
    iconBackgroundClassName: "bg-[#fff3f7]",
  },
  {
    label: "내 통계",
    path: "/mypage/stats",
    icon: BarChart3,
    iconClassName: "text-[#45afbd]",
    iconBackgroundClassName: "bg-[#edfafd]",
  },
  {
    label: "AI 상담",
    path: "/mypage/inquiry",
    icon: MessageCircle,
    iconClassName: "text-[#bd557c]",
    iconBackgroundClassName: "bg-[#fff2f6]",
  },
];

export default function MyPageDashboard({
  isCheckingUser,
  user,
}: DashboardProps) {
  const { reservations } = useReservations();
  const pointHistory = useEngagementStore(state => state.pointHistory);
  const [couponCount, setCouponCount] = useState(0);
  const localCouponCount = useCouponStore(state => state.coupons.filter(coupon => !coupon.usedReservationId).length);
  const visits = useBusinessHistory((state) => state.visits);
  const recentShops = visits.filter((visit) => !visit.preview).slice(0, 4);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (!user) return;

    let isCurrent = true;

    requestUserCoupons()
      .then((coupons) => {
        if (isCurrent) setCouponCount(coupons.length);
      })
      .catch((error) => console.error(error));

    return () => {
      isCurrent = false;
    };
  }, [user]);

  const copyInvitationLink = async () => {
    const invitationUrl = `${window.location.origin}/?ref=${user?.id ?? "friend"}`;

    try {
      await navigator.clipboard.writeText(invitationUrl);
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 1600);
    } catch {
      setIsCopied(false);
    }
  };

  const summaryItems = [
    { label: "예약내역", value: String(reservations.length), icon: CalendarDays, path: "/reservation" },
    {
      label: "쿠폰",
      value: String(Math.max(user ? couponCount : 0, localCouponCount)),
      icon: Tag,
      path: "/mypage/coupon",
    },
    { label: "포인트", value: pointBalance(pointHistory).toLocaleString(), icon: Gift, path: "/mypage/point" },
  ];

  return (
    <div className="space-y-5 bg-[#fafafa] px-4 py-5 min-[390px]:px-5">
      <section className="rounded-2xl border border-page-border bg-white p-5 shadow-[0_2px_12px_rgb(0_0_0/7%)]">
        {isCheckingUser ? (
          <div className="h-36 animate-pulse rounded-xl bg-gray-100" />
        ) : user ? (
          <div className="flex items-center gap-4">
            <span className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-[#f5f5f7] text-gray-300">
              <UserRound className="h-11 w-11" strokeWidth={1.8} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-xl font-black text-page-heading">
                {user.nickname}
              </h2>
              <p className="mt-1 truncate text-sm text-gray-400">
                {user.email}
              </p>
            </div>
            <Link
              to="/mypage/edit"
              aria-label="프로필 수정"
              className="grid h-10 w-10 place-items-center text-gray-400"
            >
              <Settings className="h-6 w-6" strokeWidth={2} />
            </Link>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <span className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-[#f5f5f7] text-gray-300">
                <UserRound className="h-11 w-11" strokeWidth={1.8} />
              </span>
              <div className="min-w-0">
                <h2 className="text-xl font-black text-page-heading">
                  로그인해 주세요
                </h2>
                <p className="mt-1 text-sm text-gray-400">
                  로그인하고 혜택을 받아보세요
                </p>
              </div>
            </div>
            <Link
              to="/auth/login"
              className="mt-5 flex h-13 w-full items-center justify-center rounded-full bg-accent text-base font-bold text-white"
            >
              로그인 / 회원가입
            </Link>
          </>
        )}
      </section>

      <section className="grid grid-cols-3 divide-x divide-page-border rounded-2xl border border-page-border bg-white px-2 py-5 shadow-[0_2px_12px_rgb(0_0_0/7%)]">
        {summaryItems.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              to={item.path}
              className="flex min-w-0 flex-col items-center gap-2 text-center"
            >
              <Icon className="h-5 w-5 text-gray-300" strokeWidth={2} />
              <span className="text-lg font-bold text-gray-300">
                {item.value}
              </span>
              <span className="truncate text-xs text-gray-400">
                {item.label}
              </span>
            </Link>
          );
        })}
      </section>

      <nav aria-label="마이페이지 바로가기" className="grid grid-cols-4 gap-x-2 gap-y-5 rounded-2xl border border-page-border bg-white px-3 py-4 shadow-[0_2px_12px_rgb(0_0_0/7%)]">
        {MENU_ITEMS.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              to={item.path}
              className="flex min-w-0 flex-col items-center gap-2 text-center"
            >
              <span
                className={`grid h-[44px] w-[44px] place-items-center rounded-2xl ${item.iconBackgroundClassName}`}
              >
                <Icon
                  className={`h-[22px] w-[22px] ${item.iconClassName}`}
                  strokeWidth={2.1}
                />
              </span>
              <span className="w-full whitespace-nowrap text-[11px] font-medium leading-4 text-page-text">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <section
        id="invite-friends"
        className="flex items-center gap-3 rounded-2xl border border-page-border bg-white px-4 py-5 shadow-[0_2px_12px_rgb(0_0_0/7%)]"
      >
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#fff2f6] text-[#c6577c]">
          <Gift className="h-6 w-6" strokeWidth={2.1} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-black text-page-heading">
            친구 초대하고 5,000원 받기
          </h2>
          <p className="mt-1 text-xs text-gray-400">
            친구가 첫 예약 완료 시 포인트 지급
          </p>
        </div>
        <button
          type="button"
          onClick={() => void copyInvitationLink()}
          className="flex shrink-0 cursor-pointer items-center gap-1 text-sm font-bold text-accent"
        >
          {isCopied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {isCopied ? "복사됨" : "복사"}
        </button>
      </section>

      <section className="py-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-page-heading">최근 본 매장</h2>
          <Link
            to="/mypage/recent"
            className="flex items-center text-sm font-semibold text-accent"
          >
            전체보기
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {recentShops.length > 0 ? (
          <ul className="mt-4 grid grid-cols-4 gap-3">
            {recentShops.map((shop) => (
              <li key={shop.id} className="min-w-0">
                <Link to={`/business/${shop.id}`} className="block text-center">
                  <span className="mx-auto grid aspect-square w-full max-w-20 place-items-center rounded-full bg-pink-50 text-accent">매장</span>
                  <span className="mt-2 block truncate text-xs text-page-text">
                    {shop.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 rounded-xl bg-white px-4 py-6 text-center text-sm text-gray-400">
            최근 본 매장이 없습니다.
          </p>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-page-border bg-white shadow-[0_2px_12px_rgb(0_0_0/7%)]">
        <h2 className="px-5 py-4 text-lg font-black text-page-heading">
          고객 지원
        </h2>
        <div className="border-t border-page-border">
          <Link
            to="/mypage/inquiry"
            className="flex h-16 items-center gap-4 border-b border-page-border px-5 text-page-text"
          >
            <CircleHelp className="h-6 w-6 text-gray-400" strokeWidth={2} />
            <span className="flex-1">AI 고객센터</span>
            <ChevronRight className="h-5 w-5 text-gray-300" />
          </Link>
          <Link
            to="/settings"
            className="flex h-16 w-full items-center gap-4 border-b border-page-border px-5 text-left text-page-text"
          >
            <Bell className="h-6 w-6 text-gray-400" strokeWidth={2} />
            <span className="flex-1">알림 설정</span>
            <ChevronRight className="h-5 w-5 text-gray-300" />
          </Link>
          <Link
            to="/settings"
            className="flex h-16 items-center gap-4 px-5 text-page-text"
          >
            <Settings className="h-6 w-6 text-gray-400" strokeWidth={2} />
            <span className="flex-1">설정</span>
            <ChevronRight className="h-5 w-5 text-gray-300" />
          </Link>
        </div>
      </section>
    </div>
  );
}
