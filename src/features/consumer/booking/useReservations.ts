import { useMemo, useSyncExternalStore } from "react";
import { requestReservations } from "@/api/reservation";
import { useAuthStore } from "@/store/useAuthStore";
import type { Reservation } from "@/type/reservation";
import { ownReservations, useBookingStore } from "./store";
import { createSharedQuery } from "../sharedQuery";

const queries = new Map<string, ReturnType<typeof createSharedQuery<Reservation[]>>>();
const empty = { data: undefined, error: null, ready: false, fetching: false };
const emptySnapshot = () => empty;
const noSubscription = () => () => {};
const EMPTY_RESERVATIONS: Reservation[] = [];
function reservationQuery(userId: string) {
  let query = queries.get(userId);
  if (!query) {
    // Keep only the current account's inactive cache, never reuse another user's result.
    for (const [id, entry] of queries) if (id !== userId && !entry.isActive()) queries.delete(id);
    query = createSharedQuery(() => requestReservations(undefined, userId), 30_000);
    queries.set(userId, query);
  }
  return query;
}

/** This account's bookings in the device ledger (no server bookings). */
export function useOwnLocalReservations() {
  const reservations = useBookingStore(state => state.reservations);
  const userId = useAuthStore(state => state.user?.id);
  return useMemo(() => ownReservations(reservations, userId), [reservations, userId]);
}

export function useReservations() {
  const previewReservations = useBookingStore(state => state.reservations);
  const userId = useAuthStore(state => state.user?.id);
  const initialized = useAuthStore(state => state.initialized);
  const query = initialized && userId ? reservationQuery(userId) : undefined;
  const result = useSyncExternalStore(query?.subscribe ?? noSubscription, query?.getSnapshot ?? emptySnapshot);
  const remote = result.data ?? EMPTY_RESERVATIONS;
  const local = ownReservations(previewReservations, userId);
  return {
    reservations: [...remote, ...local].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    // Until auth and this account's first server read settle, an empty list is not an answer.
    loading: !initialized || (Boolean(userId) && !result.ready),
    error: result.data === undefined && !local.length ? result.error : null,
    refreshError: result.data !== undefined || local.length ? result.error : null,
    refreshing: result.fetching,
    needsLogin: initialized && !userId,
    isPreview: false,
    retry: query?.retry ?? (() => {}),
  };
}
