import { Link, useParams } from "react-router-dom";
import { EmptyState, Page } from "@/features/consumer/ui";
import { PAYMENT_METHOD_LABEL } from "@/type/reservation";
import { formatReservationDate, paymentStatusLabel, reservationStatusLabel } from "./rules";
import { useBookingStore } from "./store";

export default function BookingCompletePage() {
  const { reservationId } = useParams();
  const reservation = useBookingStore(state => state.reservations.find(item => item.id === reservationId));
  return (
    <Page title="예약 결과">
      {!reservation ? <EmptyState title="예약을 찾을 수 없습니다" description="예약내역에서 예약을 확인해 주세요." action={<Link to="/reservation" className="text-accent underline">예약내역 보기</Link>} /> : (
        <div className="space-y-5">
          <h2 className="text-xl font-semibold">{reservation.status === "cancelled" ? "취소된 시연 예약입니다" : "시연 예약이 저장되었습니다"}</h2>
          <p className="text-sm text-page-text">이 기기에만 저장된 시연 예약이에요. 매장에 전달되지 않았고 실제로 결제·청구되지 않았습니다. 일정 변경과 취소는 예약내역에서 할 수 있어요.</p>
          <dl className="space-y-3 rounded-xl border border-page-border p-4 text-sm">
            <div><dt className="text-page-text">매장 / 시술</dt><dd className="mt-1">{reservation.shopName} / {reservation.productName}</dd></div>
            <div><dt className="text-page-text">일정</dt><dd className="mt-1">{formatReservationDate(reservation.reservedAt)}</dd></div>
            {reservation.staffName && <div><dt className="text-page-text">담당자</dt><dd className="mt-1">{reservation.staffName}</dd></div>}
            <div><dt className="text-page-text">예약 상태</dt><dd className="mt-1">{reservationStatusLabel(reservation)}</dd></div>
            <div><dt className="text-page-text">결제</dt><dd className="mt-1">{paymentStatusLabel(reservation)}{reservation.paymentMethod ? ` · 선택한 수단 ${PAYMENT_METHOD_LABEL[reservation.paymentMethod]}` : ""}</dd></div>
            {(reservation.originalPrice ?? reservation.price) > (reservation.paidAmount ?? reservation.price) && <div><dt className="text-page-text">할인 혜택</dt><dd className="mt-1 text-accent">{((reservation.originalPrice ?? reservation.price) - (reservation.paidAmount ?? reservation.price)).toLocaleString()}원 할인</dd></div>}
          </dl>
          <Link className="block rounded-lg bg-accent p-3 text-center font-semibold text-white" to={`/reservation/${reservation.id}`}>예약 상세 보기</Link>
          <Link className="block text-center text-sm text-accent underline" to="/search">다른 타임딜 둘러보기</Link>
        </div>
      )}
    </Page>
  );
}
