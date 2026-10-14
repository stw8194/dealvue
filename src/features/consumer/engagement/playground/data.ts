import type { CSSProperties } from "react";
import type { AvatarAppearance } from "./appearance";
import { ACCESSORIES, type AccessoryId, type AccessorySlot } from "./accessoryCatalog";
export { ACCESSORIES, type AccessoryId, type AccessorySlot } from "./accessoryCatalog";

export const LOOKS = [
  { id: "basic", name: "선데이 니트", mood: "포근한 나의 기본 룩", price: 0, color: "#efd9c6", accent: "#b68b6e", tag: "BASIC", collection: "signature", atlas: "base", cell: 0, category: "hair" },
  { id: "pink", name: "로즈 발레", mood: "분홍빛 리본과 설레는 하루", price: 30, color: "#efb1c6", accent: "#c76488", tag: "ROMANTIC", collection: "signature", atlas: "base", cell: 1, category: "nail" },
  { id: "mint", name: "민트 피크닉", mood: "산뜻한 바람을 입어요", price: 30, color: "#b8d7ca", accent: "#568f7f", tag: "FRESH", collection: "signature", atlas: "base", cell: 2, category: "aesthetic" },
  { id: "lilac", name: "라일락 데이", mood: "꽃처럼 가벼운 원피스", price: 50, color: "#ccbce2", accent: "#8e71b2", tag: "DREAMY", collection: "signature", atlas: "base", cell: 3, category: "nail" },
  { id: "cream", name: "버터 스튜디오", mood: "단정하고 부드러운 순간", price: 60, color: "#f1dca7", accent: "#a5864c", tag: "CLASSIC", collection: "signature", atlas: "base", cell: 4, category: "hair" },
  { id: "midnight", name: "미드나잇 뮤즈", mood: "반짝이는 오늘의 주인공", price: 80, color: "#77728e", accent: "#514563", tag: "SPECIAL", collection: "signature", atlas: "base", cell: 5, category: "makeup" },
  { id: "strawberry", name: "딸기 산책", mood: "새콤달콤한 체크와 작은 딸기", price: 45, color: "#ffb5c8", accent: "#de395e", tag: "SWEET", collection: "daily", atlas: "daily", cell: 0, category: "nail" },
  { id: "sailor", name: "하늘 세일러", mood: "푸른 바람을 담은 세일러 룩", price: 55, color: "#b3dfff", accent: "#5183bd", tag: "BREEZY", collection: "daily", atlas: "daily", cell: 1, category: "hair" },
  { id: "bunny-hoodie", name: "토끼의 휴일", mood: "오늘은 폭신하게 쉬어갈래", price: 50, color: "#ddc4ff", accent: "#9561c8", tag: "COZY", collection: "daily", atlas: "daily", cell: 2, category: "aesthetic" },
  { id: "denim", name: "데이지 데님", mood: "주머니 속에 작은 데이지", price: 60, color: "#a8cef0", accent: "#5985b2", tag: "CASUAL", collection: "daily", atlas: "daily", cell: 3, category: "hair" },
  { id: "peach-tutu", name: "복숭아 발레", mood: "사뿐사뿐, 복숭아빛 발걸음", price: 70, color: "#ffc7d1", accent: "#dc829c", tag: "BALLET", collection: "daily", atlas: "daily", cell: 4, category: "nail" },
  { id: "teddy", name: "코코아 테디", mood: "곰돌이처럼 포근한 오후", price: 65, color: "#d2ab85", accent: "#946648", tag: "WARM", collection: "daily", atlas: "daily", cell: 5, category: "aesthetic" },
  { id: "blossom", name: "벚꽃 편지", mood: "꽃잎을 닮은 봄의 한 페이지", price: 85, color: "#ffb9d4", accent: "#df6a9e", tag: "SPRING", collection: "season", atlas: "season", cell: 0, category: "makeup" },
  { id: "sunflower", name: "햇살 피크닉", mood: "노란 꽃과 함께하는 소풍", price: 75, color: "#ffe695", accent: "#d7a639", tag: "SUNSHINE", collection: "season", atlas: "season", cell: 1, category: "nail" },
  { id: "tropical", name: "시트러스 바캉스", mood: "여름을 담은 상큼한 프릴", price: 80, color: "#ffc2a7", accent: "#e98665", tag: "SUMMER", collection: "season", atlas: "season", cell: 2, category: "aesthetic" },
  { id: "maple", name: "단풍 다이어리", mood: "낙엽처럼 따뜻한 체크 케이프", price: 85, color: "#e6b187", accent: "#a46643", tag: "AUTUMN", collection: "season", atlas: "season", cell: 3, category: "hair" },
  { id: "snow", name: "첫눈의 약속", mood: "눈송이가 내려앉은 겨울 룩", price: 95, color: "#d3eafd", accent: "#8cb6d7", tag: "WINTER", collection: "season", atlas: "season", cell: 4, category: "aesthetic" },
  { id: "holiday", name: "홀리데이 리본", mood: "나에게 선물하는 작은 축제", price: 100, color: "#eb8095", accent: "#a33050", tag: "HOLIDAY", collection: "season", atlas: "season", cell: 5, category: "makeup" },
  { id: "fairy", name: "별빛 요정", mood: "작은 마법을 입는 날", price: 110, color: "#dfc3ff", accent: "#a171d1", tag: "FAIRY", collection: "dream", atlas: "dream", cell: 0, category: "makeup" },
  { id: "moon", name: "달의 산책", mood: "초승달 아래 반짝이는 밤", price: 120, color: "#a7a0d6", accent: "#53508a", tag: "MOONLIGHT", collection: "dream", atlas: "dream", cell: 1, category: "nail" },
  { id: "princess", name: "샴페인 프린세스", mood: "오늘만큼은 내가 주인공", price: 135, color: "#f9d7b4", accent: "#ce9a69", tag: "PRINCESS", collection: "dream", atlas: "dream", cell: 2, category: "makeup" },
  { id: "patisserie", name: "마카롱 파티시에", mood: "달콤한 취향을 한 스푼", price: 100, color: "#bce5d7", accent: "#7cad9d", tag: "PATISSERIE", collection: "dream", atlas: "dream", cell: 3, category: "nail" },
  { id: "mermaid", name: "진주빛 바다", mood: "물결마다 반짝이는 작은 진주", price: 125, color: "#b4e7ee", accent: "#78b7c8", tag: "OCEAN", collection: "dream", atlas: "dream", cell: 4, category: "aesthetic" },
  { id: "rockstar", name: "핑크 록스타", mood: "내 리듬으로 반짝여", price: 115, color: "#f59acb", accent: "#4c3756", tag: "ROCKSTAR", collection: "dream", atlas: "dream", cell: 5, category: "hair" },
  { id: "rose-tea", name: "로즈 티타임", mood: "장미 자수와 레이스의 오후", price: 100, color: "#eab1bf", accent: "#9b6a99", tag: "TEA PARTY", collection: "tea", atlas: "tea", cell: 0, category: "makeup" },
  { id: "alice", name: "앨리스의 초대", mood: "하늘빛 앞치마와 작은 티파티", price: 105, color: "#b4daf0", accent: "#9b6a99", tag: "TEA PARTY", collection: "tea", atlas: "tea", cell: 1, category: "hair" },
  { id: "raspberry", name: "라즈베리 벨벳", mood: "보드라운 벨벳과 크림 블라우스", price: 110, color: "#d793b4", accent: "#9b6a99", tag: "TEA PARTY", collection: "tea", atlas: "tea", cell: 2, category: "makeup" },
  { id: "pistachio", name: "피스타치오 살롱", mood: "진주 단추가 빛나는 작은 트위드", price: 115, color: "#b7d3b1", accent: "#9b6a99", tag: "TEA PARTY", collection: "tea", atlas: "tea", cell: 3, category: "hair" },
  { id: "cafe", name: "카라멜 카페", mood: "체크 앞치마에 담은 달콤한 하루", price: 95, color: "#d8b692", accent: "#9b6a99", tag: "TEA PARTY", collection: "tea", atlas: "tea", cell: 4, category: "makeup" },
  { id: "violet-tea", name: "바이올렛 가든", mood: "꽃무늬 주름 사이로 번지는 오후", price: 110, color: "#c9b3e3", accent: "#9b6a99", tag: "TEA PARTY", collection: "tea", atlas: "tea", cell: 5, category: "hair" },
  { id: "stargazer", name: "별을 읽는 소녀", mood: "금빛 별자수가 길을 밝혀줘요", price: 125, color: "#8284b9", accent: "#9b6a99", tag: "ADVENTURE", collection: "adventure", atlas: "adventure", cell: 0, category: "makeup" },
  { id: "raincoat", name: "레몬 레인코트", mood: "비 오는 날도 나만의 햇살", price: 90, color: "#f1d274", accent: "#9b6a99", tag: "ADVENTURE", collection: "adventure", atlas: "adventure", cell: 1, category: "hair" },
  { id: "hanbok", name: "꽃길 한복", mood: "분홍 꽃잎처럼 사뿐한 발걸음", price: 130, color: "#efa5c1", accent: "#9b6a99", tag: "ADVENTURE", collection: "adventure", atlas: "adventure", cell: 2, category: "makeup" },
  { id: "varsity", name: "라벤더 캠퍼스", mood: "별 패치와 함께하는 첫 등교", price: 95, color: "#bea5de", accent: "#9b6a99", tag: "ADVENTURE", collection: "adventure", atlas: "adventure", cell: 3, category: "hair" },
  { id: "explorer", name: "코랄 탐험가", mood: "작은 모험을 담은 멜빵 바지", price: 100, color: "#eab19c", accent: "#9b6a99", tag: "ADVENTURE", collection: "adventure", atlas: "adventure", cell: 4, category: "makeup" },
  { id: "picnic-cape", name: "딸기 숲 소풍", mood: "빨간 케이프와 포근한 니트", price: 105, color: "#e997a1", accent: "#9b6a99", tag: "ADVENTURE", collection: "adventure", atlas: "adventure", cell: 5, category: "hair" },
] as const;
export type Outfit = (typeof LOOKS)[number]["id"];
export const COLLECTIONS = [
  { id: "signature", label: "시그니처", description: "나의 첫 번째 옷장", mark: "✦" },
  { id: "daily", label: "데일리", description: "매일 입고 싶은 작은 취향", mark: "♡" },
  { id: "season", label: "사계절", description: "계절마다 새로운 나", mark: "❀" },
  { id: "dream", label: "드림", description: "상상 속의 작은 주인공", mark: "☾" },
  { id: "tea", label: "티파티", description: "오후의 작은 초대장", mark: "♧" },
  { id: "adventure", label: "작은 모험", description: "내일은 어떤 주인공?", mark: "☆" },
] as const;
export const ATLAS_SOURCES = { base: "/images/playground/cute-fashion-atlas-v3.png", daily: "/images/playground/collection-daily.png", season: "/images/playground/collection-season.png", dream: "/images/playground/collection-dream.png", tea: "/images/playground/collection-tea.png", adventure: "/images/playground/collection-adventure.png" } as const;
export type Accessories = Record<AccessorySlot, AccessoryId>;
export const DEFAULT_ACCESSORIES: Accessories = { hair: "hair-none", ears: "ears-none", bag: "bag-none", necklace: "necklace-none" };
export const BACKDROPS = [
  { id: "lavender", name: "라벤더 스튜디오", price: 0, colors: ["#dec2ff", "#ffdfed"], icon: "✦" },
  { id: "peach", name: "복숭아 구름", price: 20, colors: ["#ffcfb5", "#ffddea"], icon: "☁" },
  { id: "cherry", name: "벚꽃 정원", price: 45, colors: ["#ffd4e5", "#f5d6ff"], icon: "❀" },
  { id: "garden", name: "민트 피크닉", price: 40, colors: ["#bde9d4", "#e9efc3"], icon: "❧" },
  { id: "starlight", name: "별빛 다락방", price: 60, colors: ["#7a69b8", "#c9a0db"], icon: "☾" },
  { id: "snowfall", name: "눈송이 오르골", price: 50, colors: ["#bcdcf8", "#e6d8f8"], icon: "❄" },
  { id: "sunset", name: "노을 테라스", price: 35, colors: ["#f4b586", "#d7b1e8"], icon: "☀" },
  { id: "atelier", name: "크림 아틀리에", price: 30, colors: ["#e5d8c4", "#fff1d8"], icon: "♡" },
  { id: "rose-arch", name: "장미 아치", price: 55, colors: ["#edb4c8", "#e6d3e8"], icon: "❀" },
  { id: "wisteria", name: "등나무 산책길", price: 55, colors: ["#c5b6e9", "#f3e1f1"], icon: "❧" },
  { id: "lily-pond", name: "수련 연못", price: 60, colors: ["#b7ded7", "#dce7bd"], icon: "◌" },
  { id: "moon-garden", name: "달빛 정원", price: 70, colors: ["#807bad", "#b6b7dc"], icon: "☾" },
  { id: "seaside", name: "조개빛 해변", price: 50, colors: ["#acdfe7", "#f9dbba"], icon: "≈" },
  { id: "aquarium", name: "진주 수족관", price: 65, colors: ["#9dc5dd", "#ccb9e3"], icon: "♧" },
  { id: "tea-room", name: "로즈 티룸", price: 55, colors: ["#eed3ba", "#edc6da"], icon: "♧" },
  { id: "patisserie-room", name: "마카롱 카페", price: 55, colors: ["#d4e6c7", "#f4d2df"], icon: "♡" },
  { id: "library", name: "별빛 도서관", price: 65, colors: ["#c7b3da", "#edd4c1"], icon: "✦" },
  { id: "music-room", name: "오르골 살롱", price: 60, colors: ["#ddc3ef", "#f3d9cf"], icon: "♫" },
  { id: "rainy-window", name: "비 오는 창가", price: 50, colors: ["#b7cada", "#dedcf0"], icon: "☂" },
  { id: "lantern", name: "꽃등 축제", price: 70, colors: ["#b4a5d3", "#edb4c8"], icon: "❋" },
] as const;
export type BackdropId = (typeof BACKDROPS)[number]["id"];
export function backdropStyle(id: BackdropId): CSSProperties {
  const item = BACKDROPS.find(item => item.id === id) ?? BACKDROPS[0];
  return { "--scene-start": item.colors[0], "--scene-end": item.colors[1] } as CSSProperties;
}
export const AVATAR_MOTIONS = [{ id: "hello", label: "손 흔들기", symbol: "♡" }, { id: "happy", label: "신나는 폴짝", symbol: "✦" }, { id: "twirl", label: "리듬 댄스", symbol: "♪" }, { id: "cozy", label: "꾸벅 졸기", symbol: "☾" }, { id: "pose", label: "찰칵 윙크", symbol: "✧" }] as const;
export type AvatarMotion = (typeof AVATAR_MOTIONS)[number]["id"];
export const AVATAR_POSES = [{ id: "natural", label: "기본", symbol: "♡" }, { id: "sweet", label: "수줍게", symbol: "❀" }, { id: "model", label: "런웨이", symbol: "✧" }, { id: "curtsy", label: "공주 인사", symbol: "♔" }] as const;
export type AvatarPose = (typeof AVATAR_POSES)[number]["id"];
export const TOTAL_COLLECTIBLES = LOOKS.length + ACCESSORIES.filter(item => item.price > 0).length + BACKDROPS.length;
export type SavedLook = { id: string; name: string; outfit: Outfit; accessories: Accessories; backdrop: BackdropId; appearance?: AvatarAppearance; createdAt: string };
export const ROULETTE_REWARDS = [5, 20, 10, 50, 5, 30, 10, 100] as const;
export type RoulettePlay = { id: string; day: string; index: number; amount: number; settled: boolean };
export const FORTUNES = [
  { title: "작은 변화가 빛나는 하루", body: "평소 눈여겨본 스타일에 한 걸음 다가가 보세요. 작은 변화가 생각보다 큰 기분 전환을 만들어 줄 거예요.", category: "hair", label: "헤어", color: "라벤더", keyword: "새로운 시작", score: 92 },
  { title: "나를 다정하게 돌보는 시간", body: "오늘은 서두르지 않아도 괜찮아요. 따뜻한 차 한 잔, 편안한 관리로 나에게 여유를 선물해 보세요.", category: "aesthetic", label: "피부관리", color: "민트", keyword: "편안한 여유", score: 88 },
  { title: "손끝에서 행운이 피어나요", body: "마음에 드는 색을 골라 보세요. 작은 디테일에 담은 취향이 하루를 특별하게 만들어 줄 거예요.", category: "nail", label: "네일", color: "코랄", keyword: "작은 설렘", score: 96 },
  { title: "오늘의 주인공은 바로 나", body: "조금 더 나다운 모습을 즐겨 보세요. 특별한 약속이 없어도 오늘 충분히 예쁠 이유가 있으니까요.", category: "makeup", label: "메이크업", color: "피치", keyword: "나만의 자신감", score: 94 },
  { title: "뜻밖의 설렘이 기다려요", body: "익숙한 동네에서 새로운 취향을 발견할 수 있어요. 마음이 가는 작은 선택을 믿어 보세요.", category: "eyelash", label: "속눈썹", color: "스카이 블루", keyword: "기분 좋은 발견", score: 90 },
] as const;
export function fortuneForDay(day: string) {
  const seed = [...day].reduce((total, value) => (total * 31 + value.charCodeAt(0)) >>> 0, 0);
  return FORTUNES[seed % FORTUNES.length];
}
