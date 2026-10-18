import { Link } from "react-router-dom";
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
          <li key={reservation.id} className="rounded-xl border border-page-border p-4">
            <Link to={`/reservation/${reservation.id}`} className="block space-y-2">
              <p className="text-xs font-semibold text-accent">{reservationStatusLabel(reservation, now)}</p>
              <h2 className="font-semibold">{reservation.productName}</h2>
              <p className="text-sm text-page-text">{reservation.shopName}{reservation.legCount ? ` · 패키지 ${(reservation.legIndex ?? 0) + 1}/${reservation.legCount}` : ""}</p>
              <p className="text-sm">{formatReservationDate(reservation.reservedAt)}</p>
              {reservation.staffName && <p className="text-sm text-page-text">담당 {reservation.staffName}</p>}
              <p className="text-sm">{(reservation.paidAmount ?? reservation.price).toLocaleString()}원{reservation.isPreview ? " · 실제 청구 없음" : ""}</p>
              <p className="text-sm text-accent">예약 상세 보기 →</p>
            </Link>
            {reservation.status === "done" && reservation.isPreview && reservation.completedAt && <Link to={`/reservation/${reservation.id}/review`} className="mt-3 inline-block text-sm text-accent underline">리뷰 작성·수정</Link>}
          </li>
        ))}
      </ul>
    </div>
  );
}
