import { useId } from "react";
import faceArt from "@/data/avatar-face-v5.json";
import { DEFAULT_APPEARANCE, EYE_COLORS, FACE_HOLES, FACE_TONES, HAIR_COLORS, hairRecolorStyle, type AvatarAppearance } from "./appearance";
import { HairKeyFilter } from "./HairRecolor";
import PaintedHead from "./PaintedHead";
import FacialFeatures, { PaintedMouth } from "./FacialFeatures";
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

function SkinPatch({ x, y, rx, ry }: { x: number; y: number; rx: number; ry: number }) {
  const id = useId().replaceAll(":", "");
  return <g><defs><radialGradient id={`${id}-fade`}><stop offset=".45" stopColor="white" /><stop offset="1" stopColor="white" stopOpacity="0" /></radialGradient><mask id={`${id}-patch`} maskUnits="userSpaceOnUse" x={x - rx} y={y - ry} width={rx * 2} height={ry * 2}><ellipse cx={x} cy={y} rx={rx} ry={ry} fill={`url(#${id}-fade)`} /></mask></defs><g mask={`url(#${id}-patch)`}>{rx <= 32
    ? <image href="/images/playground/cute-fashion-atlas-v3.png" x={-37.9 - 52} width="1536" height="1536" />
    : <svg x={x - rx} y={y - ry} width={rx * 2} height={ry * 2} viewBox="258 226 20 22" preserveAspectRatio="none"><image href="/images/playground/cute-fashion-atlas-v3.png" x="-37.9" width="1536" height="1536" /></svg>}
  </g></g>;
}

export function FaceEyes({ appearance }: { appearance: AvatarAppearance }) {
  const id = useId().replaceAll(":", ""), color = EYE_COLORS.find(item => item.id === appearance.eyeColor)!;
  const shape = appearance.eyes;
  return <g className={`face-eyes eyes-${shape}`}>
    <defs><radialGradient id={`${id}-eye-fade`}><stop offset=".78" stopColor="white" /><stop offset="1" stopColor="white" stopOpacity="0" /></radialGradient><mask id={`${id}-eye`} maskUnits="userSpaceOnUse" x="-56" y="-58" width="112" height="116"><ellipse rx="56" ry="58" fill={`url(#${id}-eye-fade)`} /></mask><clipPath id={`${id}-iris`}><ellipse cy="1" rx="24" ry="28" /></clipPath></defs>
    {[186, 330].map((x, index) => <g key={x} className={`face-eye eye-${index ? "right" : "left"}`} style={{ transformOrigin: `${x}px 271px` }}>
      <path d={`M${x - 22} 220q20-${shape === "gentle" ? 3 : 9} 42 0`} fill="none" stroke="#865c4c" strokeOpacity=".65" strokeWidth="3.4" strokeLinecap="round" />
      <g className="eye-open" style={{ transformOrigin: `${x}px 271px` }}><g transform={`translate(${x} 271) scale(${shape === "round" ? "1.04 1.04" : shape === "gentle" ? "1 .9" : shape === "cat" ? "1.05 .85" : "1 1"}) rotate(${shape === "cat" ? index ? 7 : -7 : 0})`}>
        <g mask={`url(#${id}-eye)`}><image href="/images/playground/cute-fashion-atlas-v3.png" x={-37.9 - x} y="-271" width="1536" height="1536" /></g>
        {color.id !== "brown" && <g clipPath={`url(#${id}-iris)`}><image href="/images/playground/cute-fashion-atlas-v3.png" x={-37.9 - x} y="-271" width="1536" height="1536" style={{ filter: ({ navy: "hue-rotate(175deg) saturate(.7)", mint: "hue-rotate(100deg) saturate(.6)", violet: "hue-rotate(225deg) saturate(.65)", rose: "hue-rotate(300deg) saturate(.7)", brown: "none" })[color.id] }} /></g>}
      </g></g>
      <g className="eye-closed"><SkinPatch x={x} y={264} rx={67} ry={70} /><g className="closed-lid"><path d={`M${x - 29} 276q29 21 58 0`} fill="none" stroke="#6f4136" strokeWidth="3.5" strokeLinecap="round" /><path d={index ? `M${x + 22} 280l9 4m-15-1 4 7` : `M${x - 22} 280l-9 4m15-1-4 7`} fill="none" stroke="#6f4136" strokeWidth="2.6" strokeLinecap="round" /></g></g>
    </g>)}
  </g>;
}
export function FaceMouth({ mouth }: { mouth: AvatarAppearance["mouth"] }) {
  return <PaintedMouth mouth={mouth} x={256} y={326} />;
}
export function FaceFeatures({ appearance }: { appearance: AvatarAppearance }) {
  return <FacialFeatures appearance={appearance} />;
}
export default function AvatarHead({ appearance = DEFAULT_APPEARANCE }: { appearance?: AvatarAppearance }) {
  const custom = `${appearance.eyes !== DEFAULT_APPEARANCE.eyes || appearance.eyeColor !== DEFAULT_APPEARANCE.eyeColor ? "custom-eyes" : ""} ${appearance.mouth !== DEFAULT_APPEARANCE.mouth ? "custom-mouth" : ""}`;
  if (hasPaintedHead(appearance)) {
    return <span className={`avatar-custom-head hair-${appearance.hairstyle} uses-original-portrait ${custom}`} aria-hidden="true"><PaintedHead appearance={appearance} /><FaceFeatures appearance={appearance} /></span>;
  }
  // The original bob is the drawn character itself; colours, eyes and mouth are changed on it rather than replacing it.
  if (appearance.hairstyle === "bob") {
    return <span className={`avatar-custom-head hair-bob uses-original-portrait ${custom}`} aria-hidden="true"><OriginalPortrait appearance={appearance} /><FaceFeatures appearance={appearance} /></span>;
  }
  return null;
}
