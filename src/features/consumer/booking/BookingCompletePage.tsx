import { Link, useParams } from "react-router-dom";
import { PreviewBoundary } from "@/features/consumer/preview";
import { EmptyState, Page } from "@/features/consumer/ui";
import { formatReservationDate, RESERVATION_STATUS_LABEL } from "./rules";
import { useBookingStore } from "./store";

export default function BookingCompletePage() {
  const { reservationId } = useParams();
  const reservation = useBookingStore(state => state.reservations.find(item => item.id === reservationId));
  return (
    <Page title="테스트 예약 결과">
      <PreviewBoundary>
        {!reservation ? <EmptyState title="테스트 예약을 찾을 수 없습니다" description="예약내역에서 저장된 예약을 확인해 주세요." action={<Link to="/reservation" className="text-accent underline">예약내역 보기</Link>} /> : (
          <div className="space-y-5">
            <h2 className="text-xl font-semibold">{reservation.status === "cancelled" ? "취소된 테스트 예약입니다" : "테스트 예약이 저장되었습니다"}</h2>
            <p className="text-sm text-page-text">실제 결제나 매장 예약은 진행되지 않았습니다.</p>
            <dl className="space-y-3 rounded-xl border border-page-border p-4 text-sm">
              <div><dt className="text-page-text">매장 / 시술</dt><dd className="mt-1">{reservation.shopName} / {reservation.productName}</dd></div>
              <div><dt className="text-page-text">일정</dt><dd className="mt-1">{formatReservationDate(reservation.reservedAt)}</dd></div>
              <div><dt className="text-page-text">예약 상태</dt><dd className="mt-1">{RESERVATION_STATUS_LABEL[reservation.status]}</dd></div>
              <div><dt className="text-page-text">테스트 금액</dt><dd className="mt-1">{reservation.price.toLocaleString()}원 · 실제 청구 0원</dd></div>
            </dl>
            <Link className="block rounded-lg bg-accent p-3 text-center font-semibold text-white" to={`/reservation/${reservation.id}`}>예약 상세 보기</Link>
            <Link className="block text-center text-sm text-accent underline" to="/search">다른 타임딜 둘러보기</Link>
          </div>
        )}
      </PreviewBoundary>
    </Page>
  );
}
