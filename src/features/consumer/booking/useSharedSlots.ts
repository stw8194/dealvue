import { useSyncExternalStore } from 'react';
import { readSharedSlots, type SharedSlot } from '@/api/consumerBooking';
import { useAuthStore } from '@/store/useAuthStore';
import { createSharedQuery } from '../sharedQuery';

const queries = new Map<string, ReturnType<typeof createSharedQuery<SharedSlot[]>>>();
const empty = { data: undefined, error: null, ready: false, fetching: false };
const emptySnapshot = () => empty;
const noSubscription = () => () => {};
const EMPTY_SLOTS: SharedSlot[] = [];

function slotQuery(userId: string, offerId: number, day: string, staffId?: number, excludeId?: string) {
  const key = JSON.stringify([userId, offerId, day, staffId, excludeId]);
  let query = queries.get(key);
  if (!query) {
    // Only inactive entries can be evicted. Account IDs are part of every key:
    // own-booking conflicts make availability different between accounts.
    if (queries.size >= 100) for (const [id, entry] of queries) if (!entry.isActive()) queries.delete(id);
    query = createSharedQuery(() => readSharedSlots(offerId, day, staffId, excludeId));
    queries.set(key, query);
  }
  return query;
}

/** Shared, non-overlapping reads; final creation still checks all conflicts in DB. */
export function useSharedSlots(offerId: number | undefined, day: string, staffId?: number, excludeId?: string) {
  const userId = useAuthStore(state => state.user?.id);
  const query = userId && offerId && day ? slotQuery(userId, offerId, day, staffId, excludeId) : undefined;
  const value = useSyncExternalStore(query?.subscribe ?? noSubscription, query?.getSnapshot ?? emptySnapshot);
  return {
    rows: value.data ?? EMPTY_SLOTS,
    error: value.error ?? '',
    loading: Boolean(query) && !value.ready,
    retry: query?.retry ?? (() => {}),
  };
}
