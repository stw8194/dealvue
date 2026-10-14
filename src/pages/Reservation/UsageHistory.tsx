import ReservationList from "@/features/consumer/booking/ReservationList";

export default function UsageHistory() {
  return <ReservationList statuses={["done", "no_show"]} emptyTitle="아직 이용내역이 없습니다" />;
}
