import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, Phone, Smartphone, X } from "lucide-react";
import type { ConsumerBusiness } from "../discovery/business";
import { bookingTotals, groupBookingServices, selectBookingService, serviceExclusiveKeys, serviceMinutes, type ServiceMenuCategory } from "./serviceSelection";
import { createSalonBooking, getBookingMode, getBookingSlots, getServiceMenuCategories, type BookingMode, type BookingSlot } from "@/api/salonBooking";

const timeLabel = (date: string) => new Date(date).toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hour12: false });
const button = "w-full rounded-xl bg-accent p-3.5 text-sm font-bold text-white disabled:opacity-40";
export default function BusinessBookingFlow({ business, preview, onClose }: { business: ConsumerBusiness; preview: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const submittingRef = useRef(false);
  const [mode, setMode] = useState<BookingMode | null>(null);
  const [modeError, setModeError] = useState("");
  const [step, setStep] = useState(0);
  const [categories, setCategories] = useState<ServiceMenuCategory[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [staffId, setStaffId] = useState("");
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const maxDate = new Date(Date.parse(`${today}T00:00:00Z`) + 90 * 86400000).toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [start, setStart] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [slots, setSlots] = useState<{ key: string; rows: BookingSlot[]; error: string } | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reservationId, setReservationId] = useState<number | null>(null);
  const requestRef = useRef({ signature: "", id: "" });
  const chosen = business.services.filter((service) => selected.includes(service.id));
  const totals = bookingTotals(chosen);
  const phone = business.number?.replace(/[^\d+]/g, "");
  const servicesKey = [...selected].sort((a, b) => a - b).join(",");
  const key = `${business.id}:${servicesKey}:${staffId}:${date}:${refresh}`;
  const currentSlots = slots?.key === key ? slots : null;
  const currentSlot = currentSlots?.rows.find((slot) => slot.start_at === start && slot.available);
  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => {
    if (preview) return;
    let current = true;
    Promise.all([getBookingMode(business.id), getServiceMenuCategories(business.id)]).then(([value, menuCategories]) => { if (current) { setMode(value); setCategories(menuCategories); setModeError(""); } })
      .catch((caught: unknown) => { if (current) setModeError(caught instanceof Error ? caught.message : "예약 설정을 불러오지 못했습니다."); });
    return () => { current = false; };
  }, [business.id, preview, refresh]);
  useEffect(() => {
    if (step < 3 || step > 4 || !staffId || !servicesKey || !date || preview) return;
    let current = true;
    getBookingSlots(business.id, Number(staffId), servicesKey.split(",").map(Number), date)
      .then((rows) => { if (current) setSlots({ key, rows, error: "" }); })
      .catch((caught: unknown) => { if (current) setSlots({ key, rows: [], error: caught instanceof Error ? caught.message : "예약 시간을 불러오지 못했습니다." }); });
    return () => { current = false; };
  }, [business.id, staffId, servicesKey, date, preview, key, step]);
  const submit = async () => {
    if (submittingRef.current || !currentSlot || !selected.length || !staffId) return;
    submittingRef.current = true; setSubmitting(true); setError("");
    const signature = `${business.id}:${servicesKey}:${staffId}:${start}`;
    if (requestRef.current.signature !== signature) requestRef.current = { signature, id: crypto.randomUUID() };
    try {
      const id = await createSalonBooking(business.id, Number(staffId), [...selected].sort((a, b) => a - b), start, requestRef.current.id);
      setReservationId(id); setStep(5);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "예약을 접수하지 못했습니다.");
      setStart(""); setRefresh((value) => value + 1); setStep(3);
    } finally { submittingRef.current = false; setSubmitting(false); }
  };
  return <dialog ref={dialog} aria-label="매장 예약" onCancel={(event) => { event.preventDefault(); if (!submitting) onClose(); }} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-3xl border-0 bg-white p-5 text-page-heading backdrop:bg-black/40">
    <header className="mb-5 flex items-center justify-between"><div className="flex items-center gap-2">{step > 0 && step < 5 && <button type="button" disabled={submitting} aria-label="이전 단계" onClick={() => setStep(step - 1)} className="p-1"><ArrowLeft size={18} /></button>}<h2 className="font-bold">{["예약하기", "시술자 선택", "메뉴 선택", "날짜 · 시간 선택", "예약 내용 확인", "예약 접수 완료"][step]}</h2></div><button type="button" disabled={submitting} aria-label="예약 창 닫기" onClick={onClose} className="rounded-full bg-gray-100 p-2"><X size={18} /></button></header>
    <p className="mb-4 text-sm text-page-text">{business.name}</p>
    {step === 0 && <div className="space-y-3">{preview ? <p className="rounded-xl bg-[#fff3f7] p-4 text-sm">이 화면은 실제 매장 예약 기능입니다. 실제 데이터 보기로 전환한 뒤 이용해 주세요.</p> : modeError ? <div role="alert"><p className="text-sm">{modeError}</p><button type="button" onClick={() => { setModeError(""); setRefresh((value) => value + 1); }} className="mt-3 text-sm text-accent">다시 확인</button></div> : !mode ? <p role="status">예약 방법을 확인하고 있어요.</p> : <>
      {(mode === "phone" || mode === "both") && (phone ? <a href={`tel:${phone}`} className="flex items-center gap-3 rounded-2xl border border-page-border p-5"><Phone className="text-accent" /><span><strong className="block">전화로 예약하기</strong><span className="text-xs text-page-text">{business.number}</span></span></a> : <p className="rounded-xl border border-page-border p-4 text-sm">전화번호가 아직 등록되지 않았어요.</p>)}
      {(mode === "app" || mode === "both") && <button type="button" onClick={() => setStep(1)} className="flex w-full items-center gap-3 rounded-2xl border border-accent bg-[#fff3f7] p-5 text-left"><Smartphone className="text-accent" /><span><strong className="block">앱에서 예약하기</strong><span className="text-xs text-page-text">시술자 → 메뉴 → 시간 순서로 선택해 주세요.</span></span></button>}
    </>}</div>}
    {step === 1 && <div className="space-y-4"><p className="text-sm text-page-text">시술받을 담당자를 먼저 선택해 주세요.</p><fieldset className="space-y-2"><legend className="mb-2 text-sm font-semibold">시술자</legend>{business.staff.map((staff) => <label key={staff.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 ${staffId === String(staff.id) ? "border-accent bg-[#fff3f7]" : "border-page-border"}`}><input type="radio" name="booking-staff" value={staff.id} checked={staffId === String(staff.id)} onChange={() => { setStaffId(String(staff.id)); setStart(""); }} /><span><strong className="block text-sm">{staff.name}</strong><span className="text-xs text-page-text">{staff.position}</span></span></label>)}</fieldset>{!business.staff.length && <p className="text-sm text-page-text">예약 가능한 시술자가 없습니다.</p>}<button type="button" disabled={!staffId} onClick={() => setStep(2)} className={button}>메뉴 선택</button></div>}
    {step === 2 && <div className="space-y-4"><p className="text-sm text-page-text">{business.staff.find((staff) => staff.id === Number(staffId))?.name} 담당자 · 원하는 시술을 선택해 주세요.</p>
      {groupBookingServices(business.services, categories).map((group) => <fieldset key={group.key} className="space-y-2 rounded-2xl border border-page-border p-3"><legend className="px-2 font-bold">{group.name}</legend>{group.services.map((service) => {
        const exclusive = serviceExclusiveKeys(service, business.services, categories);
        return <label key={service.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${selected.includes(service.id) ? "border-accent bg-[#fff3f7]" : "border-page-border"}`}><input type={exclusive.length ? "radio" : "checkbox"} name={exclusive.length ? `booking-${exclusive[0]}` : undefined} value={service.id} checked={selected.includes(service.id)} onChange={() => {}} onClick={() => { setSelected((previous) => selectBookingService(previous, service, business.services, categories)); setStart(""); }} className="accent-[var(--color-accent)]" /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{service.name}</span><span className="text-xs text-page-text">{serviceMinutes(service)}분 · {service.price.toLocaleString()}원 · {exclusive.length ? "한 가지 선택" : "함께 선택 가능"}</span></span></label>;
      })}</fieldset>)}
      {!business.services.length && <p>등록된 시술이 없습니다.</p>}<div className="rounded-xl bg-gray-50 p-4 text-sm font-semibold">{chosen.length}개 시술 · 총 {totals.minutes}분 · {totals.price.toLocaleString()}원</div><button type="button" disabled={!chosen.length || !staffId} onClick={() => setStep(3)} className={button}>날짜 · 시간 선택</button>
    </div>}
    {step === 3 && <div className="space-y-4"><p className="rounded-xl bg-[#fff3f7] p-3 text-sm">{chosen.map((service) => service.name).join(" + ")}<strong className="mt-1 block">총 {totals.minutes}분 · {totals.price.toLocaleString()}원</strong></p><label className="block space-y-2 text-sm"><span>방문 날짜</span><input type="date" value={date} min={today} max={maxDate} onChange={(event) => { setDate(event.target.value); setStart(""); }} className="w-full rounded-xl border border-page-border p-3" /></label>
      {!staffId ? <p className="text-sm text-page-text">담당자를 선택하면 가능한 시간이 표시됩니다.</p> : !currentSlots ? <p role="status">예약 시간을 확인하고 있어요.</p> : currentSlots.error ? <div role="alert"><p className="text-sm">{currentSlots.error}</p><button type="button" onClick={() => setRefresh((value) => value + 1)} className="mt-2 text-sm text-accent">시간 다시 조회</button></div> : !currentSlots.rows.length ? <p className="text-sm text-page-text">이 날짜에는 예약 가능한 근무시간이 없습니다.</p> : <><div className="grid grid-cols-3 gap-2" role="group" aria-label="예약 시간">{currentSlots.rows.map((slot) => <button type="button" key={slot.start_at} disabled={!slot.available} aria-pressed={start === slot.start_at} onClick={() => setStart(slot.start_at)} className={`rounded-xl border py-3 text-sm disabled:bg-gray-100 disabled:text-gray-300 disabled:line-through ${start === slot.start_at ? "border-accent bg-[#fff3f7] text-accent" : "border-page-border"}`}>{timeLabel(slot.start_at)}</button>)}</div><p className="text-xs text-page-text">총 시술시간이 다른 예약 또는 근무 종료시간과 겹치면 선택할 수 없어요. 시간은 한국 시간 기준입니다.</p></>}
      <button type="button" disabled={!currentSlot} onClick={() => { setError(""); setStep(4); }} className={button}>예약 내용 확인</button>
    </div>}
    {step === 4 && <div className="space-y-4"><dl className="space-y-3 rounded-xl bg-gray-50 p-4 text-sm"><div><dt className="text-page-text">시술</dt><dd className="mt-1 font-semibold">{chosen.map((service) => service.name).join(" + ")}</dd></div><div><dt className="text-page-text">담당자</dt><dd>{business.staff.find((staff) => staff.id === Number(staffId))?.name}</dd></div><div><dt className="text-page-text">방문 일정</dt><dd>{date} {start && timeLabel(start)}–{currentSlot && timeLabel(currentSlot.end_at)} · {totals.minutes}분</dd></div><div><dt className="text-page-text">시술 합계</dt><dd className="font-bold text-accent">{totals.price.toLocaleString()}원</dd></div></dl><p className="text-xs leading-5 text-page-text">예약은 매장 확인 대기로 접수됩니다. 이 단계에서 결제는 진행되지 않습니다. 타임딜 할인은 포함되지 않은 일반 시술 금액입니다.</p><button type="button" disabled={submitting || !currentSlot} onClick={() => void submit()} className={button}>{submitting ? "예약 접수 중…" : "예약 접수하기"}</button></div>}
    {step === 5 && <div className="space-y-4 text-center"><Check className="mx-auto text-accent" size={38} /><p className="font-bold">예약이 접수되었습니다.</p><p className="text-sm text-page-text">매장 확인 후 예약이 확정됩니다.</p><Link to={`/reservation/${reservationId}`} onClick={onClose} className={`${button} block`}>예약내역 확인</Link></div>}
    {error && <div role="alert" className="mt-4 space-y-2 rounded-xl bg-red-50 p-3 text-sm text-red-700"><p>{error}</p>{error.includes("로그인") && <Link to="/auth/login" onClick={onClose} className="underline">로그인하기</Link>}</div>}
  </dialog>;
}
