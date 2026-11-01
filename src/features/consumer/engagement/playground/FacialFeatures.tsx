import { useId } from "react";
import art from "@/data/avatar-face-v5.json";
import HeadArtwork from "./HeadArtwork";
import { FACE_TONES, type AvatarAppearance } from "./appearance";

const EYES = [[190, 274], [327, 260]];
const EYE_HUES = { brown: 0, navy: 205, mint: 125, violet: 260, rose: 325 };
const MOUTH_INDEX = { smile: 0, grin: 1, pout: 2, ooh: 3, kitty: 4 };
const MOUTH_SIZE = { smile: [37, 18], grin: [31, 21], pout: [22, 15], ooh: [15, 20], kitty: [30, 15] };

export function PaintedMouth({ mouth, x = 258, y = 313 }: { mouth: AvatarAppearance["mouth"]; x?: number; y?: number }) {
  const id = `lips-${useId().replaceAll(":", "")}`;
  const crop = art.mouths.crops[MOUTH_INDEX[mouth]], [width, height] = MOUTH_SIZE[mouth];
  return <svg x={x - width / 2} y={y - height / 2} width={width} height={height} viewBox={crop.join(" ")} overflow="hidden" preserveAspectRatio="xMidYMid meet">
    <defs><clipPath id={id}><rect x={crop[0]} y={crop[1]} width={crop[2]} height={crop[3]} /></clipPath></defs>
    <image href={`${art.mouths.source}?v=5.2`} width={art.mouths.width} height={art.mouths.height} clipPath={`url(#${id})`} />
  </svg>;
}

/** Use the same painted eyes in the editor and on the avatar. */
export function PaintedEyes({ appearance, preview = false }: { appearance: AvatarAppearance; preview?: boolean }) {
  const id = `eyes-${useId().replaceAll(":", "")}`;
  const tone = FACE_TONES.find(item => item.id === appearance.tone)!;
  const drawing = <HeadArtwork appearance={appearance} />;
  const eyeScale = { sparkle: [1, 1], gentle: [1, .88], cat: [1.04, .9], round: [1.04, 1.08] }[appearance.eyes];
  return <g>
    <defs>
      <filter id={`${id}-color`} colorInterpolationFilters="sRGB"><feColorMatrix type="hueRotate" values={String(EYE_HUES[appearance.eyeColor])} /><feColorMatrix type="saturate" values=".72" /></filter>
      <radialGradient id={`${id}-fade`}><stop offset=".84" stopColor="white" /><stop offset="1" stopColor="white" stopOpacity="0" /></radialGradient>
      {EYES.map(([x,y], i) => <clipPath key={i} id={`${id}-iris-${i}`}><ellipse cx={x} cy={y} rx="26" ry="28" /></clipPath>)}
      {EYES.map(([x,y], i) => <mask key={i} id={`${id}-eye-${i}`} maskUnits="userSpaceOnUse" x={x-55} y={y-59} width="110" height="118"><ellipse cx={x} cy={y} rx="55" ry="59" fill={`url(#${id}-fade)`} /></mask>)}
    </defs>
    {(preview || appearance.eyes !== "sparkle" || appearance.eyeColor !== "brown") && EYES.map(([x,y],i) => <g key={i} mask={`url(#${id}-eye-${i})`}>
      <g transform={`translate(${x} ${y}) rotate(${appearance.eyes === "cat" ? i ? 5 : -5 : 0}) scale(${eyeScale.join(" ")}) translate(${-x} ${-y})`}>
        <g style={{ filter: tone.filter }}>{drawing}</g>
        {appearance.eyeColor !== "brown" && <g clipPath={`url(#${id}-iris-${i})`} filter={`url(#${id}-color)`}>{drawing}</g>}
      </g>
    </g>)}
  </g>;
}

export default function FacialFeatures({ appearance }: { appearance: AvatarAppearance }) {
  const id = `features-${useId().replaceAll(":", "")}`;
  const tone = FACE_TONES.find(item => item.id === appearance.tone)!;
  const drawing = <HeadArtwork appearance={appearance} />;
  return <svg className="avatar-face-features painted-face-features" viewBox="0 0 512 768" aria-hidden="true">
    <defs>
      <radialGradient id={`${id}-fade`}><stop offset=".65" stopColor="white" /><stop offset="1" stopColor="white" stopOpacity="0" /></radialGradient>
      <mask id={`${id}-mouth-cover`} maskUnits="userSpaceOnUse" x="228" y="296" width="62" height="36"><ellipse cx="258" cy="314" rx="31" ry="18" fill={`url(#${id}-fade)`} /></mask>
    </defs>
    <PaintedEyes appearance={appearance} />
    {appearance.mouth !== "smile" && <>
      <g mask={`url(#${id}-mouth-cover)`} style={{ filter: tone.filter }}>
        {/* Sample the unpainted chin, not the rosy cheek beside the mouth. */}
        <svg x="227" y="296" width="62" height="36" viewBox="240 332 36 8" preserveAspectRatio="none">{drawing}</svg>
      </g>
      <g transform="rotate(-4 258 313)" style={{ filter: tone.filter }}><PaintedMouth mouth={appearance.mouth} /></g>
    </>}
  </svg>;
}
