import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_APPEARANCE, normalizeAppearance, type AvatarAppearance } from "./playground/appearance";
import { usePreviewStore } from "@/features/consumer/preview";
import { ACCESSORIES, BACKDROPS, DEFAULT_ACCESSORIES, LOOKS, ROULETTE_REWARDS, type Accessories, type AccessoryId, type BackdropId, type Outfit, type RoulettePlay, type SavedLook } from "./playground/data";

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
export type PointEntry = { id: string; reason: string; amount: number; createdAt: string };
type Notification = { id: string; title: string; body: string; link: string; createdAt: string; read: boolean; kind: "activity" | "benefits" };
type Short = { id: string; title: string; url: string; tag: string; createdAt: string };
export type Mission = "fortune" | "community";

export function localDay(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  return ["year", "month", "day"].map(type => parts.find(part => part.type === type)?.value).join("-");
}

function seedPosts(): CommunityPost[] {
  const timestamp = "2026-09-01T09:00:00+09:00";
  return [
    { id: "example-playground", authorId: "example-neighbor", authorName: "예시 이웃", board: "playground", region: "강남구", title: "가을 네일 컬러 이야기해요", body: "발표용 예시 글입니다. 이번 가을에 시도하고 싶은 네일 컬러를 댓글로 남겨보세요.", tags: ["네일"], createdAt: timestamp, updatedAt: timestamp, liked: false, comments: [] },
    { id: "example-neighbors", authorId: "example-neighbor", authorName: "예시 이웃", board: "neighbors", region: "마포구", title: "우리 동네에서 쉬어가는 하루", body: "발표용 예시 글입니다. 동네와 태그로 관심 있는 이야기를 찾아보세요.", tags: ["일상"], createdAt: timestamp, updatedAt: timestamp, liked: false, comments: [] },
  ];
}

function initialData() {
  return {
    posts: seedPosts(),
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
  reset: () => void;
};

function canChange() { return usePreviewStore.getState().enabled; }
function identifier() { return crypto.randomUUID(); }
function newPoint(reason: string, amount: number): PointEntry { return { id: identifier(), reason, amount, createdAt: new Date().toISOString() }; }
function notice(title: string, body: string, link: string, kind: Notification["kind"] = "benefits"): Notification {
  return { id: identifier(), title, body, link, kind, createdAt: new Date().toISOString(), read: false };
}
export function pointBalance(history: PointEntry[]) { return history.reduce((sum, entry) => sum + entry.amount, 0); }

export const useEngagementStore = create<EngagementStore>()(persist((set, get) => ({
  ...initialData(),
  savePost: (input, id) => {
    if (!canChange() || !input.title.trim() || !input.body.trim()) return null;
    const existing = id ? get().posts.find(post => post.id === id && post.authorId === PREVIEW_AUTHOR) : undefined;
    if (id && !existing) return null;
    const now = new Date().toISOString();
    const post: CommunityPost = {
      ...input, title: input.title.trim().slice(0, 80), body: input.body.trim().slice(0, 3000),
      id: existing?.id ?? identifier(), authorId: PREVIEW_AUTHOR, authorName: "나 (체험)",
      createdAt: existing?.createdAt ?? now, updatedAt: now, liked: existing?.liked ?? false, comments: existing?.comments ?? [],
    };
    set(state => ({
      posts: existing ? state.posts.map(item => item.id === id ? post : item) : [post, ...state.posts],
      notifications: state.notificationSettings.activity && !existing ? [notice("체험 게시글 저장", "이 브라우저에서 내 글을 확인할 수 있어요.", `/community/${post.id}`, "activity"), ...state.notifications] : state.notifications,
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
    const comment = { id: identifier(), authorId: PREVIEW_AUTHOR, authorName: "나 (체험)", body: body.trim().slice(0, 500), createdAt: new Date().toISOString() };
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
  checkIn: () => {
    const today = localDay();
    if (!canChange() || get().attendance.includes(today)) return false;
    const totalDays = get().attendance.length + 1;
    const bonus = [7, 14, 21, 30].includes(totalDays) ? 50 : 0;
    set(state => ({
      attendance: [...state.attendance, today],
      pointHistory: [newPoint(`출석체크${bonus ? ` · 누적 ${totalDays}일 보너스` : ""}`, 10 + bonus), ...state.pointHistory],
      notifications: state.notificationSettings.benefits ? [notice("체험 출석 완료", `${10 + bonus} 체험 포인트를 받았어요.`, "/rewards"), ...state.notifications] : state.notifications,
    }));
    return true;
  },
  claimMission: mission => {
    const key = `${localDay()}:${mission}`;
    if (!canChange() || get().missionClaims.includes(key)) return false;
    if (mission === "community" && !get().posts.some(post => post.authorId === PREVIEW_AUTHOR && localDay(new Date(post.createdAt)) === localDay())) return false;
    set(state => ({
      missionClaims: [...state.missionClaims, key],
      pointHistory: [newPoint(mission === "fortune" ? "오늘의 수정구슬 운세" : "오늘 커뮤니티 글쓰기 미션", 5), ...state.pointHistory],
      notifications: mission === "fortune" && state.notificationSettings.benefits ? [notice("오늘의 운세 선물", "5 체험 포인트를 받았어요.", "/fortune"), ...state.notifications] : state.notifications,
    }));
    return true;
  },
  chooseOutfit: outfit => {
    if (!canChange()) return false;
    const look = LOOKS.find(item => item.id === outfit);
    if (!look) return false;
    if (get().ownedOutfits.includes(outfit)) { set({ outfit }); return true; }
    if (pointBalance(get().pointHistory) < look.price) return false;
    set(state => ({ outfit, ownedOutfits: [...state.ownedOutfits, outfit], pointHistory: [newPoint(`아바타 의상 · ${look.name}`, -look.price), ...state.pointHistory] }));
    return true;
  },
  chooseAppearance: appearance => {
    if (!canChange()) return false;
    set({ appearance: normalizeAppearance(appearance) });
    return true;
  },
  chooseAccessory: id => {
    if (!canChange()) return false;
    const item = ACCESSORIES.find(item => item.id === id);
    if (!item) return false;
    const owned = get().ownedAccessories.includes(id);
    if (!owned && pointBalance(get().pointHistory) < item.price) return false;
    set(state => ({
      accessories: { ...state.accessories, [item.slot]: id },
      ownedAccessories: owned ? state.ownedAccessories : [...state.ownedAccessories, id],
      pointHistory: owned || item.price === 0 ? state.pointHistory : [newPoint(`아바타 장신구 · ${item.name}`, -item.price), ...state.pointHistory],
    }));
    return true;
  },
  chooseBackdrop: id => {
    if (!canChange()) return false;
    const item = BACKDROPS.find(item => item.id === id);
    if (!item) return false;
    const owned = get().ownedBackdrops.includes(id);
    if (!owned && pointBalance(get().pointHistory) < item.price) return false;
    set(state => ({ backdrop: id, ownedBackdrops: owned ? state.ownedBackdrops : [...state.ownedBackdrops, id], pointHistory: owned || item.price === 0 ? state.pointHistory : [newPoint(`아바타 배경 · ${item.name}`, -item.price), ...state.pointHistory] }));
    return true;
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
    const state = get(), day = localDay();
    if (!canChange() || state.roulettePlay?.day === day || state.missionClaims.includes(`${day}:roulette`) || (state.roulettePlay && !state.roulettePlay.settled)) return null;
    // Persist the draw before animating: reloads cannot redraw a better prize.
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    const index = values[0] % ROULETTE_REWARDS.length;
    const play: RoulettePlay = { id: identifier(), day, index, amount: ROULETTE_REWARDS[index], settled: false };
    set({ roulettePlay: play });
    return play;
  },
  settleRoulette: id => {
    const state = get(), play = state.roulettePlay;
    if (!canChange() || !play || play.id !== id || play.settled) return false;
    const key = `${play.day}:roulette`;
    if (state.missionClaims.includes(key)) { set({ roulettePlay: { ...play, settled: true } }); return false; }
    set({
      roulettePlay: { ...play, settled: true },
      missionClaims: [...state.missionClaims, key],
      pointHistory: [newPoint("오늘의 행운 룰렛", play.amount), ...state.pointHistory],
      notifications: state.notificationSettings.benefits ? [notice("룰렛 선물 도착", `${play.amount} 체험 포인트를 받았어요.`, "/rewards?tab=roulette"), ...state.notifications] : state.notifications,
    });
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
  reset: () => { if (canChange()) set(initialData()); },
}), {
  name: "dealvue-consumer-engagement-preview-v1", version: 1,
  merge: (persisted, current) => {
    const saved = (persisted ?? {}) as Partial<EngagementStore>;
    return { ...current, ...saved, appearance: normalizeAppearance(saved.appearance), savedLooks: (saved.savedLooks ?? current.savedLooks).map(look => ({ ...look, appearance: look.appearance ? normalizeAppearance(look.appearance) : undefined })), accessories: { ...DEFAULT_ACCESSORIES, ...saved.accessories }, ownedAccessories: [...new Set([...Object.values(DEFAULT_ACCESSORIES), ...(saved.ownedAccessories ?? current.ownedAccessories)])] };
  },
}));

// Keep daily locks and the wardrobe current in other tabs of this browser.
if (typeof window !== "undefined") {
  const sync = (event: StorageEvent) => {
    if (event.key === "dealvue-consumer-engagement-preview-v1") void useEngagementStore.persist.rehydrate();
  };
  window.addEventListener("storage", sync);
  import.meta.hot?.dispose(() => window.removeEventListener("storage", sync));
}
