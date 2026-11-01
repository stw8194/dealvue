import { getSupabaseClient } from './supabase';
import type { BookingRequest } from '@/features/consumer/booking/pendingBooking';
import type { BookingKind } from '@/features/consumer/types';

export type SharedSlot = { start_at: string; end_at: string; available: boolean; kind: BookingKind; price: number };
function failure(error: { message?: string; code?: string }) {
  return new Error(error.code === 'PGRST202' ? '예약 서버를 준비 중입니다. 잠시 후 다시 확인해 주세요.' : error.message || '예약을 처리하지 못했습니다. 다시 시도해 주세요.');
}
export function bookingChanged() { window.dispatchEvent(new Event('dealvue-bookings-changed')); }
export async function readSharedSlots(offerId: number, date: string, staffId?: number, excludeId?: string): Promise<SharedSlot[]> {
  const {data,error}=await getSupabaseClient().rpc('consumer_booking_availability', {p_offer_id:offerId,p_date:date,p_staff_id:staffId??null,p_exclude_id:excludeId??null});
  if(error)throw failure(error);
  return data??[];
}
export class BookingResponseUnknownError extends Error {
  constructor() { super('연결이 끊겨 예약 접수 여부를 확인하고 있어요.'); }
}
export async function createSharedBooking(input: BookingRequest) {
  let response;
  try {
    response = await getSupabaseClient().rpc('consumer_create_booking',{p_offer_id:input.offerId,p_start_at:input.slot,p_staff_id:input.staffId??null,p_kind:input.kind,p_price:input.price,p_request_id:input.requestId});
  } catch { throw new BookingResponseUnknownError(); }
  const {data,error,status}=response;
  // A missing response or a gateway failure says nothing about whether DB committed.
  if (error) {
    if (!error.code || status >= 500 || status === 0 || status === 401 || status === 403) throw new BookingResponseUnknownError();
    throw failure(error);
  }
  if (data == null) throw new BookingResponseUnknownError();
  bookingChanged();return String(data);
}
export async function changeSharedBooking(id:string,slot:string,expectedStart:string) {
  const {error}=await getSupabaseClient().rpc('consumer_change_booking',{p_id:id,p_start_at:slot,p_expected_start:expectedStart});
  if(error)throw failure(error);bookingChanged();
}
export async function cancelSharedBooking(id:string,reason:string) {
  const {error}=await getSupabaseClient().rpc('consumer_cancel_booking',{p_id:id,p_reason:reason});
  if(error)throw failure(error);bookingChanged();
}
