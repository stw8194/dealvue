import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowUpRight, Check, Moon, Sparkles, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { useEngagementStore } from "../store";
import { fortuneForDay } from "./data";
import { useAmbientMotion, useKoreanDay, useReducedMotion } from "./motion";

export default function Fortune() {
  const day = useKoreanDay();
  const claimed = useEngagementStore(state => state.missionClaims.includes(`${day}:fortune`));
  const claim = useEngagementStore(state => state.claimMission);
  const [phase, setPhase] = useState<"idle" | "reading" | "revealed">(() => claimed ? "revealed" : "idle");
  const [feedback, setFeedback] = useState("");
  const [revealId, setRevealId] = useState(0);
  const [receivedGift, setReceivedGift] = useState(false);
  const scene = useRef<HTMLDivElement>(null);
  const result = useRef<HTMLElement>(null);
  const lock = useRef(false);
  const reduced = useReducedMotion();
  useAmbientMotion(scene);
  const fortune = fortuneForDay(day);
  const displayedPhase = claimed && phase === "idle" ? "revealed" : phase;
  useEffect(() => {
    if (phase !== "reading") return;
    // Scroll after the disabled button and reading layout have committed.
    const frame = requestAnimationFrame(() => scene.current?.closest("dialog")?.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" }));
    const timer = setTimeout(() => {
      setRevealId(value => value + 1);
      setFeedback("오늘의 운세 선물, 5 P가 도착했어요. 내일 또 만나요!");
      setPhase("revealed");
      lock.current = false;
    }, reduced ? 120 : 2400);
    return () => { cancelAnimationFrame(frame); clearTimeout(timer); };
  }, [phase, reduced]);
  useEffect(() => {
    if (phase !== "revealed" || revealId === 0 || reduced) return;
    const timer = setTimeout(() => {
      const node = result.current;
      if (node && (node.getBoundingClientRect().top < 70 || node.getBoundingClientRect().bottom > window.innerHeight - 20)) node.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 2050);
    return () => clearTimeout(timer);
  }, [phase, revealId, reduced]);
  const read = () => {
    if (lock.current || claimed) return;
    // Reserve today's visit before animating, so closing/reloading cannot replay it.
    const rewarded = claim("fortune");
    if (!rewarded) { setFeedback("오늘은 이미 참여했어요. 내일 다시 만나요!"); return; }
    lock.current = true;
    setReceivedGift(rewarded);
    setFeedback("");
    setPhase("reading");
  };
  return <div className={`playground-content fortune-content fortune-${displayedPhase} ${phase === "revealed" && revealId > 0 ? "has-finale" : ""}`} aria-busy={phase === "reading"}>
    <div className="crystal-stage ambient-scene" ref={scene}>
      <span className="scene-eyebrow"><Moon size={12} /> A LITTLE MAGIC FOR YOU</span>
      <div className="constellation" aria-hidden="true">{Array.from({ length: 8 }, (_, i) => <span key={i} className={`constellation-star star-${i}`}>✦</span>)}</div>
      <div className="crystal-orbit" /><div className="crystal-orbit orbit-tilted" />
      <button className="crystal-action" type="button" onClick={read} disabled={claimed || phase === "reading"} aria-label={phase === "reading" ? "수정구슬이 운세를 읽고 있어요" : claimed ? "오늘의 수정구슬 참여 완료" : "수정구슬을 터치해 오늘의 운세 보기"}>
        <span className="crystal-float"><span className="crystal-ball"><span className="crystal-mist mist-one" /><span className="crystal-mist mist-two" /><span className="crystal-inner-ring" /><span className="crystal-highlight" /><span className="crystal-symbol"><Sparkles size={45} strokeWidth={1} /></span><span className="crystal-glint glint-one" /><span className="crystal-glint glint-two" /></span></span>
      </button>
      {phase === "revealed" && revealId > 0 && <div className="crystal-finale" key={revealId} aria-hidden="true"><span className="finale-light" /><span className="finale-ring ring-a" /><span className="finale-ring ring-b" /><span className="finale-ring ring-c" />{Array.from({ length: 18 }, (_, i) => <span className="finale-star" key={i} style={{ "--i": i } as CSSProperties}>{i % 3 === 0 ? "✧" : "✦"}</span>)}<span className="finale-gift">{receivedGift ? "+ 5 P" : "오늘의 빛이 도착했어요"}</span></div>}
      <div className="crystal-pedestal"><span /><span /></div><div className="crystal-floor" />
      <div className="crystal-stage-caption"><span>{phase === "reading" ? "별빛 속에서 행운을 찾고 있어요" : displayedPhase === "revealed" ? "당신에게 도착한 오늘의 메시지" : "구슬을 톡, 오늘의 행운을 깨워보세요"}</span><span className="crystal-caption-dots" aria-hidden="true">✧ · ✧ · ✧</span></div>
    </div>
    <section className="fortune-controls" aria-labelledby="fortune-title">
      <span className="mini-eyebrow">YOUR DAILY BEAUTY FORTUNE</span>
      <h2 id="fortune-title">오늘은 어떤 빛으로<br />반짝이게 될까요?</h2>
      <p className="section-description">수정구슬이 건네는 다정한 한마디.<br />오늘의 운세를 열고 작은 선물도 받아가세요.</p>
      {displayedPhase === "revealed" ? <article ref={result} className="fortune-result" key={day}>
        <div className="fortune-result-top"><span><Star size={13} /> 오늘의 뷰티 운세</span><strong>{fortune.score}<small>점</small></strong></div>
        <h3>{fortune.title}</h3><p>{fortune.body}</p>
        <div className="fortune-tags"><span>행운의 컬러 <strong>{fortune.color}</strong></span><span>오늘의 키워드 <strong>{fortune.keyword}</strong></span></div>
        <Link to={`/search?category=${fortune.category}`} className="fortune-recommendation">오늘은 {fortune.label}로 기분 전환 <ArrowUpRight size={15} /></Link>
      </article> : <div className="fortune-unopened"><span className="fortune-unopened-icon"><Sparkles size={22} strokeWidth={1.5} /></span><strong>{phase === "reading" ? "조금만 기다려주세요" : "아직 펼치지 않은 오늘의 이야기"}</strong><p>{phase === "reading" ? "은은한 별빛이 당신의 하루를 비추고 있어요." : "나에게 어울리는 컬러와 뷰티 팁을 만나보세요."}</p></div>}
      <button type="button" className="playground-primary fortune-button" disabled={claimed || phase === "reading"} onClick={read}>{phase === "reading" ? <><span className="button-spinner" /> 운세를 읽고 있어요</> : <><Sparkles size={17} /> {claimed ? "오늘의 운세 완료 · 내일 다시 만나요" : "오늘의 운세 열어보기 · 5 P"}</>}</button>
      <p className="daily-reward-note">{claimed ? <><Check size={13} /> 오늘의 5 P 선물을 받았어요 · 내일 다시 만나요</> : "매일 한 번, 운세를 열면 5 P를 드려요"}</p>
      <p className="daily-reset-note">한국 시간 자정에 다시 참여할 수 있어요.</p>
      <p className="playground-feedback" role="status">{feedback}</p>
      <p className="fortune-small-print">가볍게 즐기는 오늘의 뷰티 이야기</p>
    </section>
  </div>;
}
