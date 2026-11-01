import { clearPendingBooking, readPendingBooking, savePendingBooking, type BookingRequest } from "./pendingBooking";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useConsumerCatalog } from "@/features/consumer/catalog";
import { useKitDeal } from "@/features/consumer/dealKits";
import type { ConsumerDeal } from "@/features/consumer/types";
import { EmptyState, Page } from "@/features/consumer/ui";
import { readBusinessStaff, type ConsumerBusiness } from "@/features/consumer/discovery/business";
import { RequireLogin } from "@/features/consumer/auth/loginGate";
import { useAuthStore } from "@/store/useAuthStore";
import { formatSlotTime, parseCancellationPolicy, slotDay } from "./rules";
import BookingSchedulePicker from "./BookingSchedulePicker";
import { quoteFor, sameQuote, type AgreedQuote } from "./store";
import { BookingResponseUnknownError, createSharedBooking } from "@/api/consumerBooking";
import { useSharedSlots } from "./useSharedSlots";
import { legTimes, PROVISIONAL_TRAVEL_MINUTES } from "./packageSchedule";
import { bookingOffer, useDealTime } from "../dealTiming";

const KIND_LABEL = { timedeal: "타임딜 특가", regular: "정상가 예약", package: "딜키트" } as const;
const choiceClass = "relative cursor-pointer border text-center transition has-[:checked]:border-accent has-[:checked]:bg-accent has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/40";

function CheckoutForm({ deal }: { deal: ConsumerDeal }) {
  const navigate = useNavigate();
  const now = useDealTime();
  const userId = useAuthStore(state => state.user?.id);
  const baseOffer = bookingOffer(deal, now);
  const legs = deal.legs ?? [];
  const travelMinutes = legs.reduce((total, leg, index) => total + (index > 0 && leg.businessId !== legs[index - 1].businessId ? PROVISIONAL_TRAVEL_MINUTES : 0), 0);
  const [staff, setStaff] = useState<ConsumerBusiness["staff"]>([]);
  useEffect(() => {
    if (legs.length) return;
    let current = true;
    // Staff are optional; without registered staff the shop assigns one.
    readBusinessStaff(deal.businessId).then(rows => { if (current) setStaff(rows); }, () => { if (current) setStaff([]); });
    return () => { current = false; };
  }, [deal.businessId, legs.length]);
  const [staffId, setStaffId] = useState<number | undefined>();
  const [day, setDay] = useState("");
  const [slot, setSlot] = useState("");
  const [agreedQuote, setAgreedQuote] = useState<AgreedQuote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pending, setPending] = useState<BookingRequest | null>(() => userId ? readPendingBooking(userId, deal.id) : null);
  const submitLock = useRef(false);

  const slots = (deal.regularSlots?.length ? deal.regularSlots : baseOffer.slots).filter(value => Date.parse(value) > now);
  const days = [...new Set(slots.map(slotDay))];
  // The first open day is chosen by default, as on other booking services.
  const activeDay = days.includes(day) ? day : days[0] ?? "";
  const shared = useSharedSlots(deal.id, activeDay, staffId);
  const available = new Set(shared.rows.filter(row => row.available).map(row => new Date(row.start_at).toISOString()));
  const times = slots.filter(value => slotDay(value) === activeDay && available.has(new Date(value).toISOString()));
  const chosenSlot = times.includes(slot) ? slot : "";
  const selected = shared.rows.find(row => chosenSlot && Date.parse(row.start_at) === Date.parse(chosenSlot));
  const offer = selected ? { ...baseOffer, kind: selected.kind, price: selected.price, originalPrice: selected.kind === "regular" ? (deal.regularPrice ?? deal.originalPrice) : deal.originalPrice, discount: Math.max(0, (selected.kind === "regular" ? (deal.regularPrice ?? deal.originalPrice) : deal.originalPrice) - selected.price) } : baseOffer;
  const quote = quoteFor(offer);
  // Agreement covers exactly the price shown; if the deal ends and the price changes, it is asked again.
  const agreed = agreedQuote !== null && sameQuote(agreedQuote, quote);
  const agreementLapsed = agreedQuote !== null && !agreed;
  const policy = parseCancellationPolicy(legs[0]?.cancellationPolicy ?? deal.cancellationPolicy);
  const plan = chosenSlot && legs.length ? legTimes(Date.parse(chosenSlot), legs) : [];

  const sendBooking = async (input: BookingRequest) => {
    if (submitLock.current || !userId) return;
    submitLock.current = true;
    setSubmitting(true);
    setError(null);
    try {
      // Persist before sending. If storage is unavailable, do not submit an unrecoverable request.
      savePendingBooking(userId, input);
      setPending(input);
      const id = await createSharedBooking(input);
      clearPendingBooking(userId, deal.id);
      if (useAuthStore.getState().user?.id === userId) navigate(`/booking/complete/${id}`, { replace: true });
    } catch (caught) {
      if (caught instanceof BookingResponseUnknownError) {
        setError("예약 접수 여부를 아직 확인하지 못했어요. ‘예약 결과 확인’을 누르면 같은 요청으로 확인하므로 중복 예약되지 않아요.");
      } else {
        clearPendingBooking(userId, deal.id);
        setPending(null);
        setAgreedQuote(null);
        shared.retry();
        setError(caught instanceof Error ? caught.message : "예약하지 못했습니다. 다시 시도해 주세요.");
      }
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pending && agreed && agreedQuote && chosenSlot && userId) void sendBooking({ offerId: deal.id, slot: chosenSlot, staffId, kind: agreedQuote.kind, price: agreedQuote.price, requestId: crypto.randomUUID() });
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-md space-y-7">
      <fieldset disabled={Boolean(pending) || submitting} className="min-w-0 space-y-7">
      <section className="rounded-2xl border border-page-border p-4">
        <p className="text-xs font-bold text-accent">{selected || deal.kitId ? KIND_LABEL[offer.kind] : "방문 시간별 요금 안내"}</p>
        <p className="mt-1 text-sm text-page-text">{deal.businessName}</p>
        <h2 className="mt-1 text-lg font-black">{deal.serviceName}</h2>
        {deal.address && <p className="mt-2 text-sm text-page-text">{deal.address}</p>}
        {deal.timeWindow && <p className="mt-2 text-xs text-page-text">선택한 일정에 적용되는 요금을 확인해 주세요. 할인은 타임딜 수량이 남아 있을 때 아래 방문 시간 안에 시작하는 시술에 적용돼요: {deal.timeWindow}입니다.</p>}
        {deal.kitId ? <Link to={`/package/detail/${deal.kitId}`} className="mt-3 inline-block text-sm text-accent underline">딜키트 상세 보기</Link> : <Link to={`/business/${deal.businessId}`} className="mt-3 inline-block text-sm text-accent underline">매장 상세 보기</Link>}
      </section>

      {legs.length > 0 && <section className="space-y-2">
        <h2 className="font-bold">방문 순서</h2>
        <ol className="space-y-2 text-sm">
          {legs.map((leg, index) => <li key={`${leg.businessId}-${index}`} className="rounded-xl border border-page-border p-3">
            <strong>{index + 1}. {leg.businessName}</strong> · {leg.serviceNames.join(" + ")}
            <span className="block text-xs text-page-text">예상 소요 약 {leg.durationMinutes}분{plan[index] ? ` · ${formatSlotTime(new Date(plan[index].start).toISOString())}–${formatSlotTime(new Date(plan[index].end).toISOString())}` : ""}</span>
          </li>)}
        </ol>
        {legs.some((leg, index) => index > 0 && leg.businessId !== legs[index - 1].businessId) && <p className="text-xs text-page-text">매장 간 이동시간 {PROVISIONAL_TRAVEL_MINUTES}분을 포함한 일정입니다. 담당자는 각 매장에서 배정합니다.</p>}
      </section>}

      <BookingSchedulePicker slots={slots} unavailableSlots={slots.filter(value => slotDay(value) === activeDay && !times.includes(value))} disabled={shared.loading} day={activeDay} slot={chosenSlot} onDayChange={value => { setDay(value); setSlot(""); }} onSlotChange={setSlot} slotLabels={Object.fromEntries(shared.rows.map(row => [new Date(row.start_at).toISOString(), `${row.kind === "timedeal" ? "특가 " : ""}${row.price.toLocaleString()}원`]))} />
      {shared.loading && <p role="status" className="text-sm text-page-text">담당자와 예약 가능한 시간을 확인하고 있어요.</p>}
      {shared.error && <div role="alert" className="text-sm text-red-700">{shared.error} <button type="button" onClick={shared.retry} className="underline">다시 확인</button></div>}
      {days.length > 0 && <p className="text-xs text-page-text">예상 소요 시간 {legs.length ? legs.reduce((sum, leg) => sum + leg.durationMinutes, 0) + travelMinutes : deal.durationMinutes ?? 60}분{travelMinutes > 0 ? ` (이동 ${travelMinutes}분 포함)` : ""} · 2주 이내 예약 가능한 시간만 표시됩니다.</p>}

      {!legs.length && staff.length > 0 && <section className="space-y-2">
        <h2 className="font-bold">담당자 <span className="text-xs font-normal text-page-text">(선택)</span></h2>
        <div role="radiogroup" aria-label="담당자" className="flex flex-wrap gap-2">
          {[{ id: 0, name: "", position: "" }, ...staff].map(member => <label key={member.id} className={`${choiceClass} rounded-full border-page-border px-4 py-2 text-sm`}>
            <input type="radio" name="booking-staff" value={member.id} checked={(staffId ?? 0) === member.id} onChange={() => { setStaffId(member.id || undefined); setSlot(""); }} className="sr-only" />
            {member.name ? `${member.name} ${member.position}` : "매장 배정"}
          </label>)}
        </div>
      </section>}

      <section className="space-y-3 rounded-2xl bg-gray-50 p-4">
        <h2 className="font-bold">예약 금액</h2>
        {!selected && <p className="text-sm text-page-text">방문 시간을 선택하면 해당 시간의 요금이 확정됩니다.</p>}
        {(selected || deal.kitId) && <dl className="space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-page-text">정상가</dt><dd>{offer.originalPrice.toLocaleString()}원</dd></div>
          {offer.discount > 0 && <div className="flex justify-between"><dt className="text-page-text">{offer.kind === "package" ? "딜키트 할인" : "타임딜 할인"}</dt><dd className="text-accent">−{offer.discount.toLocaleString()}원</dd></div>}
          <div className="flex items-end justify-between border-t border-page-border pt-3"><dt className="font-semibold">방문 시 결제할 금액</dt><dd className="text-xl font-black text-accent">{offer.price.toLocaleString()}원</dd></div>
        </dl>}
        <p className="text-xs text-page-text">예약할 때는 결제하지 않아요. 방문 후 매장에서 결제해 주세요.</p>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold">취소 규정</h2>
        <p className="text-sm text-page-text">{policy.text}</p>
        <p className="text-xs text-page-text">{policy.freeCancelHours !== null ? `방문 ${policy.freeCancelHours}시간 전까지는 무료로 취소할 수 있어요.` : "방문 시작 전까지 예약내역에서 변경·취소할 수 있어요."}</p>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={agreed} disabled={!chosenSlot} onChange={event => setAgreedQuote(event.target.checked ? quote : null)} className="mt-1" />
          <span>예약 내용과 취소 규정을 확인했습니다. (필수)</span>
        </label>
        {agreementLapsed && <p role="alert" className="text-sm text-red-700">선택한 일정의 예약 금액이 바뀌었어요. 바뀐 금액을 확인하고 다시 동의해 주세요.</p>}
      </section>

      </fieldset>
      {pending && <div role="status" className="space-y-3 rounded-xl bg-amber-50 p-4 text-sm"><p>예약 접수 여부를 확인해 주세요. 확인이 끝날 때까지 선택한 일정과 금액은 유지됩니다.</p><p className="font-semibold">{slotDay(pending.slot)} {formatSlotTime(pending.slot)} · {KIND_LABEL[pending.kind]} · {pending.price.toLocaleString()}원</p><button type="button" disabled={submitting} onClick={() => void sendBooking(pending)} className="rounded-full bg-accent px-5 py-3 font-bold text-white disabled:opacity-40">{submitting ? "예약 확인 중…" : "예약 결과 확인"}</button><Link to="/reservation" className="ml-3 underline">예약내역 보기</Link></div>}
      {error && <div role="alert" className="rounded-xl border border-red-300 p-3 text-sm text-red-700"><p className="font-semibold">{pending ? "예약 결과 확인이 필요합니다." : "예약하지 못했습니다."}</p><p className="mt-1">{error}</p></div>}
      <div className="space-y-2">
        <button type="submit" disabled={Boolean(pending) || submitting || !chosenSlot || !agreed} className="w-full rounded-full bg-accent py-3.5 text-base font-bold text-white disabled:opacity-40">{submitting ? "예약하는 중…" : !chosenSlot ? "방문 시간을 선택해 주세요" : "예약하기"}</button>
      </div>
    </form>
  );
}

function CheckoutContent() {
  const { dealId, kitId } = useParams();
  const { deals, loading, error, refreshError, retry } = useConsumerCatalog();
  const kit = useKitDeal(kitId ? Number(kitId) : undefined);
  const deal = kitId ? kit.deal : deals.find(item => item.id === Number(dealId));
  const isLoading = kitId ? kit.loading : loading;
  const loadError = kitId ? kit.error : error;
  return isLoading ? <p role="status">예약 정보를 불러오는 중입니다.</p>
    : loadError ? <EmptyState title="예약 정보를 불러오지 못했습니다" description={loadError} action={<div className="flex justify-center gap-4">{!kitId && <button type="button" onClick={retry} className="text-accent underline">다시 시도</button>}<Link to="/search" className="text-accent underline">다시 찾아보기</Link></div>} />
    : !deal ? <EmptyState title="예약할 상품을 찾을 수 없습니다" description={kitId ? kit.reason ?? undefined : undefined} action={<Link to={kitId ? "/package" : "/search"} className="text-accent underline">{kitId ? "딜키트 둘러보기" : "타임딜 둘러보기"}</Link>} />
    : <>{refreshError && <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm">최신 수량을 확인하지 못했어요. 선택한 내용은 유지됩니다. <button type="button" onClick={retry} className="underline">다시 확인</button></p>}<CheckoutForm key={`${deal.id}:${useAuthStore.getState().user?.id}`} deal={deal} /></>;
}

export default function CheckoutPage() {
  return (
    <Page title="예약하기">
      <RequireLogin><CheckoutContent /></RequireLogin>
    </Page>
  );
}
