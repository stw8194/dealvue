import { useState, type ReactNode } from "react";
import { CalendarCheck, Check, ChevronRight, Gift, Maximize2, Search, Shirt, Smile, Sparkles, Users, Zap } from "lucide-react";
import { useEngagementStore } from "../store";
import { Avatar } from "./Avatar";
import { type Accessories, type Outfit } from "./data";
import { type AvatarAppearance } from "./appearance";
import { useKoreanDay } from "./motion";
import PlayModal from "./PlayModal";
import "./dressroom-prototype.css";

type Panel = "attendance" | "friends" | "missions" | "coupon" | "zoom";
const titles: Record<Panel, string> = { attendance: "매일 만나는 작은 선물", friends: "친구의 스타일 구경하기", missions: "차곡차곡, 연속 미션", coupon: "10레벨의 특별한 선물", zoom: "나의 스타일 크게 보기" };
const friends = [{ name: "리본구름" }, { name: "복숭아라떼" }, { name: "별빛코코" }];

export default function DressroomPrototypeTools({ outfit, accessories, appearance, onCategory }: {
  outfit: Outfit; accessories: Accessories; appearance: AvatarAppearance;
  onCategory: (category: "appearance" | "clothes" | "album") => void;
}) {
  const [panel, setPanel] = useState<Panel | null>(null);
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const attendance = useEngagementStore(state => state.attendance);
  const today = useKoreanDay();
  const checked = attendance.includes(today);
  const [feedback, setFeedback] = useState("");
  const checkIn = useEngagementStore(state => state.checkIn);
  const days = Array.from({ length: 7 }, (_, i) => { const date = new Date(`${today}T12:00:00+09:00`); date.setUTCDate(date.getUTCDate() - (6 - i)); return date.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }); });
  const action = (id: Panel, icon: ReactNode, label: string) => <button type="button" onClick={() => setPanel(id)}><span>{icon}</span><strong>{label}</strong></button>;
  return <>
    <div className="dressroom-activity-rail" aria-label="드레스룸 활동">
      {action("attendance", <CalendarCheck size={20} />, "출석체크")}
      {action("friends", <Users size={20} />, "친구찾기")}
      {action("missions", <Zap size={20} />, "연속 미션")}
      <button type="button" className="dressroom-coupon-teaser" onClick={() => setPanel("coupon")}><Gift size={23} /><span>10레벨 달성하면<strong>특별한 쿠폰 선물!</strong></span></button>
    </div>
    <div className="dressroom-quick-tools" aria-label="꾸미기 바로가기"><button type="button" aria-label="얼굴과 헤어 꾸미기" onClick={() => onCategory("appearance")}><Smile size={21} /></button><button type="button" aria-label="의상 고르기" onClick={() => onCategory("clothes")}><Shirt size={21} /></button></div>
    <button type="button" className="dressroom-expand" aria-label="아바타 크게 보기" onClick={() => setPanel("zoom")}><Maximize2 size={19} /></button>
    {panel && <PlayModal title={titles[panel]} kind="dressroom-tools" close={() => setPanel(null)}><div className="dressroom-tool-panel">
      {panel === "attendance" && <><span className="dressroom-tool-symbol"><CalendarCheck size={30} /></span><h2>{checked ? "오늘도 만나서 반가워요!" : "오늘의 출석을 남겨볼까요?"}</h2><p>꾸준히 찾아올수록, 내 옷장도 풍성해져요.</p><div className="dressroom-week">{days.map(day => <span key={day} className={attendance.includes(day) ? "is-checked" : ""}><small>{Number(day.slice(-2))}일</small>{attendance.includes(day) ? <Check size={18} /> : <span>♡</span>}</span>)}</div><p>지금까지 {attendance.length}일 함께했어요.</p><button type="button" className="playground-primary" disabled={checked} onClick={() => { setFeedback(checkIn() ? "오늘의 출석을 기록했어요." : "출석 상태를 확인한 뒤 다시 시도해 주세요."); }}>{checked ? "오늘 출석 완료" : "오늘 출석하고 10 P 받기"}<ChevronRight size={16} /></button><p role="status">{feedback}</p></>}
      {panel === "friends" && <><p>친구찾기 화면 미리보기 · 추천 스타일을 둘러보세요.</p><label className="dressroom-friend-search"><Search size={18} /><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="닉네임으로 찾기" aria-label="추천 스타일 닉네임 검색" /></label><div className="dressroom-friend-list">{friends.filter(friend => friend.name.includes(query.trim())).map(friend => <div key={friend.name}><span className="dressroom-friend-portrait"><Avatar outfit={outfit} accessories={accessories} appearance={appearance} /></span><strong>{friend.name}<small>스타일 미리보기</small></strong><button type="button" aria-pressed={favorites.includes(friend.name)} onClick={() => setFavorites(current => current.includes(friend.name) ? current.filter(name => name !== friend.name) : [...current, friend.name])}>{favorites.includes(friend.name) ? "관심 해제" : "관심 스타일"}</button></div>)}{!friends.some(friend => friend.name.includes(query.trim())) && <p>이 닉네임의 추천 스타일이 없어요.</p>}</div><small className="dressroom-prototype-note">추천 닉네임과 관심 표시는 화면 시안이며, 실제 친구 계정에 연결되지 않아요.</small></>}
      {panel === "missions" && <><span className="dressroom-tool-symbol"><Zap size={30} /></span><h2>오늘도 한 걸음 더 예쁘게</h2><p>출석하고, 스타일을 기록하며 나만의 루틴을 만들어요.</p><div className="dressroom-mission-list"><button type="button" onClick={() => setPanel("attendance")}><CalendarCheck size={21} /><span>오늘 출석하기<small>{checked ? "오늘 출석 완료" : "포인트 혜택을 확인해요"}</small></span>{checked ? <Check size={18} /> : <ChevronRight size={18} />}</button><button type="button" onClick={() => { setPanel(null); onCategory("album"); }}><Sparkles size={21} /><span>나의 코디 기록하기<small>코디북에서 마음에 드는 룩을 저장해요</small></span><ChevronRight size={18} /></button></div><div className="dressroom-streak"><strong>7일 출석 목표</strong><progress max={7} value={days.filter(day => attendance.includes(day)).length} /><small>최근 7일 중 {days.filter(day => attendance.includes(day)).length}일 출석</small></div></>}
      {panel === "coupon" && <><span className="dressroom-tool-symbol"><Gift size={34} /></span><h2>꾸미는 즐거움에, 선물까지</h2><div className="dressroom-coupon-preview"><small>LEVEL 10 SPECIAL</small><strong>나를 위한 뷰티 쿠폰</strong><span>10레벨 달성 혜택</span></div><p>레벨 쿠폰 화면 미리보기예요.<br />지급 조건과 혜택은 준비 중이며, 현재 쿠폰이 발급되지는 않아요.</p><button type="button" className="playground-primary" onClick={() => setPanel(null)}>다시 꾸미러 가기</button></>}
      {panel === "zoom" && <><div className="dressroom-zoom-avatar"><Avatar outfit={outfit} accessories={accessories} appearance={appearance} /></div><p>지금 미리 입어본 스타일이에요.</p><button type="button" className="playground-primary" onClick={() => setPanel(null)}>이어서 꾸미기</button></>}
    </div></PlayModal>}
  </>;
}
