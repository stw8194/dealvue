import BookingDateCalendar from "./BookingDateCalendar";
import { formatSlotDay, slotDay } from "./rules";

const KST = "Asia/Seoul";
const choice = "relative cursor-pointer border border-page-border text-center transition has-[:checked]:border-accent has-[:checked]:bg-accent has-[:checked]:text-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent";
const timeFormat = new Intl.DateTimeFormat("ko-KR", { timeZone: KST, hour: "numeric", minute: "2-digit", hour12: true });
const hourFormat = new Intl.DateTimeFormat("en-US", { timeZone: KST, hour: "numeric", hourCycle: "h23" });

type Props = {
  slots: string[];
  day: string;
  slot: string;
  onDayChange: (day: string) => void;
  onSlotChange: (slot: string) => void;
  dateLabel?: string;
  timeLabel?: string;
  name?: string;
  disabled?: boolean;
};

export default function BookingSchedulePicker({ slots, day, slot, onDayChange, onSlotChange, dateLabel = "방문 날짜", timeLabel = "방문 시간", name = "booking", disabled = false }: Props) {
  const days = [...new Set(slots.map(slotDay))].sort();
  const times = slots.filter(value => slotDay(value) === day).sort((a, b) => Date.parse(a) - Date.parse(b));
  const periods = [
    { label: "오전", items: times.filter(value => Number(hourFormat.format(new Date(value))) < 12) },
    { label: "오후", items: times.filter(value => Number(hourFormat.format(new Date(value))) >= 12) },
  ].filter(period => period.items.length);

  if (!days.length) return <p className="rounded-2xl bg-gray-50 p-4 text-sm text-page-text">지금 예약 가능한 일정이 없습니다.</p>;
  return <div className="min-w-0 space-y-6">
    <BookingDateCalendar days={days} day={day} onDayChange={onDayChange} label={dateLabel} name={name} disabled={disabled} />
    <fieldset disabled={disabled} className="min-w-0 space-y-3">
      <legend className="mb-1 text-sm font-bold text-page-heading">{timeLabel}</legend>
      {day && <p className="text-xs text-page-text">{formatSlotDay(`${day}T12:00:00+09:00`)} · 가능한 시간</p>}
      {periods.map(period => <div key={period.label} className="space-y-2">
        <p className="text-xs font-semibold text-page-text">{period.label}</p>
        <div role="radiogroup" aria-label={`${period.label} ${timeLabel}`} className="grid grid-cols-3 gap-2 min-[360px]:grid-cols-4">
          {period.items.map(value => <label key={value} className={`${choice} rounded-xl py-3 text-sm font-semibold`}>
            <input type="radio" name={`${name}-slot`} value={value} checked={slot === value} onChange={() => onSlotChange(value)} className="sr-only" />
            {timeFormat.format(new Date(value)).replace(/^(오전|오후)\s*/, "")}
          </label>)}
        </div>
      </div>)}
      {!periods.length && <p className="rounded-xl bg-gray-50 p-3 text-xs text-page-text">{day ? "선택한 날짜의 예약 가능한 시간이 없습니다. 다른 날짜를 선택해 주세요." : "달력에서 방문 날짜를 선택해 주세요."}</p>}
    </fieldset>
  </div>;
}
