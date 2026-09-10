import { NavLink, Route, Routes } from "react-router-dom";
import Header from "@/components/layout/Header";
import ReservationSettings from "./ReservationSettings";
import UsageHistory from "./UsageHistory";
import CancelRefundHistory from "./CancelRefundHistory";

const TABS = [
  { label: "예약 설정", path: "/reservation" },
  { label: "사용 내역", path: "/reservation/usage" },
  { label: "취소·환불 내역", path: "/reservation/cancel-refund" },
];

export default function Reservation() {
  return (
    <main className="pb-16">
      <Header title="예약내역" />
      <nav className="flex gap-4 border-b border-page-border px-4 py-2">
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
      <Routes>
        <Route index element={<ReservationSettings />} />
        <Route path="usage" element={<UsageHistory />} />
        <Route path="cancel-refund" element={<CancelRefundHistory />} />
      </Routes>
    </main>
  );
}
