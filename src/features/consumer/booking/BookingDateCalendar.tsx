import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const KST = "Asia/Seoul";
type Props = { days: string[]; day: string; onDayChange: (day: string) => void; label?: string; name?: string; disabled?: boolean };

export default function BookingDateCalendar({ days, day, onDayChange, label: dateLabel = "방문 날짜", name = "booking", disabled = false }: Props) {
  const months = [...new Set(days.map(value => value.slice(0, 7)))].sort();
  const [month, setMonth] = useState(day.slice(0, 7));
  const visibleMonth = months.includes(month) ? month : months.includes(day.slice(0, 7)) ? day.slice(0, 7) : months[0];
  if (!visibleMonth) return <p className="rounded-2xl bg-gray-50 p-4 text-sm text-page-text">지금 예약 가능한 일정이 없습니다.</p>;
  const [year, monthNumber] = visibleMonth.split("-").map(Number);
  const offset = new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay();
  const count = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const monthIndex = months.indexOf(visibleMonth);
  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="mb-3 text-sm font-bold text-page-heading">{dateLabel}</legend>
      <div className="rounded-2xl border border-page-border bg-white p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between">
          <button type="button" aria-label="이전 달" disabled={monthIndex <= 0} onClick={() => setMonth(months[monthIndex - 1])} className="grid h-11 w-11 place-items-center rounded-full text-page-heading hover:bg-gray-50 disabled:opacity-20"><ChevronLeft size={18} /></button>
          <p aria-live="polite" className="text-sm font-bold text-page-heading">{year}년 {monthNumber}월</p>
          <button type="button" aria-label="다음 달" disabled={monthIndex >= months.length - 1} onClick={() => setMonth(months[monthIndex + 1])} className="grid h-11 w-11 place-items-center rounded-full text-page-heading hover:bg-gray-50 disabled:opacity-20"><ChevronRight size={18} /></button>
        </div>
        <div aria-hidden="true" className="mb-1 grid grid-cols-7 text-center text-[11px] text-page-text">{"일월화수목금토".split("").map((weekday, index) => <span key={weekday} className={`py-2 ${index === 0 ? "text-rose-400" : index === 6 ? "text-blue-400" : ""}`}>{weekday}</span>)}</div>
        <div role="radiogroup" aria-label={dateLabel} className="grid grid-cols-7 gap-y-1">
          {Array.from({ length: offset }, (_, index) => <span key={`blank-${index}`} />)}
          {Array.from({ length: count }, (_, index) => {
            const date = `${visibleMonth}-${String(index + 1).padStart(2, "0")}`;
            const available = days.includes(date);
            return <label key={date} className={`relative grid min-h-11 place-items-center rounded-xl text-sm transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${!available ? "cursor-default text-gray-300" : day === date ? "cursor-pointer bg-accent font-bold text-white shadow-sm" : "cursor-pointer font-medium text-page-heading hover:bg-accent/5"}`}>
              <input type="radio" name={`${name}-day`} value={date} aria-label={new Date(`${date}T12:00:00+09:00`).toLocaleDateString("ko-KR", { timeZone: KST, year: "numeric", month: "long", day: "numeric", weekday: "long" })} checked={day === date} disabled={!available} onChange={() => onDayChange(date)} className="sr-only" />
              {index + 1}
            </label>;
          })}
        </div>
      </div>
    </fieldset>
  );
}
