import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { CalendarDays, Check, ChevronDown, X } from "lucide-react";
import BookingSummaryCard from "./BookingSummaryCard";
import BookingSchedulePicker from "./BookingSchedulePicker";
import { useConsumerCatalog } from "@/features/consumer/catalog";
import { KIT_DEAL_OFFSET, useKitDeal } from "@/features/consumer/dealKits";
import { EmptyState, Page } from "@/features/consumer/ui";
import type { ConsumerDeal } from "@/features/consumer/types";
import type { Reservation } from "@/type/reservation";
import { canCompleteVisit, canManageReservation, cancellationTerm, formatReservationDate, formatSlotTime, freeCancelDeadline, reservationStatusLabel, slotDay, slotsFor } from "./rules";
import { useBookingStore } from "./store";
import { useOwnLocalReservations, useReservations } from "./useReservations";
import { useDealTime } from "../dealTiming";

const message = (caught: unknown, fallback: string) => caught instanceof Error ? caught.message : fallback;

function ManageBooking({ reservation, deal }: { reservation: Reservation; deal?: ConsumerDeal | null }) {
  const [day, setDay] = useState("");
  const [slot, setSlot] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const reservations = useOwnLocalReservations();
  const cancelReservation = useBookingStore(state => state.cancelReservation);
  const rescheduleReservation = useBookingStore(state => state.rescheduleReservation);
  const now = useDealTime();
  const taken = new Set(reservations.filter(item => item.id !== reservation.id && item.status !== "cancelled" && item.dealId === reservation.dealId).map(item => item.reservedAt));
  const slots = deal && !reservation.groupId ? slotsFor(deal, reservation.kind ?? "timedeal").filter(value => value !== reservation.reservedAt && Date.parse(value) > now && !taken.has(value)) : [];
  const days = [...new Set(slots.map(slotDay))];
  const activeDay = days.includes(day) ? day : days[0] ?? "";
  const chosenSlot = slots.some(value => value === slot && slotDay(value) === activeDay) ? slot : "";
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
      await rescheduleReservation(reservation.id, deal, chosenSlot);
      setChangeOpen(false);
      setDay(""); setSlot("");
    }, "예약 일정을 변경했습니다.", "일정을 변경하지 못했습니다.");
  };
  return (
    <section aria-label="예약 관리" className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <button type="button" aria-expanded={changeOpen} aria-controls="booking-change" disabled={busy} onClick={() => { setChangeOpen(!changeOpen); setCancelOpen(false); }} className={`flex min-h-12 items-center justify-center gap-2 rounded-2xl border text-sm font-semibold transition ${changeOpen ? "border-accent bg-accent/5 text-accent" : "border-page-border text-page-heading hover:bg-gray-50"}`}><CalendarDays size={16} />일정 변경</button>
        <button type="button" aria-expanded={cancelOpen} aria-controls="booking-cancel" disabled={busy} onClick={() => { setCancelOpen(!cancelOpen); setChangeOpen(false); }} className={`flex min-h-12 items-center justify-center gap-2 rounded-2xl border text-sm font-semibold transition ${cancelOpen ? "border-accent bg-accent/5 text-accent" : "border-page-border text-page-text hover:bg-gray-50"}`}><X size={16} />예약 취소</button>
      </div>
      {changeOpen && <div id="booking-change" className="rounded-2xl border border-page-border p-4">
        <h2 className="mb-3 text-sm font-bold text-page-heading">일정 변경</h2>
        {reservation.groupId ? <p className="text-sm leading-6 text-page-text">패키지는 방문 일정이 연결되어 있어요. 취소 후 원하는 일정으로 다시 예약해 주세요.</p>
          : days.length ? <form onSubmit={change} className="space-y-3">
            <BookingSchedulePicker slots={slots} day={activeDay} slot={chosenSlot} onDayChange={value => { setDay(value); setSlot(""); }} onSlotChange={setSlot} dateLabel="변경할 날짜" timeLabel="변경할 시간" name="reschedule" disabled={busy} />
            <button disabled={!chosenSlot || busy} className="min-h-12 w-full rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">변경 내용 저장</button>
          </form> : <p className="text-sm text-page-text">{deal === undefined ? "변경 가능한 일정을 불러오는 중입니다." : "지금 변경할 수 있는 다른 일정이 없습니다."}</p>}
      </div>}
      {cancelOpen && <div id="booking-cancel" className="space-y-3 rounded-2xl border border-page-border p-4">
        <h2 className="font-bold text-page-heading">예약을 취소할까요?</h2>
        <p className="text-xs leading-5 text-page-text">{term === "free"
          ? `무료 취소 기한${deadline ? `(${formatReservationDate(deadline)})` : ""} 안이에요.`
          : "무료 취소 기한이 지났어요. 매장 취소 규정을 확인해 주세요."}
          {reservation.groupId ? " 패키지의 모든 예약이 함께 취소됩니다." : ""}</p>
        <label htmlFor="cancellation-reason" className="block text-xs font-medium">취소 사유 (선택)</label>
        <input id="cancellation-reason" maxLength={200} value={reason} onChange={event => setReason(event.target.value)} placeholder="취소 사유를 알려주세요" className="min-h-12 w-full rounded-xl border border-page-border p-3 text-sm" />
        <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setCancelOpen(false)} className="min-h-11 rounded-xl bg-gray-50 text-sm font-semibold">돌아가기</button><button type="button" disabled={busy} onClick={() => void run(async () => { await cancelReservation(reservation.id, reason); setCancelOpen(false); }, "예약을 취소했습니다.", "예약을 취소하지 못했습니다.")} className="min-h-11 rounded-xl bg-accent text-sm font-semibold text-white disabled:opacity-40">취소 확정</button></div>
      </div>}
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
  if (!canCompleteVisit(reservation, now)) return null;
  return (
    <section className="space-y-3 rounded-2xl bg-[#fff5f8] p-5">
      <h2 className="text-sm font-bold text-page-heading">방문은 어떠셨나요?</h2>
      <p className="text-xs leading-5 text-page-text">이용 완료를 확인하고 후기를 남겨주세요.</p>
      <button type="button" disabled={busy} onClick={() => { setBusy(true); setError(null); completeVisit(reservation.id).catch(caught => setError(message(caught, "이용 완료로 바꾸지 못했습니다."))).finally(() => setBusy(false)); }} className="min-h-11 w-full rounded-xl bg-white px-4 py-2 text-sm font-semibold text-accent disabled:opacity-40">이용 완료로 표시</button>
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
  else if (!reservation) content = <EmptyState title="예약을 찾을 수 없습니다" description="내 예약내역에서 다시 확인해 주세요." action={<Link to="/reservation" className="text-accent underline">예약내역 보기</Link>} />;
  else {
    const cancelled = reservation.status === "cancelled";
    content = (
      <div className="mx-auto max-w-md space-y-5 text-page-heading">
        <div className="flex items-center justify-between gap-3">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${cancelled ? "bg-gray-100 text-page-text" : "bg-accent/10 text-accent"}`}>{cancelled ? <X size={13} /> : <Check size={13} />}{reservationStatusLabel(reservation, now)}</span>
          {reservation.legCount && <span className="text-xs text-page-text">패키지 {(reservation.legIndex ?? 0) + 1}/{reservation.legCount}</span>}
        </div>
        <BookingSummaryCard reservation={reservation} showAddress />
        {group.length > 1 && <nav aria-label="패키지 방문 순서" className="rounded-2xl bg-[#faf7f8] p-4">
          <h2 className="mb-3 text-xs font-bold">패키지 방문 순서</h2>
          <ol className="space-y-3">{group.map((visit, index) => <li key={visit.id}><Link to={`/reservation/${visit.id}`} aria-current={visit.id === reservation.id ? "page" : undefined} className={`flex items-center gap-2 text-xs ${visit.id === reservation.id ? "font-bold text-accent" : "text-page-text"}`}><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white">{index + 1}</span><span>{visit.shopName} · {formatSlotTime(visit.reservedAt)}</span></Link></li>)}</ol>
        </nav>}
        {reservation.isPreview && canManageReservation(reservation, now) && <ManageBooking key={reservation.id} reservation={reservation} deal={deal} />}
        {reservation.isPreview && (reservation.status === "confirmed" || reservation.status === "waiting") && <VisitCheck reservation={reservation} />}
        {reservation.isPreview && reservation.status === "done" && reservation.completedAt && <Link to={`/reservation/${reservation.id}/review`} className="flex min-h-12 items-center justify-center rounded-2xl bg-accent px-4 text-sm font-bold text-white">{review ? "내 리뷰 수정" : "이용 리뷰 작성"}</Link>}
        {cancelled && <p className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-page-text">취소된 예약입니다. 다음에 다시 만나요.</p>}
        {!reservation.isPreview && <p className="text-xs text-page-text">변경·취소는 매장에 문의해 주세요.</p>}
        <details className="group rounded-2xl border border-page-border px-4 text-page-text">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 text-xs font-medium [&::-webkit-details-marker]:hidden">예약 정보 및 취소 규정<ChevronDown size={16} className="transition group-open:rotate-180" /></summary>
          <dl className="space-y-3 pb-4 text-xs leading-5">
            {reservation.policy && <div><dt className="font-semibold text-page-heading">취소 규정</dt><dd className="mt-1">{reservation.policy.text}</dd></div>}
            {reservation.cancelTerm && <div><dt className="font-semibold text-page-heading">취소 시점</dt><dd>{reservation.cancelTerm === "free" ? "무료 취소 기한 안" : "무료 취소 기한 이후 · 매장 규정 확인 필요"}</dd></div>}
            {reservation.cancellationReason && <div><dt className="font-semibold text-page-heading">취소 사유</dt><dd>{reservation.cancellationReason}</dd></div>}
            <div><dt className="font-semibold text-page-heading">예약 번호</dt><dd className="mt-1 break-all font-mono text-[11px]">{reservation.id.replace(/^preview-/, "").toUpperCase()}</dd></div>
          </dl>
        </details>
        <Link to="/reservation" className="flex min-h-11 items-center justify-center rounded-2xl text-sm text-page-text hover:bg-gray-50">예약내역으로</Link>
      </div>
    );
  }
  return <Page title="예약 상세">{content}</Page>;
}
