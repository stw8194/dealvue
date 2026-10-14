import { NavLink, Outlet, Route, Routes } from "react-router-dom";
import { NotFoundPage, Page } from "@/features/consumer/ui";
import ReservationDetailPage from "@/features/consumer/booking/ReservationDetailPage";
import ReviewEditorPage from "@/features/consumer/booking/ReviewEditorPage";
import ReservationSettings from "./ReservationSettings";
import UsageHistory from "./UsageHistory";
import CancelRefundHistory from "./CancelRefundHistory";

const TABS = [
  { label: "예정된 예약", path: "/reservation" },
  { label: "이용 내역", path: "/reservation/usage" },
  { label: "취소·환불 내역", path: "/reservation/cancel-refund" },
];

export default function Reservation() {
  return <Routes>
    <Route element={<ReservationTabs />}>
      <Route index element={<ReservationSettings />} />
      <Route path="usage" element={<UsageHistory />} />
      <Route path="cancel-refund" element={<CancelRefundHistory />} />
    </Route>
    <Route path=":reservationId" element={<ReservationDetailPage />} />
    <Route path=":reservationId/review" element={<ReviewEditorPage />} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes>;
}

function ReservationTabs() {
  return (
    <Page title="예약내역">
      <nav aria-label="예약내역 분류" className="mb-5 flex gap-4 border-b border-page-border pb-3">
        {TABS.map(tab => (
          <NavLink
            key={tab.path}
            to={tab.path}
            end={tab.path === "/reservation"}
            className={({ isActive }) => `text-sm ${isActive ? "font-semibold text-accent" : "text-page-text"}`}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </Page>
  );
}
