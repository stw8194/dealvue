import { Link } from "react-router-dom";
import { EmptyState } from "@/features/consumer/ui";
import type { ReservationStatus } from "@/type/reservation";
import { formatReservationDate, RESERVATION_STATUS_LABEL } from "./rules";
import { useReservations } from "./useReservations";

export default function ReservationList({ statuses, emptyTitle }: { statuses: ReservationStatus[]; emptyTitle: string }) {
  const { reservations, loading, error, needsLogin, isPreview, retry } = useReservations();
  if (needsLogin) return <EmptyState title="로그인이 필요합니다" description="로그인 후 내 예약내역을 확인할 수 있습니다." action={<Link to="/auth/login" className="text-accent underline">로그인</Link>} />;
  if (loading) return <p role="status" className="py-6 text-sm">예약내역을 불러오는 중입니다.</p>;
  if (error) return <EmptyState title="예약내역을 불러오지 못했습니다" description={error} action={<button onClick={retry} className="text-accent underline">다시 시도</button>} />;
  const filtered = reservations.filter(reservation => statuses.includes(reservation.status)).sort((a, b) => b.reservedAt.localeCompare(a.reservedAt));
  if (!filtered.length) return <EmptyState title={emptyTitle} action={<Link to="/search" className="text-accent underline">타임딜 둘러보기</Link>} />;
  return (
    <div className="space-y-3">
      {isPreview && <p className="text-xs text-page-text">미리보기 예시 내역과 이 기기에서 만든 테스트 예약입니다.</p>}
      <ul className="space-y-3">
        {filtered.map(reservation => (
          <li key={reservation.id} className="rounded-xl border border-page-border p-4">
            <Link to={`/reservation/${reservation.id}`} className="block space-y-2">
              <p className="text-xs font-semibold text-accent">{RESERVATION_STATUS_LABEL[reservation.status]}</p>
              <h2 className="font-semibold">{reservation.productName}</h2>
              <p className="text-sm text-page-text">{reservation.shopName}</p>
              <p className="text-sm">{formatReservationDate(reservation.reservedAt)}</p>
              <p className="text-sm">{reservation.price.toLocaleString()}원 {reservation.isPreview && <span className="text-page-text">· 테스트 금액</span>}</p>
              <p className="text-sm text-accent">예약 상세 보기 →</p>
            </Link>
            {reservation.status === "done" && reservation.isPreview && <Link to={`/reservation/${reservation.id}/review`} className="mt-3 inline-block text-sm text-accent underline">리뷰 작성·수정</Link>}
          </li>
        ))}
      </ul>
    </div>
  );
}
