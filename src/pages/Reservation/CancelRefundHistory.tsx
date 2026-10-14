import ReservationList from "@/features/consumer/booking/ReservationList";

export default function CancelRefundHistory() {
  return (
    <section className="space-y-4">
      <p className="text-sm text-page-text">예약 취소와 결제 환불은 별도 상태입니다. 환불 정보 연결은 준비 중이며 테스트 예약은 실제 청구·환불이 없습니다.</p>
      <ReservationList statuses={["cancelled"]} emptyTitle="취소된 예약이 없습니다" />
    </section>
  );
}
