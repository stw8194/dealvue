import { useRef, useState, type CSSProperties } from "react";
import { Check, ChevronRight, Gem, Heart, ShoppingBag, Sparkles, Target } from "lucide-react";
import { pointBalance, useEngagementStore } from "../store";
import { ACCESSORIES, BACKDROPS, COLLECTIONS, LOOKS, backdropStyle, type AccessorySlot, type Outfit, type SavedLook } from "./data";
import { Avatar, OutfitThumbnail } from "./Avatar";
import { AccessoryThumbnail } from "./Accessories";
import { useAmbientMotion } from "./motion";
import { BackdropThumbnail, StudioBackdrop } from "./StudioBackdrop";
import Lookbook from "./Lookbook";
import AppearanceEditor from "./AppearanceEditor";
import { normalizeAppearance, sameAppearance } from "./appearance";
import { isAvailableAccessory } from "./accessoryCatalog";

const categories = [{ id: "clothes", label: "옷" }, { id: "appearance", label: "얼굴·헤어" }, { id: "hair", label: "헤어 장식" }, { id: "ears", label: "귀걸이" }, { id: "bag", label: "가방" }, { id: "necklace", label: "목걸이" }, { id: "background", label: "배경" }, { id: "album", label: "코디북" }] as const;
type Category = "clothes" | "appearance" | AccessorySlot | "background" | "album";
export default function Wardrobe({ onEarn, initialCollection, initialOutfit }: { onEarn: () => void; initialCollection?: string; initialOutfit?: Outfit }) {
  const outfit = useEngagementStore(state => state.outfit);
  const owned = useEngagementStore(state => state.ownedOutfits);
  const worn = useEngagementStore(state => state.accessories);
  const wornAppearance = useEngagementStore(state => state.appearance);
  const chooseAppearance = useEngagementStore(state => state.chooseAppearance);
  const [appearance, setAppearance] = useState(wornAppearance);
  const ownedAccessories = useEngagementStore(state => state.ownedAccessories);
  const balance = useEngagementStore(state => pointBalance(state.pointHistory));
  const chooseOutfit = useEngagementStore(state => state.chooseOutfit);
  const chooseAccessory = useEngagementStore(state => state.chooseAccessory);
  const backdrop = useEngagementStore(state => state.backdrop);
  const ownedBackdrops = useEngagementStore(state => state.ownedBackdrops);
  const chooseBackdrop = useEngagementStore(state => state.chooseBackdrop);
  const goal = useEngagementStore(state => state.lookGoal);
  const setGoal = useEngagementStore(state => state.setLookGoal);
  const [selected, setSelected] = useState(initialOutfit ?? outfit);
  const [selection, setSelection] = useState(() => ({ ...worn, hair: isAvailableAccessory(ACCESSORIES.find(item => item.id === worn.hair) ?? { design: "none" }) ? worn.hair : "hair-none" as const }));
  const [category, setCategory] = useState<Category>("clothes");
  const [collection, setCollection] = useState<string>(() => initialCollection === "all" || COLLECTIONS.some(item => item.id === initialCollection) ? initialCollection! : LOOKS.find(item => item.id === (initialOutfit ?? outfit))?.collection ?? "signature");
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [colorway, setColorway] = useState("all");
  const [selectedBackdrop, setSelectedBackdrop] = useState(backdrop);
  const [feedback, setFeedback] = useState("");
  const [celebration, setCelebration] = useState(0);
  const scene = useRef<HTMLDivElement>(null);
  useAmbientMotion(scene);
  const look = LOOKS.find(item => item.id === selected) ?? LOOKS[0];
  const accessory = category === "clothes" || category === "background" || category === "album" || category === "appearance" ? null : ACCESSORIES.find(item => item.id === selection[category])!;
  const background = category === "background" ? BACKDROPS.find(item => item.id === selectedBackdrop)! : null;
  const item = accessory ?? background ?? look;
  const isOwned = accessory ? ownedAccessories.includes(accessory.id) : background ? ownedBackdrops.includes(background.id) : owned.includes(look.id);
  const equipped = accessory ? worn[accessory.slot] === accessory.id : background ? backdrop === background.id : outfit === look.id;
  const affordable = balance >= item.price;
  const previewing = selected !== outfit || selectedBackdrop !== backdrop || !sameAppearance(appearance, wornAppearance) || Object.keys(selection).some(slot => selection[slot as AccessorySlot] !== worn[slot as AccessorySlot]);
  const previewLook = (next: Outfit) => {
    setSelected(next); setFeedback("");
  };
  const applySaved = (saved: SavedLook) => { setSelected(saved.outfit); setSelection({ ...saved.accessories, hair: isAvailableAccessory(ACCESSORIES.find(item => item.id === saved.accessories.hair) ?? { design: "none" }) ? saved.accessories.hair : "hair-none" }); setSelectedBackdrop(saved.backdrop); setAppearance(normalizeAppearance(saved.appearance ?? wornAppearance)); };
  const matches = (name: string) => name.includes(query.trim());
  const visibleLooks = LOOKS.filter(item => (collection === "all" || item.collection === collection) && (!ownedOnly || owned.includes(item.id)) && matches(item.name));
  const dress = () => {
    const done = accessory ? chooseAccessory(accessory.id) : background ? chooseBackdrop(background.id) : chooseOutfit(look.id);
    if (!done) { setFeedback("포인트를 조금 더 모아볼까요?"); return; }
    setFeedback(isOwned ? `${item.name} 착용 완료!` : `${item.name} 소장 완료! −${item.price} P`);
    setCelebration(value => value + 1);
  };
  return <div className="playground-content wardrobe-content fashion-studio">
    <div className={`avatar-stage ambient-scene backdrop-${selectedBackdrop}`} ref={scene} style={{ ...backdropStyle(selectedBackdrop), "--look-color": look.color } as CSSProperties}>
      <StudioBackdrop id={selectedBackdrop} />
      <span className="scene-eyebrow"><Heart size={12} /> MY AVATAR STUDIO</span><div className="studio-halo" /><div className="studio-pedestal" /><Sparkles className="stage-sparkle sparkle-one" size={24} /><Sparkles className="stage-sparkle sparkle-two" size={16} />
      <div className="avatar-illustration"><Avatar outfit={look.id} accessories={selection} appearance={appearance} threeD /></div>
      {celebration > 0 && <div className="dress-burst" key={celebration} aria-hidden="true">{Array.from({ length: 6 }, (_, i) => <span key={i} style={{ "--i": i } as CSSProperties}>✧</span>)}</div>}
      <div className="avatar-stage-label"><strong>{look.name}</strong><span>{look.mood}</span></div><span className="stage-footnote">{previewing ? "미리 입어보는 중" : "지금 나의 스타일"}</span>
    </div>
    <section className="wardrobe-controls" aria-labelledby="wardrobe-title"><div className="section-heading"><div><span className="mini-eyebrow">BUILD YOUR SIGNATURE LOOK</span><h2 id="wardrobe-title">옷부터 작은 반짝임까지</h2></div><Gem size={22} /></div><p className="section-description">마음껏 입어보고, 마음에 드는 것만 소장해요.</p>
      <div className="wardrobe-categories" role="group" aria-label="꾸미기 종류">{categories.map(item => <button key={item.id} type="button" aria-pressed={category === item.id} onClick={() => { setCategory(item.id); setQuery(""); setFeedback(""); }}>{item.label}</button>)}</div>
      {category === "clothes" && <div className="collection-filters" role="group" aria-label="의상 컬렉션"><button type="button" aria-pressed={collection === "all"} onClick={() => setCollection("all")}>전체 {LOOKS.length}</button>{COLLECTIONS.map(item => <button key={item.id} type="button" aria-pressed={collection === item.id} onClick={() => setCollection(item.id)}>{item.mark} {item.label}</button>)}</div>}
      {category !== "album" && category !== "appearance" && <div className="wardrobe-filter-row"><label className="owned-only-filter"><input type="checkbox" checked={ownedOnly} onChange={event => setOwnedOnly(event.target.checked)} /> 소장한 아이템만</label><input className="wardrobe-search" type="search" aria-label="아이템 이름으로 찾기" placeholder="이름으로 찾기" value={query} onChange={event => setQuery(event.target.value)} /></div>}
      {accessory && <div className="collection-filters colorway-filters" role="group" aria-label="장신구 색상">{[{ id: "all", name: "전체" }, { id: "original", name: "오리지널" }, { id: "pearl", name: "펄" }, { id: "midnight", name: "미드나잇" }].map(item => <button key={item.id} type="button" aria-pressed={colorway === item.id} onClick={() => setColorway(item.id)}>{item.name}</button>)}<span>12 디자인 · 36 컬러 아이템</span></div>}
      {category === "appearance" ? <AppearanceEditor value={appearance} dirty={!sameAppearance(appearance, wornAppearance)} onChange={setAppearance} onApply={() => { chooseAppearance(appearance); }} /> : category === "album" ? <Lookbook draft={{ outfit: selected, accessories: selection, backdrop: selectedBackdrop, appearance }} onApply={applySaved} /> : <>
      <div className="outfit-grid" role="group" aria-label={category === "clothes" ? "아바타 의상 선택" : "아바타 장신구 선택"}>
        {category === "clothes" ? visibleLooks.map(item => <button key={item.id} type="button" className={`outfit-card ${selected === item.id ? "is-selected" : ""}`} aria-pressed={selected === item.id} aria-label={`${item.name} · ${owned.includes(item.id) ? "보유" : `${item.price} 포인트`}`} onClick={() => previewLook(item.id)}><div className="outfit-preview">{owned.includes(item.id) && <span className="outfit-owned"><Check size={10} /></span>}<OutfitThumbnail outfit={item.id} /></div><span className="outfit-name">{item.name}</span><span className="outfit-price">{owned.includes(item.id) ? outfit === item.id ? "입는 중" : "소장한 룩" : `${item.price} P`}</span></button>) : category === "background" ? BACKDROPS.filter(item => (!ownedOnly || ownedBackdrops.includes(item.id)) && matches(item.name)).map(item => <button key={item.id} type="button" className={`outfit-card ${selectedBackdrop === item.id ? "is-selected" : ""}`} aria-pressed={selectedBackdrop === item.id} aria-label={`${item.name} · ${ownedBackdrops.includes(item.id) ? "보유" : `${item.price} 포인트`}`} onClick={() => { setSelectedBackdrop(item.id); setFeedback(""); }}><div className="outfit-preview"><BackdropThumbnail id={item.id} /></div><span className="outfit-name">{item.name}</span><span className="outfit-price">{ownedBackdrops.includes(item.id) ? "소장한 배경" : `${item.price} P`}</span></button>) : ACCESSORIES.filter(item => isAvailableAccessory(item) && item.slot === category && (!ownedOnly || ownedAccessories.includes(item.id)) && matches(item.name) && (item.design === "none" || colorway === "all" || item.colorway === colorway)).map(item => <button key={item.id} type="button" className={`outfit-card ${selection[item.slot] === item.id ? "is-selected" : ""}`} aria-pressed={selection[item.slot] === item.id} aria-label={`${item.name} · ${ownedAccessories.includes(item.id) ? "보유" : `${item.price} 포인트`}`} onClick={() => { setSelection(current => ({ ...current, [item.slot]: item.id })); setFeedback(""); }}><div className="outfit-preview">{ownedAccessories.includes(item.id) && <span className="outfit-owned"><Check size={10} /></span>}<AccessoryThumbnail id={item.id} /></div><span className="outfit-name">{item.name}</span><span className="outfit-price">{ownedAccessories.includes(item.id) ? worn[item.slot] === item.id ? "착용 중" : "소장한 아이템" : `${item.price} P`}</span></button>)}
      </div>
      {category === "clothes" && visibleLooks.length === 0 && <p className="lookbook-empty">조건에 맞는 의상이 없어요.<br /><button type="button" onClick={() => { setOwnedOnly(false); setQuery(""); }}>모든 의상 보기</button></p>}
      <div className="wardrobe-action"><div className="selected-look"><div><span>{accessory ? "FINISHING TOUCH" : look.tag}</span><strong>{item.name}</strong></div><span>{isOwned ? "내 옷장에 있어요" : `${item.price} P`}</span></div>
      <button className="playground-primary" type="button" disabled={equipped || (!isOwned && !affordable)} onClick={dress}>{equipped ? <><Check size={17} /> {background ? "지금 쓰고 있는 배경" : accessory ? "지금 착용하고 있어요" : "지금 입고 있어요"}</> : isOwned ? <><Sparkles size={17} /> {background ? "이 배경으로 바꾸기" : accessory ? "이 아이템 착용하기" : "이 룩으로 갈아입기"}</> : <><ShoppingBag size={17} /> {item.price} P로 소장하고 {background ? "꾸미기" : accessory ? "착용하기" : "입기"}</>}</button>
      {category === "clothes" && !isOwned && <button type="button" className={`look-goal-button ${goal === look.id ? "is-goal" : ""}`} onClick={() => setGoal(look.id)}><Target size={14} /> {goal === look.id ? "다음에 모을 옷으로 찜했어요" : "다음에 모을 옷으로 찜하기"}</button>}
      {!isOwned && !affordable && <button type="button" className="earn-more-link" onClick={onEarn}>포인트를 모으러 가볼까요? <ChevronRight size={14} /></button>}<p className="playground-feedback" role="status">{feedback}</p></div></>}
    </section>
  </div>;
}
