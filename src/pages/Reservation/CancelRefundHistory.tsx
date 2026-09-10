import { useEffect, useState } from "react";
import { requestReservations } from "@/api/reservation";
import type { Reservation, ReservationStatus } from "@/type/reservation";

const STATUS_LABEL: Record<ReservationStatus, string> = {
  completed: "예약 완료",
  used: "이용 완료",
  cancelling: "취소 진행",
  refunded: "환불 완료",
};

export default function CancelRefundHistory() {
  const [reservations, setReservations] = useState<Reservation[]>([]);

  useEffect(() => {
    Promise.all([requestReservations("cancelling"), requestReservations("refunded")]).then(
      ([cancelling, refunded]) => {
        setReservations([...(cancelling ?? []), ...(refunded ?? [])]);
      },
    );
  }, []);

  return (
    <ul className="flex flex-col gap-3 px-4 py-4">
      {reservations.map(reservation => (
        <li key={reservation.id} className="border-b border-page-border pb-3">
          <p className="text-sm font-semibold text-page-heading">{reservation.productName}</p>
          <p className="text-sm text-accent">{STATUS_LABEL[reservation.status]}</p>
        </li>
      ))}
    </ul>
  );
}
