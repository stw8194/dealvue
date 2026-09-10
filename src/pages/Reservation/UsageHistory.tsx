import { useEffect, useState } from "react";
import { requestReservations } from "@/api/reservation";
import type { Reservation } from "@/type/reservation";

export default function UsageHistory() {
  const [reservations, setReservations] = useState<Reservation[]>([]);

  useEffect(() => {
    requestReservations("used").then(data => {
      if (data) setReservations(data);
    });
  }, []);

  return (
    <ul className="flex flex-col gap-3 px-4 py-4">
      {reservations.map(reservation => (
        <li key={reservation.id} className="border-b border-page-border pb-3">
          <p className="text-sm font-semibold text-page-heading">{reservation.productName}</p>
          <p className="text-sm text-page-text">{reservation.shopName}</p>
          <p className="text-sm text-page-text">{reservation.reservedAt}</p>
        </li>
      ))}
    </ul>
  );
}
