import { Link } from "react-router-dom";
import { CalendarDays, ChevronRight, Store } from "lucide-react";
import { EmptyState } from "@/features/consumer/ui";
import type { Reservation } from "@/type/reservation";
import { formatReservationDate, isAwaitingVisitCheck, isUpcoming, reservationStatusLabel } from "./rules";
import { useReservations } from "./useReservations";
import { useDealTime } from "../dealTiming";

export type ReservationTab = "upcoming" | "usage" | "cancelled";

const BELONGS: Record<ReservationTab, (reservation: Reservation, now: number) => boolean> = {
  upcoming: isUpcoming,
  // Past bookings appear here before a visit is confirmed; they are not counted as used.
  usage: (reservation, now) => reservation.status === "done" || reservation.status === "no_show" || isAwaitingVisitCheck(reservation, now),
  cancelled: reservation => reservation.status === "cancelled",
};

export default function ReservationList({ tab, emptyTitle }: { tab: ReservationTab; emptyTitle: string }) {
  const { reservations, loading, error, needsLogin, retry } = useReservations();
  const now = useDealTime();
  if (needsLogin) return <EmptyState title="로그인이 필요합니다" description="로그인 후 내 예약내역을 확인할 수 있습니다." action={<Link to="/auth/login" className="text-accent underline">로그인</Link>} />;
  if (loading) return <p role="status" className="py-6 text-sm">예약내역을 불러오는 중입니다.</p>;
  if (error) return <EmptyState title="예약내역을 불러오지 못했습니다" description={error} action={<button onClick={retry} className="text-accent underline">다시 시도</button>} />;
  const filtered = reservations.filter(reservation => BELONGS[tab](reservation, now)).sort((a, b) => tab === "upcoming" ? a.reservedAt.localeCompare(b.reservedAt) : b.reservedAt.localeCompare(a.reservedAt));
  if (!filtered.length) return <EmptyState title={emptyTitle} action={<Link to="/search" className="text-accent underline">타임딜 둘러보기</Link>} />;
  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {filtered.map(reservation => (
          <li key={reservation.id} className="overflow-hidden rounded-3xl border border-page-border bg-white">
            <Link to={`/reservation/${reservation.id}`} aria-label={`${reservation.shopName} ${reservation.productName} 예약 상세 보기`} className="block p-5 transition hover:bg-[#fffcfd]">
              <div className="mb-4 flex items-center justify-between gap-2">
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${tab === "cancelled" ? "bg-gray-100 text-page-text" : "bg-accent/10 text-accent"}`}>{reservationStatusLabel(reservation, now)}</span>
                <ChevronRight size={17} className="text-gray-400" />
              </div>
              <div className="flex items-center gap-3">
                <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[#faf4f6] text-accent">{reservation.imageUrl ? <img src={reservation.imageUrl} alt="" className="h-full w-full object-cover" /> : <Store size={23} strokeWidth={1.6} />}</span>
                <div className="min-w-0">
                  <p className="text-xs text-page-text">{reservation.shopName}{reservation.legCount ? ` · 패키지 ${(reservation.legIndex ?? 0) + 1}/${reservation.legCount}` : ""}</p>
                  <h2 className="mt-1 break-words text-sm font-bold leading-snug text-page-heading">{reservation.productName}</h2>
                </div>
              </div>
              <p className="mt-4 flex items-center gap-2 text-xs text-page-text"><CalendarDays size={14} className="shrink-0" />{formatReservationDate(reservation.reservedAt)}</p>
              {reservation.staffName && <p className="mt-2 text-xs text-page-text">담당 {reservation.staffName}</p>}
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-page-border pt-3">
                <span className="text-xs text-page-text">{reservation.paymentStatus === "on_site" ? "방문 시 결제" : "예약 금액"}</span>
                <span className="text-base font-bold text-page-heading">{(reservation.paidAmount ?? reservation.price).toLocaleString()}원</span>
              </div>
            </Link>
            {reservation.status === "done" && reservation.isPreview && reservation.completedAt && <Link to={`/reservation/${reservation.id}/review`} className="mx-5 mb-4 flex min-h-11 items-center justify-center rounded-xl bg-accent/5 text-sm font-semibold text-accent">리뷰 작성·수정</Link>}
          </li>
        ))}
      </ul>
    </div>
  );
}
