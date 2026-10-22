import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "@/features/consumer/ui";
import { pointBalance, useEngagementStore } from "./store";
const PlaygroundPage = lazy(() => import("./playground/PlaygroundPage"));
const loading = <div role="status" className="min-h-[70vh] bg-gradient-to-br from-pink-50 to-purple-50 px-5 py-16 text-center text-sm text-pink-400">나만의 작은 놀이터를 열고 있어요 ✧</div>;

export function RewardsPage() { return <Suspense fallback={loading}><PlaygroundPage /></Suspense>; }
export function FortunePage() { return <Suspense fallback={loading}><PlaygroundPage defaultTab="fortune" /></Suspense>; }

export function PointHistoryPanel() {
  const history = useEngagementStore(state => state.pointHistory);
  return <div className="space-y-4"><p className="font-semibold">보유 {pointBalance(history).toLocaleString()} P</p><p className="text-sm text-page-text">출석, 운세, 룰렛, 리뷰로 모은 포인트는 놀이터 드레스룸에서 의상과 소품을 사는 데 쓸 수 있어요.</p>{history.length === 0 ? <EmptyState title="아직 포인트 내역이 없어요" action={<Link to="/rewards">놀이터에서 행운 모으기</Link>} /> : <ul className="space-y-3">{history.map(entry => <li key={entry.id} className="flex items-center justify-between gap-3 border-b border-page-border py-3"><div><p className="text-sm">{entry.reason}</p><p className="text-xs text-page-text">{new Date(entry.createdAt).toLocaleString("ko-KR")}</p></div><p className="shrink-0 text-sm font-semibold text-accent">{entry.amount > 0 ? "+" : ""}{entry.amount} P</p></li>)}</ul>}</div>;
}
