import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, Hand, Music2, Pause, Play, RotateCcw, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { createDollScene, type DollMotion, type DollPalette, type DollScene, type DollView } from "./AvatarScene";
import "./avatar3d.css";

const motions = [
  { id: "wave", label: "손 흔들기", Icon: Hand, hint: "반가워! 오늘도 만나서 좋아." },
  { id: "dance", label: "리듬 댄스", Icon: Music2, hint: "좋아하는 노래에 살짝 들썩들썩." },
  { id: "pose", label: "찰칵 포즈", Icon: Camera, hint: "오늘의 나, 예쁘게 남겨줘." },
] as const;
const views = [{ id: "front", label: "정면" }, { id: "side", label: "옆모습" }, { id: "back", label: "뒷모습" }] as const;
const palettes = [{ id: "vanilla", label: "카라멜 체크" }, { id: "rose", label: "로즈 밀크" }, { id: "sky", label: "소프트 블루" }] as const;

export default function Avatar3DPage() {
  const host = useRef<HTMLDivElement>(null), scene = useRef<DollScene | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [motion, setMotion] = useState<DollMotion>("idle"), [view, setView] = useState<DollView>("front");
  const [palette, setPalette] = useState<DollPalette>("vanilla"), [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(preference.matches);
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!host.current) return;
    let alive = true;
    try {
      const instance = createDollScene(host.current, () => { if (alive) setStatus("ready"); }, message => { if (alive) { setError(message); setStatus("error"); } });
      scene.current = instance;
      return () => { alive = false; instance.dispose(); scene.current = null; };
    } catch {
      // WebGL can be unavailable before the loader starts (e.g. disabled GPU).
      queueMicrotask(() => { if (alive) { setError("이 브라우저에서 3D 화면을 열 수 없어요. 다른 브라우저에서 확인해 주세요."); setStatus("error"); } });
      return () => { alive = false; };
    }
  }, [attempt]);
  const playMotion = (value: DollMotion) => { setMotion(value); setPaused(false); scene.current?.pause(false); scene.current?.motion(value); };
  const pauseButton = <button type="button" disabled={status !== "ready" || reduced} aria-label={paused ? "움직임 재생" : "움직임 일시정지"} onClick={() => { setPaused(!paused); scene.current?.pause(!paused); }}>{paused ? <Play size={15} /> : <Pause size={15} />}</button>;
  const motionButtons = motions.map(({ id, label, Icon }) => <button type="button" key={id} disabled={status !== "ready"} aria-pressed={motion === id} onClick={() => playMotion(id)}><span><Icon size={20} strokeWidth={1.6} /></span><strong>{label}</strong></button>);
  const retry = () => { setStatus("loading"); setError(""); setMotion("idle"); setView("front"); setPalette("vanilla"); setPaused(false); setAttempt(value => value + 1); };
  return <main className="doll-page">
    <div className="doll-shell">
      <header className="doll-header"><Link to="/rewards" aria-label="놀이터로 돌아가기"><ArrowLeft size={19} /></Link><span><Sparkles size={15} /> MY LITTLE STUDIO</span><span className="doll-sample">첫 번째 샘플</span></header>
      <div className="doll-intro"><span>A LITTLE MORE ALIVE</span><h1>작은 움직임도 사랑스럽게.</h1><p>돌려보고, 인사하고, 나만의 색을 입혀봐요.</p></div>
      <section className="doll-studio" aria-label="3D 아바타 스튜디오">
        <div className="doll-stage">
          <span className="doll-stage-caption">CARAMEL CAFÉ</span><span className="doll-star star-one">✧</span><span className="doll-star star-two">✦</span><span className="doll-star star-three">✧</span>
          <div className="doll-canvas" ref={host} />
          {status === "loading" && <div className="doll-loading" role="status"><Sparkles size={23} /><strong>아바타가 준비하고 있어요</strong><span>조금만 기다려 주세요.</span></div>}
          {status === "error" && <div className="doll-loading doll-error" role="alert"><strong>{error}</strong><button type="button" onClick={retry}>다시 불러오기</button></div>}
          <div className="doll-view-buttons" role="group" aria-label="아바타 보는 방향">{views.map(item => <button type="button" key={item.id} disabled={status !== "ready"} aria-pressed={view === item.id} onClick={() => { setView(item.id); scene.current?.view(item.id); }}>{item.label}</button>)}</div>
          <span className="doll-drag-hint">손으로 살짝 돌려보세요</span>
        </div>
        <div className="doll-motions doll-mobile-motions" role="group" aria-label="아바타 움직임">{motionButtons}{pauseButton}</div>
        <div className="doll-details">
          <span className="doll-detail-eyebrow">THE CARAMEL COLLECTION</span><h2>카라멜 카페</h2><p>부드러운 단발과 따뜻한 갈색 눈동자.<br />체크 원피스에 작은 디저트를 수놓았어요.</p>
          <div className="doll-palette" role="group" aria-label="원피스 색상"><span>오늘의 색</span><div>{palettes.map(item => <button type="button" key={item.id} className={`swatch-${item.id}`} aria-label={item.label} aria-pressed={palette === item.id} disabled={status !== "ready"} onClick={() => { setPalette(item.id); scene.current?.palette(item.id); if (window.innerWidth <= 700) host.current?.closest(".doll-stage")?.scrollIntoView({ behavior: reduced ? "instant" : "smooth", block: "center" }); }}><i /><span>{item.label}</span></button>)}</div></div>
          <div className="doll-motion-heading"><span>나의 작은 순간들</span>{pauseButton}</div>
          <div className="doll-motions" role="group" aria-label="아바타 움직임">{motionButtons}</div>
          <p className="doll-mood">{motions.find(item => item.id === motion)?.hint ?? "오늘은 어떤 나를 만나볼까?"}</p>
          {reduced && <p className="doll-reduced-hint">움직임 줄이기 설정이 켜져 있어 포즈로 보여드려요.</p>}
          <button type="button" className="doll-reset" disabled={status !== "ready"} onClick={() => { playMotion("idle"); setView("front"); scene.current?.view("front"); }}><RotateCcw size={14} /> 기본 모습으로</button>
        </div>
      </section>
      <p className="doll-footnote">얼굴과 비율, 움직임을 살펴보는 첫 샘플이에요.<br />마음에 드는 모습이 되면 드레스룸으로 데려올게요.</p>
    </div>
  </main>;
}
