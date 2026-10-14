import { ArrowLeft, ArrowUpRight, Coins, Gem, Shirt, Sparkles, RotateCw, Target } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { PreviewBoundary } from "@/features/consumer/preview";
import { pointBalance, useEngagementStore } from "../store";
import { useKoreanDay } from "./motion";
import Wardrobe from "./Wardrobe";
import Fortune from "./Fortune";
import Roulette from "./Roulette";
import PlayModal from "./PlayModal";
import { Avatar } from "./Avatar";
import { COLLECTIONS, LOOKS, TOTAL_COLLECTIBLES, type Outfit } from "./data";
import "./playground.css";
import "./appearance.css";
import "./outfitChange.css";

type Tab = "wardrobe" | "fortune" | "roulette";
const tabs = [
  { id: "wardrobe", label: "드레스룸", Icon: Shirt },
  { id: "fortune", label: "수정구슬 운세", Icon: Gem },
  { id: "roulette", label: "행운 룰렛", Icon: RotateCw },
] as const;

export default function PlaygroundPage({ defaultTab = "wardrobe" }: { defaultTab?: Tab }) {
  const [params, setParams] = useSearchParams();
  const value = params.get("tab") ?? (defaultTab === "fortune" ? "fortune" : null);
  const tab = tabs.some(item => item.id === value) ? value as Tab : null;
  const balance = useEngagementStore(state => pointBalance(state.pointHistory));
  const outfit = useEngagementStore(state => state.outfit);
  const appearance = useEngagementStore(state => state.appearance);
  const accessories = useEngagementStore(state => state.accessories);
  const owned = useEngagementStore(state => state.ownedOutfits);
  const goalId = useEngagementStore(state => state.lookGoal);
  const goal = LOOKS.find(item => item.id === goalId);
  const currentLook = LOOKS.find(item => item.id === outfit) ?? LOOKS[0];
  const day = useKoreanDay();
  const discoveries = LOOKS.filter(item => !owned.includes(item.id));
  const featured = (discoveries.length ? discoveries : LOOKS)[Number(day.replaceAll("-", "")) % (discoveries.length || LOOKS.length)];
  const chooseTab = (next: Tab, collection?: string, look?: Outfit) => setParams({ tab: next, ...(collection ? { collection } : {}), ...(look ? { look } : {}) }, { replace: true });
  const close = () => setParams({ tab: "home" }, { replace: true });
  return <main className={`playground-page ${tab ? "has-play-modal" : ""}`}>
    <div className="playground-shell">
      <header className="playground-header"><Link to="/mypage" className="playground-back" aria-label="마이페이지로 돌아가기"><ArrowLeft size={19} /></Link><Link to="/rewards" className="playground-wordmark"><Sparkles size={15} strokeWidth={1.5} /> 놀이터</Link><Link to="/mypage/point" className="playground-wallet" aria-label={`보유 포인트 ${balance} P · 포인트 내역`}><span><Coins size={15} /></span><strong key={balance}>{balance.toLocaleString()} <small>P</small></strong><ArrowUpRight size={13} /></Link></header>
      <div className="playground-intro"><span>PLAY. WIN. DRESS UP.</span><h1>나의 스타일, 나의 행운<span> ✦</span></h1><p>매일 찾아오는 선물로 더 예뻐지는 나의 아바타.</p></div>
      <PreviewBoundary><section className="play-home-hero"><div className="home-fashion-preview"><Avatar outfit={outfit} accessories={accessories} appearance={appearance} /></div><div><span className="home-badge">MY AVATAR STUDIO · {TOTAL_COLLECTIBLES} ITEMS</span><h2>취향을 입고,<br />반짝임을 더해요.</h2><p>의상 {LOOKS.length}벌과 작은 보물들.<br />얼굴과 헤어, 장신구까지 나답게 꾸며요.</p><button type="button" className="playground-primary" onClick={() => chooseTab("wardrobe")}><Shirt size={18} /> 드레스룸 열기</button><Link className="avatar-beauty-link" to={`/search?category=${currentLook.category}`}>이 스타일과 어울리는 뷰티 찾기 <ArrowUpRight size={13} /></Link></div></section>
      <section className="home-collection-strip" aria-label="나의 의상 컬렉션">{COLLECTIONS.map(collection => { const looks = LOOKS.filter(item => item.collection === collection.id), count = looks.filter(item => owned.includes(item.id)).length; return <button type="button" key={collection.id} onClick={() => chooseTab("wardrobe", collection.id)}><span>{collection.mark}</span><strong>{collection.label}</strong><small>{count} / {looks.length}</small><i><span style={{ width: `${count / looks.length * 100}%` }} /></i></button>; })}</section>
      <section className="home-discovery"><span className="discovery-mark">✧</span><div><span>오늘의 발견</span><strong>{featured.name}</strong><p>{featured.mood}</p></div><button type="button" onClick={() => chooseTab("wardrobe", featured.collection, featured.id)}>미리 입어보기 <ArrowUpRight size={13} /></button></section>
      {goal && <section className="home-look-goal"><Target size={19} /><div><strong>다음에 모을 옷 · {goal.name}</strong><span>{owned.includes(goal.id) ? "목표 달성! 옷장에서 입어볼까요?" : balance >= goal.price ? "포인트가 모였어요. 이제 소장할 수 있어요!" : `${Math.max(0, goal.price - balance)} P만 더 모으면 만날 수 있어요.`}</span></div><button type="button" onClick={() => chooseTab("wardrobe", goal.collection, goal.id)}>옷장으로 <ArrowUpRight size={14} /></button></section>}
      <nav className="playground-tabs play-home-cards" aria-label="놀이터 메뉴">{tabs.map(({ id, label, Icon }) => <button key={id} type="button" onClick={() => chooseTab(id)} className={`play-card card-${id}`}><span className="play-card-icon"><Icon size={25} /></span><strong>{label}</strong><span>{id === "wardrobe" ? "옷과 장신구로 완성하는 스타일" : id === "fortune" ? "수정구슬을 열고 매일 5 P" : "꽝 없는 룰렛, 최대 100 P"}</span><span className="play-card-cta">{id === "wardrobe" ? "꾸미러 가기" : id === "fortune" ? "오늘의 운세 보기" : "룰렛 이벤트 참여"} <ArrowUpRight size={15} /></span></button>)}</nav>
      <footer className="playground-footer"><Sparkles size={13} /><span>운세와 룰렛으로 모은 포인트, 나만의 옷장에서 써보세요.</span></footer>
      {tab && <PlayModal key={`${tab}:${day}`} title={tabs.find(item => item.id === tab)!.label} kind={tab} close={close}><div className="modal-wallet"><Coins size={15} /> 내 포인트 <strong>{balance.toLocaleString()} P</strong></div><div className="playground-tab-content">{tab === "wardrobe" ? <Wardrobe onEarn={() => chooseTab("fortune")} initialCollection={params.get("collection") ?? undefined} initialOutfit={LOOKS.find(item => item.id === params.get("look"))?.id} /> : tab === "fortune" ? <Fortune /> : <Roulette />}</div></PlayModal>}
      </PreviewBoundary>
    </div>
  </main>;
}
