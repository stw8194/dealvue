import { CalendarDays, ChevronRight, MapPin, Store } from "lucide-react";
import { Link } from "react-router-dom";
import type { Reservation } from "@/type/reservation";
import { formatSlotDay, formatSlotTime, paymentStatusLabel } from "./rules";
import { businessAddress } from "../businessAddress";

type Props = { reservation: Reservation; visits?: Reservation[]; showAddress?: boolean };

export default function BookingSummaryCard({ reservation, visits = [], showAddress = false }: Props) {
  const packageVisits = visits.length > 1 ? visits : [];
  const price = packageVisits.length ? packageVisits.reduce((sum, item) => sum + (item.paidAmount ?? item.price), 0) : reservation.paidAmount ?? reservation.price;
  const original = packageVisits.length ? packageVisits.reduce((sum, item) => sum + (item.originalPrice ?? item.price), 0) : reservation.originalPrice ?? reservation.price;
  const atShop = reservation.paymentStatus === "on_site";
  const [packageName, ...services] = reservation.productName.split(" · ");
  const title = reservation.kind === "package" ? packageName : reservation.productName;
  return (
    <section aria-label="예약 요약" className="overflow-hidden rounded-3xl border border-page-border bg-white shadow-[0_8px_30px_-16px_rgb(45_25_35/16%)]">
      <div className="p-5">
        <Link to={`/business/${reservation.businessId}`} className="group flex items-center gap-3">
          <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[#faf4f6] text-accent">
            {reservation.imageUrl ? <img src={reservation.imageUrl} alt="" className="h-full w-full object-cover" /> : <Store size={23} strokeWidth={1.6} />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-page-text">{reservation.shopName}{packageVisits.length > 1 ? ` 외 ${packageVisits.length - 1}곳` : ""}</span>
            <span className="mt-1 block break-words text-base font-bold leading-snug text-page-heading">{title}</span>
          </span>
          <ChevronRight size={17} className="shrink-0 text-gray-400 transition group-hover:text-accent" />
        </Link>
        {reservation.kind === "package" && !packageVisits.length && services.length > 0 && <p className="mt-3 text-xs leading-5 text-page-text">{services.join(" · ")}</p>}
        <div className="mt-5 flex items-center gap-3 rounded-2xl bg-[#faf7f8] px-4 py-3.5">
          <CalendarDays size={20} strokeWidth={1.6} className="shrink-0 text-accent" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-page-heading">{formatSlotDay(reservation.reservedAt)}</p>
            <p className="mt-0.5 text-sm text-page-text">{formatSlotTime(reservation.reservedAt)} – {formatSlotTime(packageVisits.at(-1)?.endAt ?? reservation.endAt)}</p>
          </div>
        </div>
        {showAddress && reservation.address && <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-page-text"><MapPin size={15} className="mt-0.5 shrink-0" />{businessAddress(reservation.address)}</p>}
        {reservation.staffName && <p className="mt-3 text-xs text-page-text">담당 {reservation.staffName}</p>}
        {packageVisits.length > 0 && <ol aria-label="패키지 방문 순서" className="mt-4 space-y-3 border-t border-page-border pt-4">
          {packageVisits.map((visit, index) => <li key={visit.id} className="flex items-start gap-2.5 text-sm">
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent/10 text-[10px] font-bold text-accent">{index + 1}</span>
            <span className="min-w-0"><Link to={`/reservation/${visit.id}`} className="font-semibold text-page-heading hover:text-accent">{visit.shopName}</Link><span className="mt-0.5 block text-xs text-page-text">{visit.productName.split(" · ").slice(1).join(" · ")}</span><span className="mt-0.5 block text-xs text-page-text">{formatSlotDay(visit.reservedAt)} · {formatSlotTime(visit.reservedAt)}</span></span>
          </li>)}
        </ol>}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-dashed border-page-border px-5 py-4">
        <div><p className="text-xs text-page-text">{atShop ? "방문 시 결제" : "예약 금액"}{packageVisits.length > 1 ? " · 총액" : ""}</p>{!atShop && <p className="mt-1 text-[11px] text-page-text">{paymentStatusLabel(reservation)}</p>}</div>
        <div className="text-right">{original > price && <s className="block text-xs text-gray-400">{original.toLocaleString()}원</s>}<p className="text-xl font-black tracking-tight text-page-heading">{price.toLocaleString()}<span className="ml-0.5 text-sm font-semibold">원</span></p></div>
      </div>
    </section>
  );
}
