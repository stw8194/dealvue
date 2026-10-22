import { lazy, Suspense, useId, type CSSProperties } from "react";
import { ATLAS_SOURCES, DEFAULT_ACCESSORIES, LOOKS, type Accessories, type Outfit } from "./data";
import { WornAccessories } from "./Accessories";
import AvatarHead from "./AvatarHead";
import { CocoTurnHead } from "./CocoFace";
import { DEFAULT_APPEARANCE, FACE_HOLES, FACE_TONES, HAIR_COLORS, hairRecolorStyle, type AvatarAppearance } from "./appearance";
import { HairKeyFilter } from "./HairRecolor";
import faceArt from "@/data/avatar-face-v5.json";
import { hasPaintedHead } from "./paintedHeadData";
import { turnAtlasSource, usesOwnHead, type TurnFace, type TurnView } from "./turnViews";

const WardrobeAvatar = lazy(() => import("../avatar3d/WardrobeAvatar"));

function Figure({ outfit, leaving = false, entering = false, view }: { outfit: Outfit; leaving?: boolean; entering?: boolean; view?: TurnView }) {
  const look = LOOKS.find(item => item.id === outfit) ?? LOOKS[0], column = look.cell % 3;
  return <span className={`fashion-figure is-active ${leaving ? "figure-leaving" : entering ? "figure-entering" : ""}`} style={{ backgroundImage: `url(${view ? turnAtlasSource(look.atlas, view) : ATLAS_SOURCES[look.atlas]})`, backgroundSize: look.atlas === "tea" && look.cell < 3 ? "300% 196%" : "300% 200%", backgroundPosition: `${column * 50}% ${look.cell < 3 ? 0 : 100}%`, // Turn-view art is drawn centered in its cell; only the front atlas needs per-column recentering.
    "--figure-offset": view ? "0%" : `${column === 0 ? -7.4 : column === 2 ? 4.1 : -1.8}%` } as CSSProperties} />;
}

// Curved inner sleeve boundaries let the hanging hair remain over the torso
// and back, while the original sleeve/hand paint occludes it at the arms.
const ARM_OUTLINES: Record<TurnFace, string> = {
  front: "M0 .49H.42Q.44 .55 .35 .61Q.30 .65 .25 .67Q.22 .69 .18 .70H0Z M.58 .49H1V.70H.82Q.78 .69 .75 .67Q.70 .65 .65 .61Q.56 .55 .58 .49Z",
  "front-quarter": "M0 .49H.46Q.46 .56 .35 .64Q.26 .68 .16 .72H0Z M.66 .49H1V.70H.88Q.80 .68 .75 .63Q.68 .57 .66 .49Z",
  side: "M.45 .47Q.52 .45 .57 .49Q.60 .53 .58 .57L.58 .69Q.60 .75 .53 .75Q.46 .75 .45 .71L.44 .55Q.41 .51 .45 .47Z",
  "back-quarter": "M0 .49H.34Q.34 .57 .25 .63Q.20 .68 .12 .70H0Z M.54 .49H1V.72H.84Q.74 .68 .65 .64Q.54 .56 .54 .49Z",
  back: "M0 .49H.42Q.44 .55 .35 .61Q.30 .65 .25 .67Q.22 .69 .18 .70H0Z M.58 .49H1V.70H.82Q.78 .69 .75 .67Q.70 .65 .65 .61Q.56 .55 .58 .49Z",
};
function ForegroundArms({ outfit, view }: { outfit: Outfit; view?: TurnView }) {
  const id = `avatar-arms-${useId().replaceAll(":", "")}`;
  return <span className="avatar-foreground-arms body-region" data-arm-view={view ?? "front"} style={{ clipPath: `url(#${id})` }} aria-hidden="true">
    <svg className="avatar-layer-defs" aria-hidden="true"><defs><clipPath id={id} clipPathUnits="objectBoundingBox"><path d={ARM_OUTLINES[view ?? "front"]} /></clipPath></defs></svg>
    {view ? <Figure outfit={outfit} view={view} /> : <FrontBody outfit={outfit} />}
  </span>;
}
function FrontBody({ outfit }: { outfit: Outfit }) {
  const id = `garment-${useId().replaceAll(":", "")}`;
  return <span className="avatar-static-body body-region avatar-front-body" style={{ clipPath: `url(#${id})` }}>
    <svg className="avatar-layer-defs" aria-hidden="true"><defs><clipPath id={id} clipPathUnits="objectBoundingBox"><path d={faceArt.bodyContours[outfit]} /></clipPath></defs></svg>
    <Figure outfit={outfit} />
  </span>;
}
export function Avatar({ outfit, accessories = DEFAULT_ACCESSORIES, appearance = DEFAULT_APPEARANCE, threeD = false }: { outfit: Outfit; accessories?: Accessories; appearance?: AvatarAppearance; threeD?: boolean }) {
  const portrait = <PortraitAvatar outfit={outfit} accessories={accessories} appearance={appearance} />;
  return threeD ? <Suspense fallback={portrait}><WardrobeAvatar outfit={outfit} accessories={accessories} appearance={appearance} fallback={portrait} /></Suspense> : portrait;
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
export function PortraitAvatar({ outfit, accessories, appearance, view }: { outfit: Outfit; accessories: Accessories; appearance: AvatarAppearance; view?: TurnView }) {
  const look = LOOKS.find(item => item.id === outfit) ?? LOOKS[0];
  // Accessories are front-only artwork, so turn views leave them off.
  const ownHead = usesOwnHead(appearance);
  const painted = hasPaintedHead(appearance);
  if (view) return <div className={`fashion-avatar avatar-dress-up turn-view-portrait ${ownHead ? "turn-view-own-head" : ""} ${painted ? "has-painted-head" : ""}`} aria-hidden="true">
    <div className="avatar-dressing-turn"><div className="fashion-avatar-body">
      <span className="avatar-static-body body-region" data-body-layer={ownHead ? "original" : "background"}><Figure outfit={look.id} view={view} /></span>
      {ownHead ? <OwnViewHead outfit={look.id} appearance={appearance} view={view} /> : <span className="avatar-static-head"><CocoTurnHead appearance={appearance} view={view} /></span>}
      {!ownHead && <ForegroundArms outfit={look.id} view={view} />}
    </div></div>
  </div>;
  return <div className={`fashion-avatar avatar-dress-up ${ownHead ? "has-original-portrait" : ""} ${painted ? "has-painted-head" : ""}`} role="img" aria-label={`나의 아바타 · ${look.name}`}>
    <div className="avatar-dressing-turn">
      <div className="fashion-avatar-body">
        <FrontBody outfit={look.id} />
        <WornAccessories selection={accessories} part="torso" />
        <span className="avatar-static-head"><AvatarHead appearance={appearance} /></span>
        {!ownHead && <ForegroundArms outfit={look.id} />}
        <WornAccessories selection={accessories} part="head" hairstyle={appearance.hairstyle} />
        <WornAccessories selection={accessories} part="arm-right" />
      </div>
    </div>
  </div>;
}
export function OutfitThumbnail({ outfit }: { outfit: Outfit }) {
  return <span className="fashion-outfit-thumbnail" aria-hidden="true"><span className="fashion-thumbnail-crop"><Figure outfit={outfit} /></span></span>;
}
