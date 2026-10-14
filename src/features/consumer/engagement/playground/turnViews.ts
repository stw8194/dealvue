import { ATLAS_SOURCES, LOOKS, type Accessories, type Outfit } from "./data";
import { hairCutoutSource, type AvatarAppearance } from "./appearance";

/**
 * Drawn turn views for the dress-room spin. Images live in /images/playground/views/ and are listed in its
 * manifest.json; outfits without them keep the synthesized 3D turn. See docs/avatar-turn-views.md.
 * "quarter" views are the optional 45° diagonals (front-right and back-right); left-side views are mirrors.
 */
export type TurnView = "back" | "side" | "front-quarter" | "back-quarter";
export type TurnFace = "front" | TurnView;
export type AtlasKey = keyof typeof ATLAS_SOURCES;
export type TurnManifest = { head?: boolean; atlases?: AtlasKey[]; quarterHead?: boolean; quarterAtlases?: AtlasKey[] };
type Style = { outfit: Outfit; accessories: Accessories; appearance: AvatarAppearance };

const root = "/images/playground/views";
let manifest: Promise<TurnManifest> | null = null;
export function loadTurnViews() {
  manifest ??= fetch(`${root}/manifest.json`).then(response => response.ok ? response.json() as Promise<TurnManifest> : {}).catch(() => ({}));
  return manifest;
}
const atlasOf = (outfit: Outfit) => (LOOKS.find(item => item.id === outfit) ?? LOOKS[0]).atlas;
/** The outfit art already draws the original bob and face from every side; tone and hair colour recolour it in place. */
export const usesOwnHead = (appearance: AvatarAppearance) => appearance.hairstyle === "bob";
export function hasTurnViews(views: TurnManifest, outfit: Outfit) { return !!views.head && !!views.atlases?.includes(atlasOf(outfit)); }
export function hasQuarterViews(views: TurnManifest, style: Style) {
  return hasTurnViews(views, style.outfit) && !!views.quarterAtlases?.includes(atlasOf(style.outfit)) && (!!views.quarterHead || usesOwnHead(style.appearance));
}

/** Faces around one turn, starting at the front and turning so the camera first sees the right side. [face, mirrored] */
export function turnFaces(quarters: boolean): [TurnFace, boolean][] {
  return quarters
    ? [["front", false], ["front-quarter", false], ["side", false], ["back-quarter", false], ["back", false], ["back-quarter", true], ["side", true], ["front-quarter", true]]
    : [["front", false], ["side", false], ["back", false], ["side", true]];
}

const file = (path: string) => path.slice(path.lastIndexOf("/") + 1, -".png".length);
export const turnAtlasSource = (atlas: AtlasKey, view: TurnView) => `${root}/${file(ATLAS_SOURCES[atlas])}-${view}.webp`;
export const turnSkinSource = (view: TurnView) => `${root}/avatar-face-base-${view}.webp`;

/** Every image a style's turn faces draw, so they can be decoded before the spin starts. */
export function turnImageSources(style: Style, faces: TurnFace[]) {
  const atlas = atlasOf(style.outfit), urls = new Set<string>([ATLAS_SOURCES[atlas]]);
  for (const face of faces) {
    if (face === "front") continue;
    urls.add(turnAtlasSource(atlas, face));
    if (!usesOwnHead(style.appearance)) { urls.add(turnSkinSource(face)); urls.add(hairCutoutSource(face, style.appearance.hairstyle)); }
  }
  return [...urls];
}
