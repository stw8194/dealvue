import { useId } from "react";
import faceArt from "@/data/avatar-face-v5.json";
import { DEFAULT_APPEARANCE, FACE_HOLES, FACE_TONES, HAIR_COLORS, hairRecolorStyle, type AvatarAppearance } from "./appearance";
import { HairKeyFilter } from "./HairRecolor";
import PaintedHead from "./PaintedHead";
import FacialFeatures, { PaintedEyes } from "./FacialFeatures";
import { hasPaintedHead } from "./paintedHeadData";

/** The original drawn head. Skin tone and hair colour recolour it in place, so the character never changes shape. */
function OriginalPortrait({ appearance }: { appearance: AvatarAppearance }) {
  const id = useId().replaceAll(":", ""), color = HAIR_COLORS.find(item => item.id === appearance.hairColor)!, tone = FACE_TONES.find(item => item.id === appearance.tone)!;
  // One canonical head keeps the character's identity independent of clothing atlas cells.
  const head = (clip: string) => <svg className="original-portrait" viewBox="0 0 512 768" aria-hidden="true"><defs><mask id={clip} maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="768"><rect width="474" height="768" fill="white" /><path d={faceArt.headGarmentContour} transform="scale(512 768)" fill="black" /></mask></defs><image href="/images/playground/cute-fashion-atlas-v3.png" x="-37.9" width="1536" height="1536" mask={`url(#${clip})`} /></svg>;
  const recolor = color.id !== "chestnut" || tone.id !== "peach";
  return <>
    <span className="original-portrait" style={{ filter: tone.filter }}>{head(`${id}-head`)}</span>
    {/* The toned copy tints the hair too; redraw just the hair from the untoned original, in the chosen colour. */}
    {recolor && <span className="original-portrait" style={hairRecolorStyle(`${id}-key`, color.filter, FACE_HOLES.front)}>{head(`${id}-hair`)}<HairKeyFilter id={`${id}-key`} /></span>}
  </>;
}

export function FaceEyes({ appearance }: { appearance: AvatarAppearance }) {
  return <PaintedEyes appearance={appearance} preview />;
}
export function FaceFeatures({ appearance }: { appearance: AvatarAppearance }) {
  return <FacialFeatures appearance={appearance} />;
}
export default function AvatarHead({ appearance = DEFAULT_APPEARANCE }: { appearance?: AvatarAppearance }) {
  const custom = `${appearance.eyes !== DEFAULT_APPEARANCE.eyes || appearance.eyeColor !== DEFAULT_APPEARANCE.eyeColor ? "custom-eyes" : ""}`;
  if (hasPaintedHead(appearance)) {
    return <span className={`avatar-custom-head hair-${appearance.hairstyle} uses-original-portrait ${custom}`} aria-hidden="true"><PaintedHead appearance={appearance} /><FaceFeatures appearance={appearance} /></span>;
  }
  // The original bob is the drawn character itself; colours, eyes and mouth are changed on it rather than replacing it.
  if (appearance.hairstyle === "bob") {
    return <span className={`avatar-custom-head hair-bob uses-original-portrait ${custom}`} aria-hidden="true"><OriginalPortrait appearance={appearance} /><FaceFeatures appearance={appearance} /></span>;
  }
  return null;
}
