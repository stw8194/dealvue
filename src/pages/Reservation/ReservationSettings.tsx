import ReservationList from "@/features/consumer/booking/ReservationList";

export default function ReservationSettings() {
  return <ReservationList statuses={["waiting", "confirmed"]} emptyTitle="예정된 예약이 없습니다" />;
}
