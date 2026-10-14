import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Check, Gift, RotateCw, Sparkles } from "lucide-react";
import { useEngagementStore } from "../store";
import { ROULETTE_REWARDS } from "./data";
import { useKoreanDay, useReducedMotion } from "./motion";

const colors = ["#fff7f0", "#ff3985", "#fff7f0", "#783cff", "#fff7f0", "#ff3985", "#fff7f0", "#ffc738"];
function wedge(index: number) {
  const point = (a: number) => [160 + 143 * Math.cos(a * Math.PI / 180), 160 + 143 * Math.sin(a * Math.PI / 180)];
  const [x1, y1] = point(-112.5 + index * 45), [x2, y2] = point(-67.5 + index * 45);
  return `M160 160L${x1} ${y1}A143 143 0 0 1 ${x2} ${y2}Z`;
}
function Wheel() {
  return <svg viewBox="0 0 320 320" aria-hidden="true"><circle cx="160" cy="160" r="159" fill="#6223d6" /><circle cx="160" cy="160" r="150" fill="#ffc738" />
    {ROULETTE_REWARDS.map((amount, index) => <g key={index}><path d={wedge(index)} fill={colors[index]} stroke="#ffffff" strokeWidth="1" /><g transform={`translate(160 160) rotate(${index * 45})`}><text x="0" y="-96" textAnchor="middle" fill={index === 7 ? "#542498" : index % 2 ? "#fff" : "#6923c6"} fontSize="29" fontWeight="850">{amount}<tspan fontSize="13" dx="2">P</tspan></text><path d="M0-132 2-128 6-126 2-124 0-120-2-124-6-126-2-128z" fill={index % 2 ? "#ffffffb0" : "#b782fb"} /></g></g>)}
    {Array.from({ length: 24 }, (_, i) => <circle key={i} cx={160 + 153 * Math.sin(i * Math.PI / 12)} cy={160 - 153 * Math.cos(i * Math.PI / 12)} r="2.6" fill="#ffe699" />)}
  </svg>;
}
export default function Roulette() {
  const day = useKoreanDay();
  const play = useEngagementStore(state => state.roulettePlay);
  const begin = useEngagementStore(state => state.beginRoulette);
  const settle = useEngagementStore(state => state.settleRoulette);
  const claimed = useEngagementStore(state => state.missionClaims.includes(`${day}:roulette`));
  const todayPlay = play?.day === day ? play : null;
  const [spinning, setSpinning] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [celebration, setCelebration] = useState(0);
  const initialRotation = todayPlay ? (360 - todayPlay.index * 45) % 360 : 0;
  const rotation = useRef(initialRotation);
  const disc = useRef<HTMLDivElement>(null);
  const animation = useRef<Animation | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lock = useRef(false);
  const reduced = useReducedMotion();
  const duration = reduced ? 160 : 4600;
  useEffect(() => {
    const recover = () => { const pending = useEngagementStore.getState().roulettePlay; if (pending && !pending.settled) settle(pending.id); };
    recover();
    return () => { if (timer.current) clearTimeout(timer.current); animation.current?.cancel(); recover(); };
  }, [settle]);
  const spin = () => {
    const wheel = disc.current;
    if (lock.current || !wheel || todayPlay || claimed) return;
    const result = begin();
    if (!result) { setFeedback("오늘의 보상은 이미 받았어요. 내일 다시 참여해 주세요."); return; }
    lock.current = true;
    setSpinning(true);
    setFeedback("");
    const from = rotation.current, landing = (360 - result.index * 45) % 360;
    const target = from + 360 * 6 + ((landing - from % 360 + 360) % 360);
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      if (timer.current) clearTimeout(timer.current);
      wheel.style.transform = `rotate(${target}deg)`;
      animation.current?.cancel();
      rotation.current = target;
      settle(result.id);
      lock.current = false;
      setSpinning(false);
      setCelebration(value => value + 1);
    };
    // Drive the already mounted wheel directly, independent of React batching.
    animation.current = wheel.animate([{ transform: `rotate(${from}deg)` }, { transform: `rotate(${target}deg)` }], { duration, easing: "cubic-bezier(.14,.03,.08,1)", fill: "forwards" });
    animation.current.onfinish = finish;
    timer.current = setTimeout(finish, duration + 200);
  };
  const won = todayPlay?.settled && !spinning;
  return <div className={`playground-content roulette-content event-roulette ${spinning ? "is-spinning" : ""}`} aria-busy={spinning}>
    <div className="event-heading"><span className="event-pill">매일 한 번 · 100% 당첨</span><h2>돌리면 터지는<br /><em>오늘의 행운!</em></h2><p>최대 <strong>100 P</strong>, 꽝 없이 선물해요.</p></div>
    <div className="roulette-stage"><span className="event-float event-float-one" aria-hidden="true">✦</span><span className="event-float event-float-two" aria-hidden="true">✦</span>
      <div className="roulette-machine"><div className="wheel-pointer" aria-hidden="true"><span /></div><div ref={disc} className="wheel-disc" style={{ transform: `rotate(${initialRotation}deg)` }}><Wheel /></div><button type="button" className="wheel-hub" onClick={spin} disabled={spinning || Boolean(todayPlay) || claimed} aria-label={spinning ? "룰렛 회전 중" : todayPlay || claimed ? "오늘의 룰렛 참여 완료" : "룰렛 중앙 START"}><span>{spinning ? "···" : todayPlay || claimed ? "DONE" : "START"}</span>{todayPlay || claimed ? <Check size={20} /> : <RotateCw size={20} />}</button></div>
      {won && celebration > 0 && <div className="reward-confetti" key={celebration} aria-hidden="true">{Array.from({ length: 16 }, (_, i) => <i key={i} style={{ "--i": i } as CSSProperties} />)}</div>}
    </div>
    <div className={`event-result ${won ? "has-reward" : ""}`} role="status" aria-live="polite">{spinning ? <><Sparkles size={19} /> 행운이 돌아가는 중…</> : won ? <><Gift size={22} /><span><strong>{todayPlay.amount} P</strong> 선물이 도착했어요!</span></> : claimed ? <><Check size={19} /> 오늘의 룰렛에 참여했어요. 내일 또 만나요!</> : <><Gift size={19} /> 오늘의 선물을 바로 확인해 보세요</>}</div>
    <button type="button" className="playground-primary roulette-spin-button" disabled={spinning || Boolean(todayPlay) || claimed} onClick={spin}>{spinning ? <><span className="button-spinner" /> 행운이 돌아가는 중</> : todayPlay || claimed ? <><Check size={18} /> 오늘 참여 완료 · 내일 다시 만나요</> : <><RotateCw size={18} /> 행운 룰렛 돌리기</>}</button>
    <p className="daily-reward-note">{todayPlay || claimed ? "오늘의 참여는 완료했어요. 내일 새로운 행운을 만나보세요." : "하루 한 번 무료 · 포인트 차감 없이 참여해요"}</p><p className="daily-reset-note">한국 시간 자정에 다시 참여할 수 있어요.</p><p className="playground-feedback" role="status">{feedback}</p>
  </div>;
}
