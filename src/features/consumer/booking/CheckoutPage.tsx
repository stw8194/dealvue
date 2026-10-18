import { useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useConsumerCatalog } from "@/features/consumer/catalog";
import { useKitDeal } from "@/features/consumer/dealKits";
import type { ConsumerDeal } from "@/features/consumer/types";
import { EmptyState, Page } from "@/features/consumer/ui";
import { isCouponUsable, useCouponStore } from "@/features/consumer/coupons";
import { pointBalance, useEngagementStore } from "@/features/consumer/engagement/store";
import { sampleStaff } from "@/features/consumer/staff";
import { PAYMENT_METHOD_LABEL, type PaymentMethod } from "@/type/reservation";
import { formatSlotDay, formatSlotTime, parseCancellationPolicy, slotDay } from "./rules";
import { QuoteChangedError, useBookingStore, type AgreedQuote } from "./store";
import { legTimes, PROVISIONAL_TRAVEL_MINUTES } from "./packageSchedule";
import { bookingOffer, useDealTime } from "../dealTiming";

const KIND_LABEL = { timedeal: "타임딜 특가", regular: "정상가 예약", package: "딜키트" } as const;

function sameQuote(a: AgreedQuote, b: AgreedQuote) {
  return a.kind === b.kind && a.price === b.price && a.couponDiscount === b.couponDiscount && a.pointsUsed === b.pointsUsed && a.total === b.total;
}

function CheckoutForm({ deal }: { deal: ConsumerDeal }) {
  const navigate = useNavigate();
  const now = useDealTime();
  const reservations = useBookingStore(state => state.reservations);
  const createReservation = useBookingStore(state => state.createReservation);
  const coupons = useCouponStore(state => state.coupons);
  const balance = pointBalance(useEngagementStore(state => state.pointHistory));
  const offer = bookingOffer(deal, now);
  const legs = deal.legs ?? [];
  const staff = useMemo(() => sampleStaff(deal.businessId, deal.category), [deal.businessId, deal.category]);
  const [staffName, setStaffName] = useState("");
  const [day, setDay] = useState("");
  const [slot, setSlot] = useState("");
  const [couponId, setCouponId] = useState("");
  const [points, setPoints] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [agreedQuote, setAgreedQuote] = useState<AgreedQuote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [requestKey] = useState(() => crypto.randomUUID());
  const submitLock = useRef(false);

  const booked = new Set(reservations.filter(item => item.status !== "cancelled" && item.dealId === deal.id).map(item => item.reservedAt));
  const slots = offer.slots.filter(value => Date.parse(value) > now && !booked.has(value));
  const days = [...new Set(slots.map(slotDay))];
  const times = slots.filter(value => slotDay(value) === day);
  const usableCoupons = coupons.filter(coupon => isCouponUsable(coupon, offer.price, now));
  const coupon = usableCoupons.find(item => item.id === couponId);
  const couponDiscount = coupon ? Math.min(coupon.discountAmount, offer.price) : 0;
  const maxPoints = Math.max(0, Math.min(balance, offer.price - couponDiscount));
  const pointsUsed = Math.min(points, maxPoints);
  const total = offer.price - couponDiscount - pointsUsed;
  const quote: AgreedQuote = { kind: offer.kind, price: offer.price, couponDiscount, pointsUsed, total };
  // Agreement covers exactly the amounts shown; any change (deal ended, coupon, points) needs a new one.
  const agreed = agreedQuote !== null && sameQuote(agreedQuote, quote);
  const agreementLapsed = agreedQuote !== null && !agreed;
  const policy = parseCancellationPolicy(legs[0]?.cancellationPolicy ?? deal.cancellationPolicy);
  const plan = slot && legs.length ? legTimes(Date.parse(slot), legs) : [];

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitLock.current || !agreed || !agreedQuote) return;
    submitLock.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const reservation = await createReservation({ deal, slot, agreed, agreedQuote, idempotencyKey: requestKey, paymentMethod, couponId: coupon?.id, points: pointsUsed, staffName: legs.length ? undefined : staffName });
      navigate(`/booking/complete/${reservation.id}`, { replace: true });
    } catch (caught) {
      if (caught instanceof QuoteChangedError) setAgreedQuote(null);
      setError(caught instanceof Error ? caught.message : "예약을 저장하지 못했습니다. 다시 시도해 주세요.");
      submitLock.current = false;
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={event => void submit(event)} className="space-y-6">
      <p role="note" className="rounded-xl border border-page-border p-3 text-sm text-page-text">시연 모드입니다. 예약은 이 기기에만 저장되고 매장에 전달되지 않으며, 실제로 결제·청구되지 않습니다.</p>
      <section className="rounded-xl border border-page-border p-4">
        <p className="text-xs font-semibold text-accent">{KIND_LABEL[offer.kind]}</p>
        <p className="mt-1 text-sm text-page-text">{deal.businessName}</p>
        <h2 className="mt-1 font-semibold">{deal.serviceName}</h2>
        <p className="mt-2 text-sm">{deal.address}</p>
        {offer.kind === "regular" && deal.timeWindow && <p className="mt-2 text-xs text-page-text">지금은 타임딜 진행 시간이 아니라 정상가로 예약돼요. 이 시술의 타임딜 방문 시간은 {deal.timeWindow}입니다.</p>}
        {deal.kitId ? <Link to={`/package/detail/${deal.kitId}`} className="mt-3 inline-block text-sm text-accent underline">딜키트 상세 보기</Link> : <Link to={`/business/${deal.businessId}`} className="mt-3 inline-block text-sm text-accent underline">매장 상세 보기</Link>}
      </section>

      {legs.length > 0 ? <section className="space-y-2">
        <h2 className="font-semibold">방문 순서</h2>
        <ol className="space-y-2 text-sm">
          {legs.map((leg, index) => <li key={`${leg.businessId}-${index}`} className="rounded-lg border border-page-border p-3">
            <strong>{index + 1}. {leg.businessName}</strong> · {leg.serviceNames.join(" + ")}
            <span className="block text-xs text-page-text">시술 약 {leg.displayMinutes}분 · 예약 점유 {leg.durationMinutes}분{plan[index] ? ` · ${formatSlotTime(new Date(plan[index].start).toISOString())}–${formatSlotTime(new Date(plan[index].end).toISOString())}` : ""}</span>
          </li>)}
        </ol>
        {legs.some((leg, index) => index > 0 && leg.businessId !== legs[index - 1].businessId) && <p className="text-xs text-page-text">매장 간 이동시간은 {PROVISIONAL_TRAVEL_MINUTES}분 기준(임시)으로 일정을 잡습니다. 담당자는 각 매장에서 배정합니다.</p>}
      </section> : <section className="space-y-2">
        <h2 className="font-semibold">담당자</h2>
        <label htmlFor="booking-staff" className="block text-sm">시술받을 담당자 (선택 · 예시 담당자)</label>
        <select id="booking-staff" value={staffName} onChange={event => setStaffName(event.target.value)} className="w-full rounded-lg border border-page-border bg-page-bg p-3">
          <option value="">담당자 지정 없음 (매장 배정)</option>
          {staff.map(member => <option key={member.id} value={member.name}>{member.name} {member.position}</option>)}
        </select>
      </section>}

      <section className="space-y-2">
        <h2 className="font-semibold">예약 일정</h2>
        <label htmlFor="booking-day" className="block text-sm">방문 날짜</label>
        <select id="booking-day" required value={day} onChange={event => { setDay(event.target.value); setSlot(""); }} className="w-full rounded-lg border border-page-border bg-page-bg p-3">
          <option value="">방문할 날짜를 선택해 주세요</option>
          {days.map(value => <option key={value} value={value}>{formatSlotDay(`${value}T12:00:00+09:00`)}</option>)}
        </select>
        <label htmlFor="booking-slot" className="block text-sm">방문 시간</label>
        <select id="booking-slot" required disabled={!day} value={slot} onChange={event => setSlot(event.target.value)} className="w-full rounded-lg border border-page-border bg-page-bg p-3 disabled:opacity-50">
          <option value="">{day ? "방문할 시간을 선택해 주세요" : "날짜를 먼저 선택해 주세요"}</option>
          {times.map(value => <option key={value} value={value}>{formatSlotTime(value)}</option>)}
        </select>
        <p className="text-xs text-page-text">{days.length ? `예약 점유 ${legs.length ? legs.reduce((sum, leg) => sum + leg.durationMinutes, 0) : deal.durationMinutes ?? 60}분 · 2주 이내 예약 가능한 시간만 표시됩니다.` : "지금 예약 가능한 일정이 없습니다. 매장에 전화로 문의해 주세요."}</p>
      </section>

      <section className="space-y-3 rounded-xl border border-page-border p-4">
        <h2 className="font-semibold">쿠폰 · 포인트</h2>
        <label htmlFor="booking-coupon" className="block text-sm">쿠폰</label>
        <select id="booking-coupon" value={coupon?.id ?? ""} onChange={event => setCouponId(event.target.value)} className="w-full rounded-lg border border-page-border bg-page-bg p-3">
          <option value="">{usableCoupons.length ? "쿠폰 선택 안 함" : coupons.length ? "이 예약에 사용할 수 있는 쿠폰이 없어요" : "보유한 쿠폰이 없어요"}</option>
          {usableCoupons.map(item => <option key={item.id} value={item.id}>{item.title} (−{item.discountAmount.toLocaleString()}원)</option>)}
        </select>
        {!coupons.length && <Link to="/" className="inline-block text-xs text-accent underline">홈에서 첫방문 쿠폰 받기</Link>}
        <label htmlFor="booking-points" className="block text-sm">포인트 <span className="text-page-text">(보유 {balance.toLocaleString()}P)</span></label>
        <div className="flex gap-2">
          <input id="booking-points" type="number" inputMode="numeric" min={0} max={maxPoints} step={1} value={pointsUsed || ""} placeholder="0" onChange={event => setPoints(Math.max(0, Math.floor(Number(event.target.value) || 0)))} disabled={!maxPoints} className="min-w-0 flex-1 rounded-lg border border-page-border bg-page-bg p-3 disabled:opacity-50" />
          <button type="button" disabled={!maxPoints} onClick={() => setPoints(maxPoints)} className="rounded-lg border border-page-border px-4 text-sm disabled:opacity-40">전액 사용</button>
        </div>
      </section>

      <fieldset className="space-y-2">
        <legend className="mb-2 font-semibold">결제 수단 (시연)</legend>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map(method => (
            <label key={method} className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm ${paymentMethod === method ? "border-accent text-accent" : "border-page-border"}`}>
              <input type="radio" name="payment-method" value={method} checked={paymentMethod === method} onChange={() => setPaymentMethod(method)} />
              {PAYMENT_METHOD_LABEL[method]}
            </label>
          ))}
        </div>
      </fieldset>

      <section className="space-y-3 rounded-xl border border-page-border p-4">
        <h2 className="font-semibold">결제 금액</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between"><dt>정상가</dt><dd>{offer.originalPrice.toLocaleString()}원</dd></div>
          {offer.discount > 0 && <div className="flex justify-between"><dt>{offer.kind === "package" ? "딜키트 할인" : "타임딜 할인"}</dt><dd>−{offer.discount.toLocaleString()}원</dd></div>}
          {couponDiscount > 0 && <div className="flex justify-between"><dt>쿠폰 할인</dt><dd>−{couponDiscount.toLocaleString()}원</dd></div>}
          {pointsUsed > 0 && <div className="flex justify-between"><dt>포인트 사용</dt><dd>−{pointsUsed.toLocaleString()}원</dd></div>}
          <div className="flex justify-between border-t border-page-border pt-2 font-semibold"><dt>최종 결제 금액</dt><dd>{total.toLocaleString()}원</dd></div>
        </dl>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">취소 · 환불 규정</h2>
        <p className="text-sm text-page-text">{policy.text}</p>
        <p className="text-xs text-page-text">{policy.freeCancelHours !== null ? `방문 ${policy.freeCancelHours}시간 전까지는 무료로 취소할 수 있어요. 그 이후 취소는 매장 규정 확인이 필요합니다.` : "취소 가능 기한은 매장에 확인해 주세요."}</p>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={agreed} onChange={event => setAgreedQuote(event.target.checked ? quote : null)} className="mt-1" />
          <span>예약 내용, 최종 금액 {total.toLocaleString()}원, 취소·환불 규정을 확인했습니다. (필수)</span>
        </label>
        {agreementLapsed && <p role="alert" className="text-sm text-red-700">금액이 바뀌어 동의가 해제되었어요. 바뀐 금액을 확인하고 다시 동의해 주세요.</p>}
      </section>

      {error && <div role="alert" className="rounded-lg border border-red-300 p-3 text-sm text-red-700"><p className="font-semibold">예약하지 못했습니다.</p><p className="mt-1">{error}</p></div>}
      <button type="submit" disabled={submitting || !slot || !agreed} className="w-full rounded-lg bg-accent p-3 font-semibold text-white disabled:opacity-40">{submitting ? "저장 중…" : `${total.toLocaleString()}원 시연 결제하기 (청구 없음)`}</button>
    </form>
  );
}

export default function CheckoutPage() {
  const { dealId, kitId } = useParams();
  const { deals, loading, error } = useConsumerCatalog();
  const kit = useKitDeal(kitId ? Number(kitId) : undefined);
  const deal = kitId ? kit.deal : deals.find(item => item.id === Number(dealId));
  const isLoading = kitId ? kit.loading : loading;
  const loadError = kitId ? kit.error : error;
  return (
    <Page title="예약·결제">
      {isLoading ? <p role="status">예약 정보를 불러오는 중입니다.</p>
        : loadError ? <EmptyState title="예약 정보를 불러오지 못했습니다" description={loadError} action={<Link to="/search" className="text-accent underline">다시 찾아보기</Link>} />
        : !deal ? <EmptyState title="예약할 상품을 찾을 수 없습니다" description={kitId ? kit.reason ?? undefined : undefined} action={<Link to={kitId ? "/package" : "/search"} className="text-accent underline">{kitId ? "딜키트 둘러보기" : "타임딜 둘러보기"}</Link>} />
        : <CheckoutForm key={deal.id} deal={deal} />}
    </Page>
  );
}
