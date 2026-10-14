import type { CSSProperties } from "react";
export const HAIRSTYLES = [
  { id: "bob", name: "코코 단발", cell: 0, mood: "동글동글, 나의 첫 헤어" },
  { id: "waves", name: "밀크 웨이브", cell: 1, mood: "부드럽게 흐르는 물결" },
  { id: "twintails", name: "리본 트윈테일", cell: 2, mood: "두 갈래의 작은 설렘" },
  { id: "braids", name: "소풍 땋은 머리", cell: 3, mood: "사뿐사뿐, 소풍 가는 날" },
  { id: "bun", name: "구름 올림머리", cell: 4, mood: "폭신한 구름 한 송이" },
  { id: "pixie", name: "솜사탕 숏컷", cell: 5, mood: "가볍고 사랑스러운 짧은 머리" },
] as const;
export const HAIR_COLORS = [
  { id: "chestnut", name: "체스넛", color: "#81503a", filter: "none" },
  { id: "espresso", name: "에스프레소", color: "#332735", filter: "saturate(.5) brightness(.57)" },
  { id: "honey", name: "허니 블론드", color: "#cfa465", filter: "sepia(.55) saturate(.8) brightness(1.42)" },
  { id: "rose", name: "로즈 핑크", color: "#bd7d9d", filter: "hue-rotate(306deg) saturate(.65) brightness(1.15)" },
  { id: "lilac", name: "라일락", color: "#a298c9", filter: "hue-rotate(235deg) saturate(.48) brightness(1.3)" },
  { id: "mint", name: "민트 애쉬", color: "#83ada6", filter: "hue-rotate(115deg) saturate(.4) brightness(1.23)" },
] as const;
export const EYE_SHAPES = [{ id: "sparkle", name: "반짝반짝" }, { id: "gentle", name: "순둥순둥" }, { id: "cat", name: "도도한 고양이" }, { id: "round", name: "동그란 호기심" }] as const;
export const EYE_COLORS = [{ id: "brown", name: "초콜릿", color: "#925634" }, { id: "navy", name: "밤하늘", color: "#4d709c" }, { id: "mint", name: "올리브 민트", color: "#5f9b87" }, { id: "violet", name: "포도빛", color: "#9b6bb2" }, { id: "rose", name: "로즈 쿼츠", color: "#c47599" }] as const;
export const MOUTH_SHAPES = [{ id: "smile", name: "작은 미소", mark: "◡" }, { id: "grin", name: "활짝 웃음", mark: "⌣" }, { id: "pout", name: "새침하게", mark: "·" }, { id: "ooh", name: "오, 놀라워", mark: "○" }, { id: "kitty", name: "고양이 미소", mark: "ω" }] as const;
export const FACE_TONES = [{ id: "peach", name: "피치", color: "#f8c9b3", filter: "none" }, { id: "cream", name: "크림", color: "#f6dfc8", filter: "saturate(.72) brightness(1.06)" }, { id: "warm", name: "허니", color: "#eab99b", filter: "saturate(.92) brightness(.95)" }, { id: "rosy", name: "로지", color: "#f2c3bd", filter: "hue-rotate(345deg) saturate(.85)" }] as const;
export type AvatarAppearance = { hairstyle: typeof HAIRSTYLES[number]["id"]; hairColor: typeof HAIR_COLORS[number]["id"]; eyes: typeof EYE_SHAPES[number]["id"]; eyeColor: typeof EYE_COLORS[number]["id"]; mouth: typeof MOUTH_SHAPES[number]["id"]; tone: typeof FACE_TONES[number]["id"] };
export const DEFAULT_APPEARANCE: AvatarAppearance = { hairstyle: "bob", hairColor: "chestnut", eyes: "sparkle", eyeColor: "brown", mouth: "smile", tone: "peach" };
export function normalizeAppearance(value?: Partial<AvatarAppearance> | null): AvatarAppearance {
  const catalogs = { hairstyle: HAIRSTYLES, hairColor: HAIR_COLORS, eyes: EYE_SHAPES, eyeColor: EYE_COLORS, mouth: MOUTH_SHAPES, tone: FACE_TONES };
  return Object.fromEntries(Object.entries(catalogs).map(([key, options]) => [key, options.some(option => option.id === value?.[key as keyof AvatarAppearance]) ? value![key as keyof AvatarAppearance] : DEFAULT_APPEARANCE[key as keyof AvatarAppearance]])) as AvatarAppearance;
}
export function sameAppearance(left: AvatarAppearance, right: AvatarAppearance) { return (Object.keys(DEFAULT_APPEARANCE) as (keyof AvatarAppearance)[]).every(key => left[key] === right[key]); }
export const MOTION_DURATIONS = { hello: 2250, happy: 2200, twirl: 3000, cozy: 3500, pose: 2100 } as const;
/** One hairstyle cut out of its atlas with a transparent margin (scripts/build-hair-cutouts.mjs). */
export const hairCutoutSource = (view: "front" | "side" | "back" | "front-quarter" | "back-quarter", hairstyle: AvatarAppearance["hairstyle"]) => `/images/playground/hair/${view}-${hairstyle}.webp`;
/** Skin regions (x%, y%, rx%, ry%) the hair recolour skips — face, ears, neck — so shadowed skin and eyes never take the hair colour. */
export const FACE_HOLES = {
  front: [[50.4, 40, 24, 8.5], [35.5, 35, 13, 6.8], [65.3, 35, 13, 6.8], [22.5, 38.5, 3.2, 3.8], [79, 37.2, 3.2, 3.8], [50, 49, 8.5, 3.5]],
  side: [[65, 36, 15, 13], [40.5, 37, 6, 6], [54, 49, 7, 2.8]],
  "front-quarter": [[56, 37, 25, 12], [23, 39.5, 4.5, 5.5], [55, 49, 8, 2.8]],
  back: [[50, 49.5, 8, 2.5]],
  "back-quarter": [[73, 35.5, 4.5, 6], [52, 49.5, 8, 2.5]],
} as const;
/** Hair-colour filter that leaves the given skin ellipses (x%, y%, rx%, ry%) untouched. */
export function hairRecolorStyle(key: string, colorFilter: string, holes: readonly (readonly number[])[]): CSSProperties {
  const mask = holes.map(([x, y, rx, ry]) => `radial-gradient(${rx}% ${ry}% at ${x}% ${y}%, transparent 72%, black 100%)`).join(", ");
  return { filter: `url(#${key}) ${colorFilter === "none" ? "" : colorFilter}`.trim(), ...(mask ? { maskImage: mask, maskComposite: "intersect" } : {}) };
}
