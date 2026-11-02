import { useId } from "react";
import HeadArtwork from "./HeadArtwork";
import { FACE_TONES, type AvatarAppearance } from "./appearance";

const EYES = [[190, 274], [327, 260]];
const EYE_HUES = { brown: 0, navy: 205, mint: 125, violet: 260, rose: 325 };
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

/** Keep the painting's original smile; only eyes are customizable. */
export default function FacialFeatures({ appearance }: { appearance: AvatarAppearance }) {
  return <svg className="avatar-face-features painted-face-features" viewBox="0 0 512 768" aria-hidden="true">
    <PaintedEyes appearance={appearance} />
  </svg>;
}
