import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useConsumerCatalog } from "@/features/consumer/catalog";
import { KIT_DEAL_OFFSET, useKitDeal } from "@/features/consumer/dealKits";
import { EmptyState, Page } from "@/features/consumer/ui";
import type { ConsumerDeal } from "@/features/consumer/types";
import { PAYMENT_METHOD_LABEL, type Reservation } from "@/type/reservation";
import { canCompleteVisit, canManageReservation, cancellationTerm, formatReservationDate, formatSlotDay, formatSlotTime, freeCancelDeadline, paymentStatusLabel, reservationStatusLabel, slotDay, slotsFor } from "./rules";
import { useBookingStore } from "./store";
import { useReservations } from "./useReservations";
import { useDealTime } from "../dealTiming";

const message = (caught: unknown, fallback: string) => caught instanceof Error ? caught.message : fallback;

function ManageBooking({ reservation, deal }: { reservation: Reservation; deal?: ConsumerDeal | null }) {
  const [day, setDay] = useState("");
  const [slot, setSlot] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const reservations = useBookingStore(state => state.reservations);
  const cancelReservation = useBookingStore(state => state.cancelReservation);
  const rescheduleReservation = useBookingStore(state => state.rescheduleReservation);
  const now = useDealTime();
  const taken = new Set(reservations.filter(item => item.id !== reservation.id && item.status !== "cancelled" && item.dealId === reservation.dealId).map(item => item.reservedAt));
  const slots = deal && !reservation.groupId ? slotsFor(deal, reservation.kind ?? "timedeal").filter(value => value !== reservation.reservedAt && Date.parse(value) > now && !taken.has(value)) : [];
  const days = [...new Set(slots.map(slotDay))];
  const times = slots.filter(value => slotDay(value) === day);
  const term = cancellationTerm(reservation, now);
  const deadline = freeCancelDeadline(reservation);
  const run = async (action: () => Promise<void>, done: string, fallback: string) => {
    if (busy) return;
    setBusy(true); setError(null); setNotice(null);
    try { await action(); setNotice(done); } catch (caught) { setError(message(caught, fallback)); } finally { setBusy(false); }
  };
  const change = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void run(async () => {
      if (!deal) throw new Error("이 예약의 변경 가능한 일정을 불러오지 못했습니다.");
      await rescheduleReservation(reservation.id, deal, slot);
      setDay(""); setSlot("");
    }, "예약 일정을 변경했습니다.", "일정을 변경하지 못했습니다.");
  };
  return (
    <section className="space-y-4 rounded-xl border border-page-border p-4">
      <h2 className="font-semibold">예약 관리</h2>
      {reservation.groupId ? <p className="text-sm text-page-text">패키지 예약은 매장별 일정이 이어져 있어 일정만 바꿀 수 없어요. 취소 후 다시 예약해 주세요.</p>
        : days.length ? <form onSubmit={change} className="space-y-2">
          <label htmlFor="reschedule-day" className="block text-sm">변경할 날짜</label>
          <select id="reschedule-day" required value={day} onChange={event => { setDay(event.target.value); setSlot(""); }} className="w-full rounded-lg border border-page-border bg-page-bg p-3">
            <option value="">날짜를 선택해 주세요</option>
            {days.map(value => <option value={value} key={value}>{formatSlotDay(`${value}T12:00:00+09:00`)}</option>)}
          </select>
          <label htmlFor="reschedule-slot" className="block text-sm">변경할 시간</label>
          <select id="reschedule-slot" required disabled={!day} value={slot} onChange={event => setSlot(event.target.value)} className="w-full rounded-lg border border-page-border bg-page-bg p-3 disabled:opacity-50">
            <option value="">{day ? "시간을 선택해 주세요" : "날짜를 먼저 선택해 주세요"}</option>
            {times.map(value => <option value={value} key={value}>{formatSlotTime(value)}</option>)}
          </select>
          <button disabled={!slot || busy} className="rounded-lg border border-page-border px-4 py-2 text-sm disabled:opacity-40">일정 변경</button>
        </form> : <p className="text-sm text-page-text">{deal === undefined ? "변경 가능한 일정을 불러오는 중입니다." : "지금 변경할 수 있는 다른 일정이 없습니다."}</p>}
      {!cancelOpen ? <button type="button" onClick={() => setCancelOpen(true)} className="text-sm text-red-700 underline">예약 취소</button> : (
        <div className="space-y-3 border-t border-page-border pt-3">
          <label htmlFor="cancellation-reason" className="block text-sm">취소 사유 (선택)</label>
          <input id="cancellation-reason" maxLength={200} value={reason} onChange={event => setReason(event.target.value)} className="w-full rounded-lg border border-page-border p-3" />
          <p className="text-xs text-page-text">{term === "free"
            ? `무료 취소 기한${deadline ? `(${formatReservationDate(deadline)})` : ""} 안이에요. 시연 예약이라 청구·환불은 없고, 사용한 쿠폰과 포인트는 돌려드려요.`
            : "무료 취소 기한이 지났어요. 실제 결제였다면 매장 규정에 따른 확인이 필요합니다(환불 기준 미정). 시연 예약이라 청구·환불은 없어요."}
            {reservation.groupId ? " 패키지의 모든 매장 예약이 함께 취소됩니다." : ""}</p>
          <div className="flex gap-4"><button type="button" disabled={busy} onClick={() => void run(async () => { await cancelReservation(reservation.id, reason); setCancelOpen(false); }, "예약을 취소했습니다.", "예약을 취소하지 못했습니다.")} className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-700 disabled:opacity-40">취소 확정</button><button type="button" onClick={() => setCancelOpen(false)} className="px-3 py-2 text-sm">돌아가기</button></div>
        </div>
      )}
      {notice && <p role="status" className="text-sm text-accent">{notice}</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </section>
  );
}

function VisitCheck({ reservation }: { reservation: Reservation }) {
  const completeVisit = useBookingStore(state => state.completeVisit);
  const now = useDealTime();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ready = canCompleteVisit(reservation, now);
  return (
    <section className="space-y-2 rounded-xl border border-page-border p-4">
      <h2 className="font-semibold">이용 완료 확인 (시연)</h2>
      <p className="text-sm text-page-text">{ready
        ? "실제 서비스에서는 매장이 시술 완료를 확인해야 리뷰를 쓸 수 있어요. 시연에서는 예약 시간이 끝난 뒤 직접 완료로 표시합니다."
        : `예약 시간이 끝난 뒤(${formatReservationDate(reservation.endAt)} 이후)에 이용 완료로 표시할 수 있어요.`}</p>
      <button type="button" disabled={!ready || busy} onClick={() => { setBusy(true); setError(null); completeVisit(reservation.id).catch(caught => setError(message(caught, "이용 완료로 바꾸지 못했습니다."))).finally(() => setBusy(false)); }} className="rounded-lg border border-page-border px-4 py-2 text-sm disabled:opacity-40">이용 완료로 표시</button>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </section>
  );
}

export default function ReservationDetailPage() {
  const { reservationId } = useParams();
  const { reservations, loading, error, needsLogin, retry } = useReservations();
  const { deals, loading: catalogLoading } = useConsumerCatalog();
  const now = useDealTime();
  const reservation = reservations.find(item => item.id === reservationId);
  const kitId = reservation?.kind === "package" && reservation.dealId ? reservation.dealId - KIT_DEAL_OFFSET : undefined;
  const kit = useKitDeal(kitId);
  const deal = kitId ? (kit.loading ? undefined : kit.deal) : catalogLoading ? undefined : deals.find(item => item.id === reservation?.dealId) ?? null;
  const review = useBookingStore(state => state.reviews.find(item => item.reservationId === reservationId));
  const group = reservation?.groupId ? reservations.filter(item => item.groupId === reservation.groupId).sort((a, b) => (a.legIndex ?? 0) - (b.legIndex ?? 0)) : [];
  let content;
  if (needsLogin) content = <EmptyState title="로그인이 필요합니다" action={<Link to="/auth/login" className="text-accent underline">로그인</Link>} />;
  else if (loading) content = <p role="status">예약 정보를 불러오는 중입니다.</p>;
  else if (error) content = <EmptyState title="예약 정보를 불러오지 못했습니다" description={error} action={<button onClick={retry} className="text-accent underline">다시 시도</button>} />;
  else if (!reservation) content = <EmptyState title="예약을 찾을 수 없습니다" description="현재 기기 또는 계정의 예약내역을 확인해 주세요." action={<Link to="/reservation" className="text-accent underline">예약내역 보기</Link>} />;
  else {
    const original = reservation.originalPrice ?? reservation.price;
    const paid = reservation.paidAmount ?? reservation.price;
    content = (
      <div className="space-y-5">
        {reservation.isPreview && <p role="note" className="rounded-lg border border-page-border p-3 text-sm">시연 예약입니다. 이 기기에만 저장되어 매장에 전달되지 않았고, 실제로 결제·청구되지 않았습니다.</p>}
        <p className="font-semibold text-accent">{reservationStatusLabel(reservation, now)}</p>
        <h2 className="text-xl font-semibold">{reservation.productName}</h2>
        <dl className="space-y-3 text-sm">
          <div><dt className="text-page-text">매장</dt><dd><Link to={`/business/${reservation.businessId}`} className="underline underline-offset-4">{reservation.shopName}</Link>{reservation.legCount ? ` · 패키지 ${(reservation.legIndex ?? 0) + 1}/${reservation.legCount}` : ""}</dd></div>
          {reservation.address && <div><dt className="text-page-text">주소</dt><dd>{reservation.address}</dd></div>}
          <div><dt className="text-page-text">예약 일정</dt><dd>{formatReservationDate(reservation.reservedAt)} – {formatSlotTime(reservation.endAt)}</dd></div>
          {group.length > 1 && <div><dt className="text-page-text">패키지 방문 순서</dt><dd><ol className="space-y-1">{group.map(item => <li key={item.id}><Link to={`/reservation/${item.id}`} className="underline underline-offset-4">{(item.legIndex ?? 0) + 1}. {item.shopName}</Link> · {formatReservationDate(item.reservedAt)}</li>)}</ol></dd></div>}
          {reservation.staffName && <div><dt className="text-page-text">담당자 (예시)</dt><dd>{reservation.staffName}</dd></div>}
          <div><dt className="text-page-text">예약 금액</dt><dd>{original > reservation.price && <s className="mr-2 text-page-text">{original.toLocaleString()}원</s>}{reservation.price.toLocaleString()}원</dd></div>
          {!!reservation.couponDiscount && <div><dt className="text-page-text">쿠폰 할인</dt><dd>−{reservation.couponDiscount.toLocaleString()}원</dd></div>}
          {!!reservation.pointsUsed && <div><dt className="text-page-text">포인트 사용</dt><dd>−{reservation.pointsUsed.toLocaleString()}P</dd></div>}
          <div><dt className="text-page-text">결제</dt><dd>{paymentStatusLabel(reservation)}{reservation.paymentMethod ? ` · 선택한 수단 ${PAYMENT_METHOD_LABEL[reservation.paymentMethod]}` : ""}</dd></div>
          {original > paid && reservation.status !== "cancelled" && <div><dt className="text-page-text">할인 혜택</dt><dd className="text-accent">{(original - paid).toLocaleString()}원 할인</dd></div>}
          {reservation.policy && <div><dt className="text-page-text">예약 당시 취소 규정</dt><dd>{reservation.policy.text}</dd></div>}
          {reservation.cancelTerm && <div><dt className="text-page-text">취소 시점</dt><dd>{reservation.cancelTerm === "free" ? "무료 취소 기한 안" : "무료 취소 기한 이후 · 매장 규정 확인 필요"}</dd></div>}
          {reservation.cancellationReason && <div><dt className="text-page-text">취소 사유</dt><dd>{reservation.cancellationReason}</dd></div>}
          <div><dt className="text-page-text">예약 번호</dt><dd className="break-all">{reservation.id}</dd></div>
        </dl>
        {reservation.isPreview && canManageReservation(reservation, now) && <ManageBooking key={reservation.id} reservation={reservation} deal={deal} />}
        {reservation.isPreview && (reservation.status === "confirmed" || reservation.status === "waiting") && <VisitCheck reservation={reservation} />}
        {!reservation.isPreview && <p className="text-sm text-page-text">이 예약의 변경·취소는 매장에 문의해 주세요.</p>}
        {reservation.isPreview && reservation.status === "done" && reservation.completedAt && <Link to={`/reservation/${reservation.id}/review`} className="block rounded-lg bg-accent p-3 text-center text-white">{review ? "내 리뷰 수정" : "이용 리뷰 작성"}</Link>}
        <Link to="/reservation" className="inline-block text-sm text-accent underline">예약내역으로</Link>
      </div>
    );
  }
  return <Page title="예약 상세">{content}</Page>;
}
