import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useConsumerCatalog } from "@/features/consumer/catalog";
import { EmptyState, Page } from "@/features/consumer/ui";
import type { ConsumerDeal } from "@/features/consumer/types";
import type { Reservation } from "@/type/reservation";
import { canManageReservation, formatReservationDate, RESERVATION_STATUS_LABEL } from "./rules";
import { useBookingStore } from "./store";
import { useReservations } from "./useReservations";

function ManageBooking({ reservation, deal }: { reservation: Reservation; deal?: ConsumerDeal }) {
  const [slot, setSlot] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cancelReservation = useBookingStore(state => state.cancelReservation);
  const rescheduleReservation = useBookingStore(state => state.rescheduleReservation);
  const change = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    try {
      if (!deal) throw new Error("원래 예약한 타임딜의 일정이 없습니다.");
      if (slot === reservation.reservedAt) throw new Error("변경할 다른 일정을 선택해 주세요.");
      rescheduleReservation(reservation.id, deal, slot);
      setMessage("예약 일정을 변경했습니다.");
      setSlot("");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "일정을 변경하지 못했습니다."); }
  };
  const cancel = () => {
    setError(null);
    setMessage(null);
    try {
      cancelReservation(reservation.id, reason);
      setCancelOpen(false);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "예약을 취소하지 못했습니다."); }
  };
  return (
    <section className="space-y-4 rounded-xl border border-page-border p-4">
      <h2 className="font-semibold">예약 관리</h2>
      <p className="text-sm text-page-text">방문 전 저장한 예약 일정을 변경하거나 취소할 수 있습니다.</p>
      {deal ? <form onSubmit={change} className="space-y-2">
        <label htmlFor="reschedule-slot" className="block text-sm">변경할 일정</label>
        <select id="reschedule-slot" required value={slot} onChange={event => setSlot(event.target.value)} className="w-full rounded-lg border border-page-border bg-page-bg p-3">
          <option value="">다른 일정을 선택해 주세요</option>
          {deal.slots.filter(value => value !== reservation.reservedAt).map(value => <option value={value} key={value}>{formatReservationDate(value)}</option>)}
        </select>
        <button disabled={!slot} className="rounded-lg border border-page-border px-4 py-2 text-sm disabled:opacity-40">일정 변경</button>
      </form> : <p className="text-sm text-page-text">이 시술의 변경 가능한 일정이 없습니다.</p>}
      {!cancelOpen ? <button type="button" onClick={() => setCancelOpen(true)} className="text-sm text-red-700 underline">예약 취소</button> : (
        <div className="space-y-3 border-t border-page-border pt-3">
          <label htmlFor="cancellation-reason" className="block text-sm">취소 사유 (선택)</label>
          <input id="cancellation-reason" maxLength={200} value={reason} onChange={event => setReason(event.target.value)} className="w-full rounded-lg border border-page-border p-3" />
          <p className="text-xs text-page-text">취소하면 취소내역으로 이동합니다. 실제 결제가 없으므로 환불 금액도 없습니다.</p>
          <div className="flex gap-4"><button type="button" onClick={cancel} className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-700">취소 확정</button><button type="button" onClick={() => setCancelOpen(false)} className="px-3 py-2 text-sm">돌아가기</button></div>
        </div>
      )}
      {message && <p role="status" className="text-sm text-accent">{message}</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </section>
  );
}

export default function ReservationDetailPage() {
  const { reservationId } = useParams();
  const { reservations, loading, error, needsLogin, retry } = useReservations();
  const { deals } = useConsumerCatalog();
  const reservation = reservations.find(item => item.id === reservationId);
  const deal = deals.find(item => item.id === reservation?.dealId);
  const review = useBookingStore(state => state.reviews.find(item => item.reservationId === reservationId));
  let content;
  if (needsLogin) content = <EmptyState title="로그인이 필요합니다" action={<Link to="/auth/login" className="text-accent underline">로그인</Link>} />;
  else if (loading) content = <p role="status">예약 정보를 불러오는 중입니다.</p>;
  else if (error) content = <EmptyState title="예약 정보를 불러오지 못했습니다" description={error} action={<button onClick={retry} className="text-accent underline">다시 시도</button>} />;
  else if (!reservation) content = <EmptyState title="예약을 찾을 수 없습니다" description="현재 기기 또는 계정의 예약내역을 확인해 주세요." action={<Link to="/reservation" className="text-accent underline">예약내역 보기</Link>} />;
  else content = (
    <div className="space-y-5">
      {reservation.isPreview && <p className="rounded-lg border border-page-border p-3 text-sm">이 기기에 저장한 예약입니다. 매장 전송과 결제는 진행되지 않았습니다.</p>}
      <p className="font-semibold text-accent">{RESERVATION_STATUS_LABEL[reservation.status]}</p>
      <h2 className="text-xl font-semibold">{reservation.productName}</h2>
      <dl className="space-y-3 text-sm">
        <div><dt className="text-page-text">매장</dt><dd>{reservation.shopName}</dd></div>
        <div><dt className="text-page-text">예약 일정</dt><dd>{formatReservationDate(reservation.reservedAt)}</dd></div>
        <div><dt className="text-page-text">예약 금액</dt><dd>{reservation.price.toLocaleString()}원</dd></div>
        <div><dt className="text-page-text">결제 상태</dt><dd>{reservation.paymentStatus === "test_cancelled" ? "예약 취소 · 실제 환불 없음" : reservation.paymentStatus === "test" ? "결제 전" : "결제 정보 연결 준비 중"}</dd></div>
        {reservation.cancellationReason && <div><dt className="text-page-text">취소 사유</dt><dd>{reservation.cancellationReason}</dd></div>}
        <div><dt className="text-page-text">예약 번호</dt><dd className="break-all">{reservation.id}</dd></div>
      </dl>
      {reservation.isPreview && canManageReservation(reservation) && <ManageBooking key={reservation.id} reservation={reservation} deal={deal} />}
      {!reservation.isPreview && <p className="text-sm text-page-text">예약 변경·취소와 결제 확인은 연결 준비 중입니다.</p>}
      {reservation.isPreview && reservation.status === "done" && <Link to={`/reservation/${reservation.id}/review`} className="block rounded-lg bg-accent p-3 text-center text-white">{review ? "내 리뷰 수정" : "이용 리뷰 작성"}</Link>}
      <Link to="/reservation" className="inline-block text-sm text-accent underline">예약내역으로</Link>
    </div>
  );
  return <Page title="예약 상세">{content}</Page>;
}
