import { Bell, Settings } from "lucide-react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import { ConsumerMyPage } from "@/features/consumer/engagement/UtilityPages";
import { usePreviewStore } from "@/features/consumer/preview";
import { NotFoundPage } from "@/features/consumer/ui";
import MyPageDashboard from "@/components/mypage/MyPageDashboard";
import { useAuthStore } from "@/store/useAuthStore";
import ProfileEdit from "./ProfileEdit";
import ReviewList from "./ReviewList";
import CouponList from "./CouponList";
import PointList from "./PointList";
import RecentViewed from "./RecentViewed";
import Playground from "./Playground";
import Inquiry from "./Inquiry";

export default function MyPage() {
  const { pathname } = useLocation();
  const user = useAuthStore((state) => state.user);
  const isCheckingUser = !useAuthStore((state) => state.initialized);
  const preview = usePreviewStore((state) => state.enabled);

  if (pathname === "/mypage/playground" || pathname === "/mypage/playground/") return <Playground />;

  return (
    <main
      className={`min-h-screen bg-[#fafafa] ${
        pathname === "/mypage/inquiry" ? "pb-0" : "pb-24"
      }`}
    >
      <header className="sticky top-0 z-40 flex h-16 items-center border-b border-page-border bg-white px-5">
        <h1 className="text-xl font-black text-page-heading">마이페이지</h1>
        <div className="ml-auto flex items-center gap-1">
          <Link
            to="/notifications"
            aria-label="알림"
            className="grid h-10 w-10 cursor-pointer place-items-center text-page-heading"
          >
            <Bell className="h-6 w-6" strokeWidth={2.1} />
          </Link>
          <Link
            to="/settings"
            aria-label="설정"
            className="grid h-10 w-10 place-items-center text-page-heading"
          >
            <Settings className="h-6 w-6" strokeWidth={2.1} />
          </Link>
        </div>
      </header>

      <Routes>
        <Route
          index
          element={
            preview ? <ConsumerMyPage /> : <MyPageDashboard user={user} isCheckingUser={isCheckingUser} />
          }
        />
        <Route path="edit" element={<ProfileEdit />} />
        <Route path="review" element={<ReviewList />} />
        <Route path="inquiry" element={<Inquiry />} />
        <Route path="coupon" element={<CouponList />} />
        <Route path="point" element={<PointList />} />
        <Route path="recent" element={<RecentViewed />} />
        <Route path="playground" element={<Playground />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </main>
  );
}
