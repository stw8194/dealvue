import { useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useConsumerCatalog } from "@/features/consumer/catalog";
import { PreviewBoundary } from "@/features/consumer/preview";
import type { ConsumerDeal } from "@/features/consumer/types";
import { EmptyState, Page } from "@/features/consumer/ui";
import { formatReservationDate, validateBooking } from "./rules";
import { useBookingStore } from "./store";

function CheckoutForm({ deal }: { deal: ConsumerDeal }) {
  const navigate = useNavigate();
  const reservations = useBookingStore(state => state.reservations);
  const createReservation = useBookingStore(state => state.createReservation);
  const [slot, setSlot] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [requestKey] = useState(() => crypto.randomUUID());
  const submitLock = useRef(false);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitLock.current) return;
    submitLock.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const validation = validateBooking(deal, slot, reservations);
      if (validation) throw new Error(validation);
      const reservation = createReservation({ deal, slot, agreed, idempotencyKey: requestKey });
      navigate(`/booking/complete/${reservation.id}`, { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "예약을 저장하지 못했습니다. 다시 시도해 주세요.");
      submitLock.current = false;
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="rounded-xl border border-page-border p-4">
        <p className="text-sm text-page-text">{deal.businessName}</p>
        <h2 className="mt-1 font-semibold">{deal.serviceName}</h2>
        <p className="mt-2 text-sm">{deal.address}</p>
        <Link to={`/deal/${deal.id}`} className="mt-3 inline-block text-sm text-accent underline">타임딜 상세 보기</Link>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">예약 일정</h2>
        <label htmlFor="booking-slot" className="block text-sm">방문 일시</label>
        <select id="booking-slot" required value={slot} onChange={event => setSlot(event.target.value)} className="w-full rounded-lg border border-page-border bg-page-bg p-3">
          <option value="">방문할 일정을 선택해 주세요</option>
          {deal.slots.map(value => <option key={value} value={value}>{formatReservationDate(value)}</option>)}
        </select>
        <p className="text-xs text-page-text">미리보기 일정이며 예시 시술 시간은 60분입니다. 실제 매장 예약에 반영되지 않습니다.</p>
      </section>

      <section className="space-y-3 rounded-xl border border-page-border p-4">
        <h2 className="font-semibold">주문 금액 확인</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between"><dt>정상가</dt><dd>{deal.originalPrice.toLocaleString()}원</dd></div>
          <div className="flex justify-between"><dt>타임딜 할인</dt><dd>−{Math.max(0, deal.originalPrice - deal.price).toLocaleString()}원</dd></div>
          <div className="flex justify-between border-t border-page-border pt-2 font-semibold"><dt>테스트 예약 금액</dt><dd>{deal.price.toLocaleString()}원</dd></div>
        </dl>
        <p className="text-xs text-page-text">쿠폰·포인트 적용은 준비 중입니다.</p>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">테스트 예약 안내</h2>
        <p className="text-sm text-page-text">실제 결제와 매장 예약은 진행되지 않습니다. 예약은 이 브라우저의 미리보기 내역에만 저장됩니다. 실제 취소·환불 정책은 결제 연동 시 안내됩니다.</p>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={agreed} onChange={event => setAgreed(event.target.checked)} required className="mt-1" />
          <span>실제 비용이 청구되지 않는 테스트 예약임을 확인했습니다. (필수)</span>
        </label>
      </section>

      {error && <div role="alert" className="rounded-lg border border-red-300 p-3 text-sm text-red-700"><p className="font-semibold">테스트 예약을 완료하지 못했습니다.</p><p className="mt-1">{error}</p></div>}
      <button type="submit" disabled={submitting || !slot || !agreed} className="w-full rounded-lg bg-accent p-3 font-semibold text-white disabled:opacity-40">{submitting ? "예약 저장 중…" : "테스트 예약하기 · 실제 결제 없음"}</button>
    </form>
  );
}

export default function CheckoutPage() {
  const { dealId } = useParams();
  const { deals, loading, error } = useConsumerCatalog();
  const deal = deals.find(item => item.id === Number(dealId));
  return (
    <Page title="예약·결제">
      <PreviewBoundary>
        {loading ? <p role="status">예약 정보를 불러오는 중입니다.</p>
          : error ? <EmptyState title="예약 정보를 불러오지 못했습니다" description={error} action={<Link to="/search" className="text-accent underline">타임딜 다시 찾기</Link>} />
          : !deal ? <EmptyState title="타임딜을 찾을 수 없습니다" action={<Link to="/search" className="text-accent underline">타임딜 둘러보기</Link>} />
          : <CheckoutForm key={deal.id} deal={deal} />}
      </PreviewBoundary>
    </Page>
  );
}
