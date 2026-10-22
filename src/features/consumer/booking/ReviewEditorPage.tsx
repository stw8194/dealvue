import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PreviewBoundary } from "@/features/consumer/preview";
import { EmptyState, Page } from "@/features/consumer/ui";
import type { Reservation, ReservationReview } from "@/type/reservation";
import { useOwnLocalReservations } from "./useReservations";
import { REVIEW_REWARD_POINTS, useBookingStore } from "./store";

function ReviewForm({ reservation, existing }: { reservation: Reservation; existing?: ReservationReview }) {
  const navigate = useNavigate();
  const saveReview = useBookingStore(state => state.saveReview);
  const [rating, setRating] = useState(existing?.rating ?? 5);
  const [content, setContent] = useState(existing?.content ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await saveReview(reservation.id, { rating, content });
      navigate(`/reservation/${reservation.id}`, { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "리뷰를 저장하지 못했습니다.");
      setSubmitting(false);
    }
  };
  return (
    <form onSubmit={event => void submit(event)} className="space-y-5">
      <div><h2 className="font-semibold">{reservation.productName}</h2><p className="mt-1 text-sm text-page-text">{reservation.shopName} · 이용 완료</p></div>
      <p className="text-sm text-page-text">예약 한 건에 리뷰 한 개를 작성하고 수정할 수 있습니다.{!existing && ` 첫 리뷰를 등록하면 ${REVIEW_REWARD_POINTS}P를 드려요.`}</p>
      <fieldset><legend className="mb-2 text-sm font-semibold">평점</legend><div className="flex flex-wrap gap-3">{[1, 2, 3, 4, 5].map(value => <label key={value} className="flex items-center gap-1 rounded-lg border border-page-border p-2 text-sm"><input type="radio" name="rating" value={value} checked={rating === value} onChange={() => setRating(value)} />{value}점</label>)}</div></fieldset>
      <div className="space-y-2"><label htmlFor="review-content" className="block text-sm font-semibold">이용 후기</label><textarea id="review-content" required minLength={10} maxLength={1000} rows={6} value={content} onChange={event => setContent(event.target.value)} className="w-full rounded-lg border border-page-border bg-page-bg p-3" placeholder="시술과 방문 경험을 10자 이상 남겨 주세요." /><p className="text-right text-xs text-page-text">{content.length} / 1,000자</p></div>
      <p className="text-xs text-page-text">사진 첨부와 항목별 평점은 준비 중입니다.</p>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button type="submit" disabled={submitting} className="w-full rounded-lg bg-accent p-3 font-semibold text-white disabled:opacity-40">{submitting ? "저장 중…" : existing ? "리뷰 수정" : "리뷰 저장"}</button>
      <Link to={`/reservation/${reservation.id}`} className="block text-center text-sm text-accent underline">예약 상세로</Link>
    </form>
  );
}

export default function ReviewEditorPage() {
  const { reservationId } = useParams();
  const reservation = useOwnLocalReservations().find(item => item.id === reservationId);
  const existing = useBookingStore(state => state.reviews.find(item => item.reservationId === reservationId));
  return (
    <Page title={existing ? "리뷰 수정" : "리뷰 작성"}>
      <PreviewBoundary>
        {!reservation ? <EmptyState title="예약을 찾을 수 없습니다" action={<Link to="/reservation/usage" className="text-accent underline">이용내역 보기</Link>} />
          : reservation.status !== "done" || !reservation.completedAt ? <EmptyState title="이용 완료 후 작성할 수 있습니다" description="이용 완료된 예약에만 리뷰를 남길 수 있습니다." action={<Link to={`/reservation/${reservation.id}`} className="text-accent underline">예약 상세 보기</Link>} />
          : <ReviewForm key={reservation.id} reservation={reservation} existing={existing} />}
      </PreviewBoundary>
    </Page>
  );
}
