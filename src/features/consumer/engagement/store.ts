import { create } from "zustand";
import { isAvailableAccessory } from "./playground/accessoryCatalog";
import { persist } from "zustand/middleware";
import { DEFAULT_APPEARANCE, normalizeAppearance, type AvatarAppearance } from "./playground/appearance";
import { ACCESSORIES, BACKDROPS, DEFAULT_ACCESSORIES, LOOKS, ROULETTE_REWARDS, type Accessories, type AccessoryId, type BackdropId, type Outfit, type RoulettePlay, type SavedLook } from "./playground/data";
import { applyOptimistic, registerLedgerCache, resetLedger, syncFromLedger, type LedgerState, type PointEntry } from "../ledger";

export const PREVIEW_AUTHOR = "preview-consumer";
export const REGIONS = ["전체", "강남구", "마포구", "성동구", "기타 지역"] as const;
export const TAGS = ["헤어", "메이크업", "피부관리", "네일", "속눈썹", "일상"] as const;
export type Board = "playground" | "neighbors";
export type CommunityPost = {
  id: string;
  authorId: string;
  authorName: string;
  board: Board;
  region: string;
  title: string;
  body: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  liked: boolean;
  comments: { id: string; authorId: string; authorName: string; body: string; createdAt: string }[];
};
type PostInput = Pick<CommunityPost, "board" | "region" | "title" | "body" | "tags">;
export type { PointEntry };
type Notification = { id: string; title: string; body: string; link: string; createdAt: string; read: boolean; kind: "activity" | "benefits" };
type Short = { id: string; title: string; url: string; tag: string; createdAt: string };
export type Mission = "fortune" | "community";

export function localDay(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  return ["year", "month", "day"].map(type => parts.find(part => part.type === type)?.value).join("-");
}

function initialData() {
  return {
    posts: [] as CommunityPost[],
    attendance: [] as string[],
    missionClaims: [] as string[],
    pointHistory: [] as PointEntry[],
    outfit: "basic" as Outfit,
    appearance: { ...DEFAULT_APPEARANCE },
    ownedOutfits: ["basic"] as Outfit[],
    accessories: { ...DEFAULT_ACCESSORIES } as Accessories,
    ownedAccessories: Object.values(DEFAULT_ACCESSORIES) as AccessoryId[],
    backdrop: "lavender" as BackdropId,
    ownedBackdrops: ["lavender"] as BackdropId[],
    savedLooks: [] as SavedLook[],
    lookGoal: null as Outfit | null,
    roulettePlay: null as RoulettePlay | null,
    shorts: [] as Short[],
    notifications: [] as Notification[],
    notificationSettings: { activity: true, benefits: true },
  };
}

type EngagementStore = ReturnType<typeof initialData> & {
  savePost: (input: PostInput, id?: string) => string | null;
  deletePost: (id: string) => boolean;
  togglePostLike: (id: string) => void;
  addComment: (postId: string, body: string) => boolean;
  deleteComment: (postId: string, commentId: string) => void;
  editComment: (postId: string, commentId: string, body: string) => boolean;
  checkIn: () => boolean;
  claimMission: (mission: Mission) => boolean;
  chooseOutfit: (outfit: Outfit) => boolean;
  chooseAppearance: (appearance: AvatarAppearance) => boolean;
  chooseAccessory: (accessory: AccessoryId) => boolean;
  chooseBackdrop: (backdrop: BackdropId) => boolean;
  setLookGoal: (outfit: Outfit) => void;
  saveLook: (name: string, look: Pick<SavedLook, "outfit" | "accessories" | "backdrop" | "appearance">) => string | null;
  applySavedLook: (id: string) => boolean;
  deleteSavedLook: (id: string) => void;
  beginRoulette: () => RoulettePlay | null;
  settleRoulette: (id: string) => boolean;
  saveShort: (title: string, url: string, tag: string) => boolean;
  deleteShort: (id: string) => void;
  readNotification: (id?: string) => void;
  setNotificationSetting: (key: "activity" | "benefits", enabled: boolean) => void;
  /** Adds (positive) or spends (negative) points; spending fails when the balance is short. */
  adjustPoints: (reason: string, amount: number) => boolean;
  notify: (title: string, body: string, link: string, kind?: Notification["kind"]) => void;
  reset: () => void;
};

function canChange() { return true; }
function identifier() { return crypto.randomUUID(); }
function newPoint(reason: string, amount: number): PointEntry { return { id: identifier(), reason, amount, createdAt: new Date().toISOString() }; }
function notice(title: string, body: string, link: string, kind: Notification["kind"] = "benefits"): Notification {
  return { id: identifier(), title, body, link, kind, createdAt: new Date().toISOString(), read: false };
}
export function pointBalance(history: PointEntry[]) { return history.reduce((sum, entry) => sum + entry.amount, 0); }

type OwnedKey = "ownedOutfits" | "ownedAccessories" | "ownedBackdrops";
/** Owning an item already is free; otherwise its price is spent from the ledger balance. */
function purchase(state: LedgerState, key: OwnedKey, id: string, price: number, entry: PointEntry): LedgerState | null {
  const owned = state[key] as string[];
  if (owned.includes(id)) return state;
  if (pointBalance(state.pointHistory) < price) return null;
  return { ...state, [key]: [...owned, id], pointHistory: price ? [entry, ...state.pointHistory] : state.pointHistory };
}

export const useEngagementStore = create<EngagementStore>()(persist((set, get) => ({
  ...initialData(),
  savePost: (input, id) => {
    if (!canChange() || !input.title.trim() || !input.body.trim()) return null;
    const existing = id ? get().posts.find(post => post.id === id && post.authorId === PREVIEW_AUTHOR) : undefined;
    if (id && !existing) return null;
    const now = new Date().toISOString();
    const post: CommunityPost = {
      ...input, title: input.title.trim().slice(0, 80), body: input.body.trim().slice(0, 3000),
      id: existing?.id ?? identifier(), authorId: PREVIEW_AUTHOR, authorName: "나",
      createdAt: existing?.createdAt ?? now, updatedAt: now, liked: existing?.liked ?? false, comments: existing?.comments ?? [],
    };
    set(state => ({
      posts: existing ? state.posts.map(item => item.id === id ? post : item) : [post, ...state.posts],
      notifications: state.notificationSettings.activity && !existing ? [notice("게시글 등록 완료", "등록한 글을 확인해 보세요.", `/community/${post.id}`, "activity"), ...state.notifications] : state.notifications,
    }));
    return post.id;
  },
  deletePost: id => {
    if (!canChange() || !get().posts.some(post => post.id === id && post.authorId === PREVIEW_AUTHOR)) return false;
    set(state => ({ posts: state.posts.filter(post => post.id !== id) }));
    return true;
  },
  togglePostLike: id => {
    if (canChange()) set(state => ({ posts: state.posts.map(post => post.id === id ? { ...post, liked: !post.liked } : post) }));
  },
  addComment: (postId, body) => {
    if (!canChange() || !body.trim() || !get().posts.some(post => post.id === postId)) return false;
    const comment = { id: identifier(), authorId: PREVIEW_AUTHOR, authorName: "나", body: body.trim().slice(0, 500), createdAt: new Date().toISOString() };
    set(state => ({ posts: state.posts.map(post => post.id === postId ? { ...post, comments: [...post.comments, comment] } : post) }));
    return true;
  },
  deleteComment: (postId, commentId) => {
    if (canChange()) set(state => ({ posts: state.posts.map(post => post.id === postId ? { ...post, comments: post.comments.filter(comment => comment.id !== commentId || comment.authorId !== PREVIEW_AUTHOR) } : post) }));
  },
  editComment: (postId, commentId, body) => {
    if (!canChange() || !body.trim()) return false;
    const owned = get().posts.find(post => post.id === postId)?.comments.some(comment => comment.id === commentId && comment.authorId === PREVIEW_AUTHOR);
    if (!owned) return false;
    set(state => ({ posts: state.posts.map(post => post.id === postId ? { ...post, comments: post.comments.map(comment => comment.id === commentId ? { ...comment, body: body.trim().slice(0, 500) } : comment) } : post) }));
    return true;
  },
  // Points, attendance, rewards and purchases go through the device ledger so two tabs cannot
  // spend the same points or claim the same daily reward twice.
  checkIn: () => {
    const today = localDay(), entry = newPoint("", 0);
    let amount = 0;
    const ok = applyOptimistic(state => {
      if (state.attendance.includes(today)) return null;
      const totalDays = state.attendance.length + 1, bonus = [7, 14, 21, 30].includes(totalDays) ? 50 : 0;
      amount = 10 + bonus;
      return { ...state, attendance: [...state.attendance, today], pointHistory: [{ ...entry, reason: `출석체크${bonus ? ` · 누적 ${totalDays}일 보너스` : ""}`, amount }, ...state.pointHistory] };
    });
    if (ok) get().notify("출석 완료", `${amount} 포인트를 받았어요.`, "/rewards", "benefits");
    return ok;
  },
  claimMission: mission => {
    const key = `${localDay()}:${mission}`;
    if (mission === "community" && !get().posts.some(post => post.authorId === PREVIEW_AUTHOR && localDay(new Date(post.createdAt)) === localDay())) return false;
    const entry = newPoint(mission === "fortune" ? "오늘의 수정구슬 운세" : "오늘 커뮤니티 글쓰기 미션", 5);
    const ok = applyOptimistic(state => state.missionClaims.includes(key) ? null : { ...state, missionClaims: [...state.missionClaims, key], pointHistory: [entry, ...state.pointHistory] });
    if (ok && mission === "fortune") get().notify("오늘의 운세 선물", "5 포인트를 받았어요.", "/fortune", "benefits");
    return ok;
  },
  chooseOutfit: outfit => {
    const look = LOOKS.find(item => item.id === outfit);
    if (!look) return false;
    const entry = newPoint(`아바타 의상 · ${look.name}`, -look.price);
    const ok = applyOptimistic(state => purchase(state, "ownedOutfits", outfit, look.price, entry));
    if (ok) set({ outfit });
    return ok;
  },
  chooseAppearance: appearance => {
    if (!canChange()) return false;
    set({ appearance: normalizeAppearance(appearance) });
    return true;
  },
  chooseAccessory: id => {
    const item = ACCESSORIES.find(item => item.id === id);
    if (!item || !isAvailableAccessory(item)) return false;
    const entry = newPoint(`아바타 장신구 · ${item.name}`, -item.price);
    const ok = applyOptimistic(state => purchase(state, "ownedAccessories", id, item.price, entry));
    if (ok) set(state => ({ accessories: { ...state.accessories, [item.slot]: id } }));
    return ok;
  },
  chooseBackdrop: id => {
    const item = BACKDROPS.find(item => item.id === id);
    if (!item) return false;
    const entry = newPoint(`아바타 배경 · ${item.name}`, -item.price);
    const ok = applyOptimistic(state => purchase(state, "ownedBackdrops", id, item.price, entry));
    if (ok) set({ backdrop: id });
    return ok;
  },
  setLookGoal: outfit => { if (canChange() && LOOKS.some(look => look.id === outfit)) set(state => ({ lookGoal: state.lookGoal === outfit ? null : outfit })); },
  saveLook: (name, look) => {
    const state = get();
    if (!canChange() || state.savedLooks.length >= 6 || !state.ownedOutfits.includes(look.outfit) || !state.ownedBackdrops.includes(look.backdrop) || !Object.values(look.accessories).every(id => state.ownedAccessories.includes(id))) return null;
    const id = identifier();
    set({ savedLooks: [...state.savedLooks, { ...look, appearance: normalizeAppearance(look.appearance ?? state.appearance), accessories: { ...look.accessories }, id, name: name.trim().slice(0, 24) || `나의 코디 ${state.savedLooks.length + 1}`, createdAt: new Date().toISOString() }] });
    return id;
  },
  applySavedLook: id => {
    const state = get(), look = state.savedLooks.find(item => item.id === id);
    if (!canChange() || !look || !state.ownedOutfits.includes(look.outfit) || !state.ownedBackdrops.includes(look.backdrop) || !Object.values(look.accessories).every(id => state.ownedAccessories.includes(id))) return false;
    set({ outfit: look.outfit, accessories: { ...DEFAULT_ACCESSORIES, ...look.accessories }, backdrop: look.backdrop, appearance: normalizeAppearance(look.appearance ?? state.appearance) });
    return true;
  },
  deleteSavedLook: id => { if (canChange()) set(state => ({ savedLooks: state.savedLooks.filter(item => item.id !== id) })); },
  beginRoulette: () => {
    const day = localDay();
    // Draw before animating and store the draw: reloads cannot redraw a better prize.
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    const index = values[0] % ROULETTE_REWARDS.length;
    const play: RoulettePlay = { id: identifier(), day, index, amount: ROULETTE_REWARDS[index], settled: false };
    const ok = applyOptimistic(state => state.roulettePlay?.day === day || state.missionClaims.includes(`${day}:roulette`) || (state.roulettePlay && !state.roulettePlay.settled) ? null : { ...state, roulettePlay: play });
    return ok ? play : null;
  },
  settleRoulette: id => {
    const play = get().roulettePlay;
    if (!play || play.id !== id || play.settled) return false;
    const key = `${play.day}:roulette`, entry = newPoint("오늘의 행운 룰렛", play.amount);
    const rewarded = !get().missionClaims.includes(key);
    const ok = applyOptimistic(state => {
      const current = state.roulettePlay;
      if (!current || current.id !== id || current.settled) return null;
      if (state.missionClaims.includes(key)) return { ...state, roulettePlay: { ...current, settled: true } };
      return { ...state, roulettePlay: { ...current, settled: true }, missionClaims: [...state.missionClaims, key], pointHistory: [{ ...entry, amount: current.amount }, ...state.pointHistory] };
    });
    if (!ok || !rewarded) return false;
    get().notify("룰렛 선물 도착", `${play.amount} 포인트를 받았어요.`, "/rewards?tab=roulette", "benefits");
    return true;
  },
  saveShort: (title, rawUrl, tag) => {
    if (!canChange() || !title.trim()) return false;
    let url: URL;
    try { url = new URL(rawUrl.trim()); } catch { return false; }
    if (url.protocol !== "https:" || url.username || url.password) return false;
    set(state => ({ shorts: [{ id: identifier(), title: title.trim().slice(0, 80), url: url.toString(), tag, createdAt: new Date().toISOString() }, ...state.shorts] }));
    return true;
  },
  deleteShort: id => { if (canChange()) set(state => ({ shorts: state.shorts.filter(short => short.id !== id) })); },
  readNotification: id => { if (canChange()) set(state => ({ notifications: state.notifications.map(item => !id || item.id === id ? { ...item, read: true } : item) })); },
  setNotificationSetting: (key, enabled) => { if (canChange()) set(state => ({ notificationSettings: { ...state.notificationSettings, [key]: enabled } })); },
  adjustPoints: (reason, amount) => {
    if (!Number.isInteger(amount) || amount === 0) return false;
    const entry = newPoint(reason, amount);
    return applyOptimistic(state => amount < 0 && pointBalance(state.pointHistory) + amount < 0 ? null : { ...state, pointHistory: [entry, ...state.pointHistory] });
  },
  notify: (title, body, link, kind = "activity") => set(state => state.notificationSettings[kind] ? { notifications: [notice(title, body, link, kind), ...state.notifications] } : state),
  reset: () => {
    set(initialData());
    void resetLedger();
  },
}), {
  name: "dealvue-consumer-engagement-preview-v1", version: 1,
  merge: (persisted, current) => {
    const saved = (persisted ?? {}) as Partial<EngagementStore>;
    return { ...current, ...saved, posts: (saved.posts ?? current.posts).filter(post => post.authorId !== "example-neighbor"), appearance: normalizeAppearance(saved.appearance), savedLooks: (saved.savedLooks ?? current.savedLooks).map(look => ({ ...look, appearance: look.appearance ? normalizeAppearance(look.appearance) : undefined })), accessories: { ...DEFAULT_ACCESSORIES, ...saved.accessories }, ownedAccessories: [...new Set([...Object.values(DEFAULT_ACCESSORIES), ...(saved.ownedAccessories ?? current.ownedAccessories)])] };
  },
}));

// Keep daily locks and the wardrobe current in other tabs of this browser.
if (typeof window !== "undefined") {
  const sync = (event: StorageEvent) => {
    // The stored copy may lag the ledger, so the ledger is re-applied after reloading it.
    if (event.key === "dealvue-consumer-engagement-preview-v1") void Promise.resolve(useEngagementStore.persist.rehydrate()).then(syncFromLedger);
  };
  window.addEventListener("storage", sync);
  import.meta.hot?.dispose(() => window.removeEventListener("storage", sync));
}

const LEDGER_KEYS = ["pointHistory", "attendance", "missionClaims", "roulettePlay", "ownedOutfits", "ownedAccessories", "ownedBackdrops"] as const;
registerLedgerCache({
  read: () => {
    const state = useEngagementStore.getState();
    return Object.fromEntries(LEDGER_KEYS.map(key => [key, state[key]])) as Partial<LedgerState>;
  },
  write: slice => {
    const next = Object.fromEntries(LEDGER_KEYS.filter(key => slice[key] !== undefined).map(key => [key, slice[key]])) as Partial<LedgerState>;
    // Free default accessories are always owned, even after a reset.
    if (next.ownedAccessories) next.ownedAccessories = [...new Set([...Object.values(DEFAULT_ACCESSORIES), ...next.ownedAccessories])];
    useEngagementStore.setState(next);
  },
});
