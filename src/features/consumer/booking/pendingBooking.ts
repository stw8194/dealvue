import type { BookingKind } from '../types';

export type BookingRequest = { offerId: number; slot: string; staffId?: number; kind: BookingKind; price: number; requestId: string };
const key = (userId: string, offerId: number) => `dealvue-pending-booking:${userId}:${offerId}`;
// A tab reload must retry the exact same request, never create a second request ID.
export function readPendingBooking(userId: string, offerId: number): BookingRequest | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(key(userId, offerId)) || 'null');
    return value?.offerId === offerId && typeof value.slot === 'string' && typeof value.requestId === 'string' && typeof value.price === 'number' && ['timedeal', 'regular', 'package'].includes(value.kind) ? value : null;
  } catch { return null; }
}
export function savePendingBooking(userId: string, request: BookingRequest) {
  sessionStorage.setItem(key(userId, request.offerId), JSON.stringify(request));
}
export function clearPendingBooking(userId: string, offerId: number) { sessionStorage.removeItem(key(userId, offerId)); }
