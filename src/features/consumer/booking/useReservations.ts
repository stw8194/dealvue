import { useEffect, useState } from "react";
import { requestReservations } from "@/api/reservation";
import { usePreviewStore } from "@/features/consumer/preview";
import { useAuthStore } from "@/store/useAuthStore";
import type { Reservation } from "@/type/reservation";
import { useBookingStore } from "./store";

export function useReservations() {
  const enabled = usePreviewStore(state => state.enabled);
  const previewReservations = useBookingStore(state => state.reservations);
  const userId = useAuthStore(state => state.user?.id);
  const initialized = useAuthStore(state => state.initialized);
  const [revision, setRevision] = useState(0);
  const key = `${userId ?? "guest"}:${revision}`;
  const [result, setResult] = useState<{ key: string; reservations: Reservation[]; error: string | null } | null>(null);
  useEffect(() => {
    if (enabled || !initialized || !userId) return;
    let active = true;
    requestReservations().then(reservations => {
      if (active) setResult({ key, reservations, error: null });
    }).catch(error => {
      if (active) setResult({ key, reservations: [], error: error instanceof Error ? error.message : "예약내역을 불러오지 못했습니다." });
    });
    return () => { active = false; };
  }, [enabled, initialized, userId, key]);
  return {
    reservations: enabled ? previewReservations : userId && result?.key === key ? result.reservations : [],
    loading: !enabled && (!initialized || Boolean(userId) && result?.key !== key),
    error: !enabled && result?.key === key ? result.error : null,
    needsLogin: !enabled && initialized && !userId,
    isPreview: enabled,
    retry: () => setRevision(value => value + 1),
  };
}
