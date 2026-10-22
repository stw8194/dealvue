import { Check, X, ArrowRight, CalendarDays } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { EmptyState, Page } from "@/features/consumer/ui";
import BookingSummaryCard from "./BookingSummaryCard";
import { useOwnLocalReservations } from "./useReservations";

export default function BookingCompletePage() {
  const { reservationId } = useParams();
  const reservations = useOwnLocalReservations();
  const reservation = reservations.find(item => item.id === reservationId);
  const visits = reservation?.groupId ? reservations.filter(item => item.groupId === reservation.groupId).sort((a, b) => (a.legIndex ?? 0) - (b.legIndex ?? 0)) : [];
  if (!reservation) return <Page title="예약 확인"><EmptyState title="예약을 찾을 수 없습니다" description="예약내역에서 예약을 확인해 주세요." action={<Link to="/reservation" className="text-accent underline">예약내역 보기</Link>} /></Page>;
  const cancelled = reservation.status === "cancelled";
  return (
    <Page title="예약 확인">
      <div className="mx-auto max-w-md space-y-6 pb-4 text-page-heading">
        <div className="pb-1 pt-5 text-center">
          <div className={`mx-auto grid h-20 w-20 place-items-center rounded-full ${cancelled ? "bg-gray-50 text-gray-400" : "bg-[#fff0f5] text-accent"}`}>
            <span className={`grid h-12 w-12 place-items-center rounded-full ${cancelled ? "bg-gray-200 text-white" : "bg-accent text-white shadow-[0_4px_16px_#e65b8a33]"}`}>{cancelled ? <X size={27} /> : <Check size={27} strokeWidth={2.8} />}</span>
          </div>
          <h2 className="mt-5 text-2xl font-bold tracking-tight">{cancelled ? "취소된 예약입니다" : "예약이 완료되었습니다"}</h2>
          <p className="mt-2 text-sm text-page-text">{cancelled ? "다른 일정으로 다시 만나보세요." : "방문 일정을 확인해 주세요."}</p>
        </div>
        <BookingSummaryCard reservation={reservation} visits={visits} />
        {!cancelled && <p className="flex items-start justify-center gap-2 text-xs leading-5 text-page-text"><CalendarDays size={14} className="mt-0.5 shrink-0" />{reservation.groupId ? "방문 순서와 예약 정보는 상세에서 확인해 주세요." : "일정 변경과 취소는 예약내역에서 할 수 있어요."}</p>}
        <div className="space-y-3">
          <Link className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 text-sm font-bold text-white transition hover:opacity-90" to={`/reservation/${reservation.id}`}>예약 상세 보기<ArrowRight size={16} /></Link>
          <Link className="flex min-h-11 items-center justify-center rounded-2xl text-sm font-medium text-page-text hover:bg-gray-50" to="/">홈으로</Link>
        </div>
      </div>
    </Page>
  );
}
