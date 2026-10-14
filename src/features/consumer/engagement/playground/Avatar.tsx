import { lazy, Suspense, useId, type CSSProperties } from "react";
import { ATLAS_SOURCES, DEFAULT_ACCESSORIES, LOOKS, type Accessories, type Outfit } from "./data";
import { WornAccessories } from "./Accessories";
import AvatarHead from "./AvatarHead";
import { DEFAULT_APPEARANCE, FACE_HOLES, FACE_TONES, HAIR_COLORS, hairCutoutSource, hairRecolorStyle, type AvatarAppearance } from "./appearance";
import { HairKeyFilter } from "./HairRecolor";
import { turnAtlasSource, turnSkinSource, usesOwnHead, type TurnView } from "./turnViews";

const WardrobeAvatar = lazy(() => import("../avatar3d/WardrobeAvatar"));

function Figure({ outfit, leaving = false, entering = false, view }: { outfit: Outfit; leaving?: boolean; entering?: boolean; view?: TurnView }) {
  const look = LOOKS.find(item => item.id === outfit) ?? LOOKS[0], column = look.cell % 3;
  return <span className={`fashion-figure is-active ${leaving ? "figure-leaving" : entering ? "figure-entering" : ""}`} style={{ backgroundImage: `url(${view ? turnAtlasSource(look.atlas, view) : ATLAS_SOURCES[look.atlas]})`, backgroundSize: look.atlas === "tea" && look.cell < 3 ? "300% 196%" : "300% 200%", backgroundPosition: `${column * 50}% ${look.cell < 3 ? 0 : 100}%`, // Turn-view art is drawn centered in its cell; only the front atlas needs per-column recentering.
    "--figure-offset": view ? "0%" : `${column === 0 ? -7.4 : column === 2 ? 4.1 : -1.8}%` } as CSSProperties} />;
}
export function Avatar({ outfit, accessories = DEFAULT_ACCESSORIES, appearance = DEFAULT_APPEARANCE, threeD = false }: { outfit: Outfit; accessories?: Accessories; appearance?: AvatarAppearance; threeD?: boolean }) {
  const portrait = <PortraitAvatar outfit={outfit} accessories={accessories} appearance={appearance} />;
  return threeD ? <Suspense fallback={portrait}><WardrobeAvatar outfit={outfit} accessories={accessories} appearance={appearance} fallback={portrait} /></Suspense> : portrait;
}
/** Turn-view head built from the skin and hairstyle layers, for hairstyles other than the drawn bob. */
function TurnViewHead({ outfit, appearance, view }: { outfit: Outfit; appearance: AvatarAppearance; view: TurnView }) {
  const color = HAIR_COLORS.find(item => item.id === appearance.hairColor)!, tone = FACE_TONES.find(item => item.id === appearance.tone)!;
  return <span className={`avatar-custom-head turn-view-head turn-view-${view} hair-${appearance.hairstyle}`} aria-hidden="true">
    <span className="turn-view-skin"><img className="avatar-face-skin" src={turnSkinSource(view)} alt="" draggable="false" style={{ filter: tone.filter }} /></span>
    {/* The skin layer has no features; borrow the eyes from the outfit art. */}
    {(view === "side" || view === "front-quarter") && <span className="turn-view-eye" style={{ filter: tone.filter }}><Figure outfit={outfit} view={view} /></span>}
    <span className="turn-view-hair"><span className="avatar-hair-layer" style={{ filter: color.filter }}><img className="hair-art" src={hairCutoutSource(view, appearance.hairstyle)} alt="" draggable="false" /></span></span>
  </span>;
}
/** The outfit art's own drawn bob head, recoloured in place for skin tone and hair colour, like the front portrait. */
function OwnViewHead({ outfit, appearance, view }: { outfit: Outfit; appearance: AvatarAppearance; view: TurnView }) {
  const key = useId().replaceAll(":", ""), color = HAIR_COLORS.find(item => item.id === appearance.hairColor)!, tone = FACE_TONES.find(item => item.id === appearance.tone)!;
  if (color.id === "chestnut" && tone.id === "peach") return null;
  return <>
    <span className="turn-view-head-region" style={{ filter: tone.filter }}><Figure outfit={outfit} view={view} /></span>
    <span className="turn-view-head-region"><span className="turn-view-hair-recolor" style={hairRecolorStyle(key, color.filter, FACE_HOLES[view])}><Figure outfit={outfit} view={view} /></span><HairKeyFilter id={key} /></span>
  </>;
}
function PortraitAvatar({ outfit, accessories, appearance, view }: { outfit: Outfit; accessories: Accessories; appearance: AvatarAppearance; view?: TurnView }) {
  const look = LOOKS.find(item => item.id === outfit) ?? LOOKS[0];
  const originalPortrait = appearance.hairstyle === "bob";
  // Accessories are front-only artwork, so turn views leave them off.
  const ownHead = usesOwnHead(appearance);
  if (view) return <div className={`fashion-avatar avatar-dress-up turn-view-portrait ${ownHead ? "turn-view-own-head" : ""}`} aria-hidden="true">
    <div className="avatar-dressing-turn"><div className="fashion-avatar-body">
      <span className="avatar-static-body body-region"><Figure outfit={look.id} view={view} /></span>
      {ownHead ? <OwnViewHead outfit={look.id} appearance={appearance} view={view} /> : <span className="avatar-static-head"><TurnViewHead outfit={look.id} appearance={appearance} view={view} /></span>}
    </div></div>
  </div>;
  return <div className={`fashion-avatar avatar-dress-up ${originalPortrait ? "has-original-portrait" : ""}`} role="img" aria-label={`나의 아바타 · ${look.name}`}>
    <div className="avatar-dressing-turn">
      <div className="fashion-avatar-body">
        <span className="avatar-static-body body-region"><Figure outfit={look.id} /></span>
        <WornAccessories selection={accessories} part="torso" />
        <span className="avatar-static-head"><AvatarHead appearance={appearance} /><WornAccessories selection={accessories} part="head" hairstyle={appearance.hairstyle} /></span>
        <WornAccessories selection={accessories} part="arm-right" />
      </div>
    </div>
  </div>;
}
export function OutfitThumbnail({ outfit }: { outfit: Outfit }) {
  return <span className="fashion-outfit-thumbnail" aria-hidden="true"><span className="fashion-thumbnail-crop"><Figure outfit={outfit} /></span></span>;
}
