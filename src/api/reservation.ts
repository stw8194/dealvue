import type { Reservation, ReservationStatus } from "@/type/reservation";
import { axiosInstance } from "./axiosInstance";

export async function requestReservations(status?: ReservationStatus) {
  try {
    const { data }: { data: Reservation[] } = await axiosInstance.get("reservations", { params: { status } });
    return data;
  } catch (err) {
    console.error(err);
  }
}

export async function requestCancelReservation(reservationId: number) {
  try {
    const { status } = await axiosInstance.put(`reservations/${reservationId}/cancel`);
    return status;
  } catch (err) {
    console.error(err);
  }
}
