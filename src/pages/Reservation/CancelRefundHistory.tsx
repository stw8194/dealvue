import ReservationList from "@/features/consumer/booking/ReservationList";

export default function CancelRefundHistory() {
  return (
    <section className="space-y-4">
      <p className="text-sm text-page-text">시연 예약은 실제로 청구되지 않아 환불도 없습니다. 취소하면 사용한 쿠폰과 포인트는 다시 사용할 수 있어요.</p>
      <ReservationList tab="cancelled" emptyTitle="취소된 예약이 없습니다" />
    </section>
  );
}
