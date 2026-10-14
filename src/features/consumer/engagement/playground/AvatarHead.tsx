import { useId } from "react";
import { DEFAULT_APPEARANCE, EYE_COLORS, FACE_HOLES, FACE_TONES, HAIR_COLORS, hairCutoutSource, hairRecolorStyle, type AvatarAppearance } from "./appearance";
import { HairKeyFilter } from "./HairRecolor";

/** The original drawn head. Skin tone and hair colour recolour it in place, so the character never changes shape. */
function OriginalPortrait({ appearance }: { appearance: AvatarAppearance }) {
  const id = useId().replaceAll(":", ""), color = HAIR_COLORS.find(item => item.id === appearance.hairColor)!, tone = FACE_TONES.find(item => item.id === appearance.tone)!;
  // One canonical head keeps the character's identity independent of clothing atlas cells.
  const head = (clip: string) => <svg className="original-portrait" viewBox="0 0 512 768" aria-hidden="true"><defs><clipPath id={clip}><path d="M0 0H493V384H328V362H286V390H227V362H184V384H0Z" /></clipPath></defs><image href="/images/playground/cute-fashion-atlas-v3.png" x="-37.9" width="1536" height="1536" clipPath={`url(#${clip})`} /></svg>;
  const recolor = color.id !== "chestnut" || tone.id !== "peach";
  return <>
    <span className="original-portrait" style={{ filter: tone.filter }}>{head(`${id}-head`)}</span>
    {/* The toned copy tints the hair too; redraw just the hair from the untoned original, in the chosen colour. */}
    {recolor && <span className="original-portrait" style={hairRecolorStyle(`${id}-key`, color.filter, FACE_HOLES.front)}>{head(`${id}-hair`)}<HairKeyFilter id={`${id}-key`} /></span>}
  </>;
}

function SkinPatch({ x, y, rx, ry }: { x: number; y: number; rx: number; ry: number }) {
  const id = useId().replaceAll(":", "");
  return <g><defs><radialGradient id={`${id}-fade`}><stop offset=".72" stopColor="white" /><stop offset="1" stopColor="white" stopOpacity="0" /></radialGradient><mask id={`${id}-patch`} maskUnits="userSpaceOnUse" x={x - rx} y={y - ry} width={rx * 2} height={ry * 2}><ellipse cx={x} cy={y} rx={rx} ry={ry} fill={`url(#${id}-fade)`} /></mask></defs><image href="/images/playground/avatar-face-base.png" x="97.28" y="76.032" width="317.44" height="337.92" mask={`url(#${id}-patch)`} /></g>;
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
  if (mouth === "grin") return <g><path d="M237 319q19 11 38 0-2 24-19 24t-19-24z" fill="#924b55" stroke="#c88584" strokeWidth="1" /><path d="M242 323q14 6 28 0v5q-14 5-28 0z" fill="#fff7ee" /><ellipse cx="257" cy="337" rx="9" ry="4" fill="#eea1a8" /></g>;
  if (mouth === "pout") return <g><ellipse cx="256" cy="325" rx="6" ry="4" fill="#d78b8d" /><path d="M251 325h10" stroke="#a56570" strokeWidth="1.4" strokeLinecap="round" /></g>;
  if (mouth === "ooh") return <g><ellipse cx="256" cy="327" rx="7" ry="9" fill="#a56167" stroke="#db9b98" strokeWidth="1.2" /><ellipse cx="254" cy="324" rx="2" ry="3" fill="#733e4a" /><path d="M253 333h5" stroke="#ecafb0" strokeWidth="2" strokeLinecap="round" /></g>;
  if (mouth === "kitty") return <path d="M241 322q2 10 10 7 5-2 5-7 0 5 5 7 8 3 10-7" fill="none" stroke="#ba747c" strokeWidth="2.6" strokeLinecap="round" />;
  return <g><path d="M243 320q13 9 26 0" fill="none" stroke="#bd7379" strokeWidth="2.5" strokeLinecap="round" /><path d="M250 328q6 3 12 0" stroke="#e7a2a0" strokeWidth="2" strokeLinecap="round" fill="none" /></g>;
}
export function FaceFeatures({ appearance }: { appearance: AvatarAppearance }) {
  const tone = FACE_TONES.find(item => item.id === appearance.tone)!;
  // Toned like the face, so eye and mouth patches never show the default skin.
  return <svg className="avatar-face-features" viewBox="0 0 512 768" aria-hidden="true" style={{ filter: tone.filter }}>
    <g className="eye-cover">{[186, 330].map(x => <SkinPatch key={x} x={x} y={264} rx={67} ry={70} />)}</g><FaceEyes appearance={appearance} />
    <g className="mouth-cover"><SkinPatch x={256} y={321} rx={32} ry={22} /></g><g className="mouth-chosen"><FaceMouth mouth={appearance.mouth} /></g><g className="mouth-happy"><SkinPatch x={256} y={321} rx={32} ry={22} /><FaceMouth mouth="grin" /></g><g className="mouth-sleepy"><SkinPatch x={256} y={321} rx={32} ry={22} /><FaceMouth mouth="ooh" /></g><g className="mouth-camera"><SkinPatch x={256} y={321} rx={32} ry={22} /><FaceMouth mouth="kitty" /></g>
  </svg>;
}
export default function AvatarHead({ appearance = DEFAULT_APPEARANCE }: { appearance?: AvatarAppearance }) {
  const color = HAIR_COLORS.find(item => item.id === appearance.hairColor)!, tone = FACE_TONES.find(item => item.id === appearance.tone)!;
  // The original bob is the drawn character itself; colours, eyes and mouth are changed on it rather than replacing it.
  if (appearance.hairstyle === "bob") {
    const custom = `${appearance.eyes !== DEFAULT_APPEARANCE.eyes || appearance.eyeColor !== DEFAULT_APPEARANCE.eyeColor ? "custom-eyes" : ""} ${appearance.mouth !== DEFAULT_APPEARANCE.mouth ? "custom-mouth" : ""}`;
    return <span className={`avatar-custom-head hair-bob uses-original-portrait ${custom}`} aria-hidden="true"><OriginalPortrait appearance={appearance} /><FaceFeatures appearance={appearance} /></span>;
  }
  const hair = <img className="hair-art" src={hairCutoutSource("front", appearance.hairstyle)} alt="" draggable="false" />;
  return <span className={`avatar-custom-head hair-${appearance.hairstyle}`} aria-hidden="true"><span className="hair-follow hair-behind"><span className="avatar-hair-layer hair-back" style={{ filter: color.filter }}>{hair}</span></span><img className="avatar-face-skin" src="/images/playground/avatar-face-base.png" alt="" draggable="false" style={{ filter: tone.filter }} /><FaceFeatures appearance={appearance} /><span className="hair-follow hair-ahead"><span className="avatar-hair-layer hair-front" style={{ filter: color.filter }}>{hair}</span></span></span>;
}
