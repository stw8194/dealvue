import { Link } from "react-router-dom";
import { useBookingStore } from "@/features/consumer/booking/store";
import { PreviewBoundary } from "@/features/consumer/preview";
import { EmptyState } from "@/features/consumer/ui";

export default function ReviewListPanel() {
  const { reservations, reviews } = useBookingStore();
  return <PreviewBoundary><div className="space-y-4 p-4"><h2 className="font-semibold">내 방문 리뷰</h2>{reviews.length ? reviews.map((review) => <article key={review.id} className="space-y-2 rounded border border-page-border p-4"><p>★ {review.rating}</p><p className="whitespace-pre-wrap text-sm">{review.content}</p><Link to={`/reservation/${review.reservationId}/review`} className="text-sm text-accent">리뷰 수정</Link></article>) : <EmptyState title="작성한 리뷰가 없습니다" />}<h2 className="font-semibold">리뷰를 남길 이용 내역</h2>{reservations.filter((item) => item.status === "done" && !reviews.some((review) => review.reservationId === item.id)).map((item) => <Link className="block rounded border border-page-border p-4 text-sm" key={item.id} to={`/reservation/${item.id}/review`}>{item.productName} · 리뷰 작성 →</Link>)}</div></PreviewBoundary>;
}
