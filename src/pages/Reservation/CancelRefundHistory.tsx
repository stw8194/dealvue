import ReservationList from "@/features/consumer/booking/ReservationList";

export default function CancelRefundHistory() {
  return (
    <section className="space-y-4">
      <ReservationList tab="cancelled" emptyTitle="취소된 예약이 없습니다" />
    </section>
  );
}
