import { useEffect, useState } from "react";
import { requestReservations } from "@/api/reservation";
import { useAuthStore } from "@/store/useAuthStore";
import type { Reservation } from "@/type/reservation";
import { useBookingStore } from "./store";

export function useReservations() {
  const previewReservations = useBookingStore(state => state.reservations);
  const userId = useAuthStore(state => state.user?.id);
  const initialized = useAuthStore(state => state.initialized);
  const [revision, setRevision] = useState(0);
  const key = `${userId ?? "guest"}:${revision}`;
  const [result, setResult] = useState<{ key: string; reservations: Reservation[]; error: string | null } | null>(null);
  useEffect(() => {
    if (!initialized || !userId) return;
    let active = true;
    requestReservations().then(reservations => {
      if (active) setResult({ key, reservations, error: null });
    }).catch(error => {
      if (active) setResult({ key, reservations: [], error: error instanceof Error ? error.message : "예약내역을 불러오지 못했습니다." });
    });
    return () => { active = false; };
  }, [initialized, userId, key]);
  const remote = userId && result?.key === key ? result.reservations : [];
  const local = previewReservations.filter(item => !item.id.startsWith("preview-example-"));
  return {
    reservations: [...remote, ...local].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    loading: Boolean(userId) && result?.key !== key && !local.length,
    error: !local.length && result?.key === key ? result.error : null,
    needsLogin: false,
    isPreview: false,
    retry: () => setRevision(value => value + 1),
  };
}
