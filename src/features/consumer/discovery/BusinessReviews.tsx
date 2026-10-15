import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { readBusinessReviews, type BusinessReview, type SuppliedBusinessDetails } from "./business";
import { useBookingStore } from "@/features/consumer/booking/store";

export default function BusinessReviews({ businessId, supplied }: { businessId: number; preview: boolean; supplied?: SuppliedBusinessDetails | null }) {
  const savedReviews = useBookingStore((state) => state.reviews);
  const [sort, setSort] = useState("recent");
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ reviews: BusinessReview[] | null; error: boolean } | null>(null);
  useEffect(() => {
    if (supplied) return;
    let current = true;
    readBusinessReviews(businessId).then((reviews) => { if (current) setResult({ reviews, error: false }); })
      .catch(() => { if (current) setResult({ reviews: null, error: true }); });
    return () => { current = false; };
  }, [businessId, attempt, supplied]);
  const localReviews = savedReviews.filter(review => review.businessId === businessId).map(review => ({ id: review.id, rating: review.rating, content: review.content, created_at: review.createdAt, service_name: review.productName }));
  const reviews: (BusinessReview & { service_name?: string })[] = [...localReviews, ...(supplied ? supplied.review_samples.map(review => ({ ...review, created_at: "" })) : result?.reviews ?? [])];
  const sorted = [...(reviews ?? [])].sort((a, b) => sort === "high" ? b.rating - a.rating : sort === "low" ? a.rating - b.rating : Date.parse(b.created_at) - Date.parse(a.created_at));
  return <section className="space-y-5">
    <div className="flex items-center justify-between"><h2 className="text-lg font-bold">리뷰</h2>{<Link to="/reservation/usage" className="text-sm font-semibold text-accent">리뷰 쓰기</Link>}</div>
    {!supplied && !result ? <p role="status">리뷰를 불러오는 중입니다.</p> : result?.error ? <div role="alert"><p>리뷰를 불러오지 못했어요.</p><button type="button" onClick={() => { setResult(null); setAttempt((value) => value + 1); }} className="mt-2 text-sm text-accent">다시 시도</button></div>
      : sorted.length ? <>
        <div className="flex items-center gap-3 rounded-2xl bg-[#fff3f7] p-5"><Star className="fill-accent text-accent" /><strong className="text-3xl">{(sorted.reduce((sum, review) => sum + review.rating, 0) / sorted.length).toFixed(1)}</strong><span className="text-sm text-page-text">리뷰 {sorted.length}개</span></div>
        <label className="flex items-center justify-end gap-2 text-sm">정렬<select value={sort} onChange={(event) => setSort(event.target.value)} className="rounded-lg border border-page-border p-2"><option value="recent">최신순</option><option value="high">평점 높은순</option><option value="low">평점 낮은순</option></select></label>
        <ul className="divide-y divide-page-border">{sorted.map((review) => <li key={review.id} className="space-y-2 py-4"><div className="flex items-center justify-between"><span className="flex items-center gap-1 text-sm font-semibold"><Star size={15} className="fill-accent text-accent" />{review.rating} <span className="ml-2 text-xs font-normal text-page-text">{review.created_at ? "방문 고객" : "등록 후기"}</span></span>{review.created_at && <time className="text-xs text-page-text">{new Date(review.created_at).toLocaleDateString("ko-KR")}</time>}</div>{review.service_name && <p className="text-xs font-semibold text-accent">{review.service_name}</p>}<p className="whitespace-pre-wrap text-sm leading-6">{review.content}</p></li>)}</ul>
      </> : <div className="rounded-2xl border border-page-border px-5 py-10 text-center"><Star className="mx-auto mb-3 text-gray-300" /><p className="font-semibold">{result?.reviews === null ? "방문 리뷰를 준비하고 있어요" : "아직 등록된 리뷰가 없어요"}</p><p className="mt-2 text-sm text-page-text">이용을 완료한 예약에서 방문 후기를 남길 수 있어요.</p></div>}
    {!!supplied?.review_images.length && <section className="space-y-3"><h3 className="font-semibold">후기 사진 {supplied.review_images.length}장</h3><div className="grid grid-cols-2 gap-3">{supplied.review_images.map((url, index) => <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="overflow-hidden rounded-xl"><img src={url} loading="lazy" alt={`후기 사진 ${index + 1}`} className="aspect-square w-full object-cover" /></a>)}</div></section>}
  </section>;
}
