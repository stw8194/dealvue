import { useState } from "react";
import { BookmarkPlus, Check, Heart, Trash2 } from "lucide-react";
import { useEngagementStore } from "../store";
import { ACCESSORIES, COLLECTIONS, LOOKS, type SavedLook } from "./data";
import { Avatar } from "./Avatar";
import { HAIRSTYLES } from "./appearance";

export default function Lookbook({ draft, onApply }: { draft: Pick<SavedLook, "outfit" | "accessories" | "backdrop" | "appearance">; onApply: (look: SavedLook) => void }) {
  const owned = useEngagementStore(state => state.ownedOutfits);
  const ownedAccessories = useEngagementStore(state => state.ownedAccessories);
  const ownedBackdrops = useEngagementStore(state => state.ownedBackdrops);
  const saved = useEngagementStore(state => state.savedLooks);
  const appearance = useEngagementStore(state => state.appearance);
  const save = useEngagementStore(state => state.saveLook);
  const apply = useEngagementStore(state => state.applySavedLook);
  const remove = useEngagementStore(state => state.deleteSavedLook);
  const [name, setName] = useState("");
  const [feedback, setFeedback] = useState("");
  const available = owned.includes(draft.outfit) && ownedBackdrops.includes(draft.backdrop) && Object.values(draft.accessories).every(id => ownedAccessories.includes(id));
  return <div className="lookbook-panel"><div className="collection-summary"><span>MY LITTLE COLLECTION</span><strong>{owned.length}<small> / {LOOKS.length} 벌</small></strong><p>취향이 쌓일수록 더 특별해지는 나의 옷장</p></div>
    <div className="collection-progress-list">{COLLECTIONS.map(collection => {
      const looks = LOOKS.filter(look => look.collection === collection.id), count = looks.filter(look => owned.includes(look.id)).length;
      return <div className="collection-progress" key={collection.id}><span>{collection.mark}</span><div><strong>{collection.label} <small>{count} / {looks.length}</small></strong><p>{collection.description}</p><div className="collection-progress-track"><i style={{ width: `${count / looks.length * 100}%` }} /></div></div>{count === looks.length && <Check size={17} className="collection-complete" />}</div>;
    })}</div>
    <h3 className="lookbook-title"><Heart size={14} /> 나의 코디북 <small>{saved.length} / 6</small></h3>
    <form className="save-look-form" onSubmit={event => { event.preventDefault(); if (save(name, draft)) { setName(""); setFeedback("이 조합을 코디북에 저장했어요."); } else setFeedback("소장한 아이템 조합을 최대 6개 저장할 수 있어요."); }}><label><span className="sr-only">코디 이름</span><input value={name} onChange={event => setName(event.target.value)} maxLength={24} placeholder="코디에 이름을 붙여주세요" /></label><button type="submit" disabled={!available || saved.length >= 6} aria-label="현재 코디 저장"><BookmarkPlus size={16} /> 저장</button></form>
    {!available && <p className="lookbook-note">입어본 아이템을 소장하면 이 조합을 저장할 수 있어요.</p>}
    {saved.length === 0 ? <p className="lookbook-empty">좋아하는 조합을 저장해 두고,<br />다음에는 한 번에 갈아입어 보세요.</p> : <div className="saved-look-grid">{saved.map(look => <article key={look.id}><button className="saved-look-apply" type="button" aria-label={`${look.name} 코디 입기`} onClick={() => { if (apply(look.id)) { onApply(look); setFeedback(`${look.name} 코디로 갈아입었어요.`); } }}><div><Avatar outfit={look.outfit} accessories={look.accessories} appearance={look.appearance ?? appearance} /></div><strong>{look.name}</strong><span>{HAIRSTYLES.find(hair => hair.id === (look.appearance ?? appearance).hairstyle)?.name} · {Object.values(look.accessories).filter(id => !id.endsWith("-none")).map(id => ACCESSORIES.find(item => item.id === id)?.name).join(" · ") || "나만의 의상 코디"}</span></button><button type="button" className="saved-look-delete" aria-label={`${look.name} 코디 삭제`} onClick={() => remove(look.id)}><Trash2 size={12} /></button></article>)}</div>}
    <p role="status" className="playground-feedback">{feedback}</p>
  </div>;
}
