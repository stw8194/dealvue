import { useId } from "react";
import art from "@/data/avatar-face-v5.json";
import HeadArtwork from "./HeadArtwork";
import { FACE_TONES, type AvatarAppearance } from "./appearance";

const EYES = [[190, 274], [327, 260]];
const EYE_HUES = { brown: 0, navy: 205, mint: 125, violet: 260, rose: 325 };
const MOUTH_INDEX = { smile: 0, grin: 1, pout: 2, ooh: 3, kitty: 4 };
const MOUTH_SIZE = { smile: [37, 18], grin: [35, 25], pout: [23, 18], ooh: [18, 25], kitty: [34, 18] };

export function PaintedMouth({ mouth, x = 258, y = 313 }: { mouth: AvatarAppearance["mouth"]; x?: number; y?: number }) {
  const id = `lips-${useId().replaceAll(":", "")}`;
  const crop = art.mouths.crops[MOUTH_INDEX[mouth]], [width, height] = MOUTH_SIZE[mouth];
  return <svg x={x - width / 2} y={y - height / 2} width={width} height={height} viewBox={crop.join(" ")} overflow="hidden" preserveAspectRatio="xMidYMid meet">
    <defs><clipPath id={id}><rect x={crop[0]} y={crop[1]} width={crop[2]} height={crop[3]} /></clipPath></defs>
    <image href={`${art.mouths.source}?v=5.2`} width={art.mouths.width} height={art.mouths.height} clipPath={`url(#${id})`} />
  </svg>;
}

/** Colour only the iris; keep the original eye whites, lashes and highlights in place. */
export default function FacialFeatures({ appearance }: { appearance: AvatarAppearance }) {
  const id = `features-${useId().replaceAll(":", "")}`;
  const tone = FACE_TONES.find(item => item.id === appearance.tone)!;
  const drawing = <HeadArtwork appearance={appearance} />;
  return <svg className="avatar-face-features painted-face-features" viewBox="0 0 512 768" aria-hidden="true">
    <defs>
      <filter id={`${id}-eye-color`} colorInterpolationFilters="sRGB"><feColorMatrix type="hueRotate" values={String(EYE_HUES[appearance.eyeColor])} /><feColorMatrix type="saturate" values=".72" /></filter>
      <radialGradient id={`${id}-fade`}><stop offset=".67" stopColor="white" /><stop offset="1" stopColor="white" stopOpacity="0" /></radialGradient>
      <mask id={`${id}-mouth-cover`} maskUnits="userSpaceOnUse" x="228" y="296" width="62" height="36"><ellipse cx="258" cy="314" rx="31" ry="18" fill={`url(#${id}-fade)`} /></mask>
      {EYES.map(([x,y], i) => <clipPath key={i} id={`${id}-iris-${i}`}><ellipse cx={x} cy={y} rx="26" ry="28" /></clipPath>)}
    </defs>
    {appearance.eyeColor !== "brown" && EYES.map((_,i) => <g key={i} clipPath={`url(#${id}-iris-${i})`} filter={`url(#${id}-eye-color)`}>{drawing}</g>)}
    {/* Soft lid shapes affect the original eye locally, with no skin replacement patches. */}
    {appearance.eyes !== "sparkle" && EYES.map(([x,y],i) => <g key={i} clipPath={`url(#${id}-iris-${i})`} opacity={appearance.eyes === "gentle" ? .14 : .08}><path d={`M${x-28} ${y-26}q28 ${appearance.eyes === "cat" ? -4 : 15} 56 0`} stroke="#6d4236" strokeWidth={appearance.eyes === "gentle" ? 10 : 5} fill="none" /></g>)}
    {appearance.mouth !== "smile" && <>
      {/* Sample adjacent skin from THIS painting: no Coco patch on another face. */}
      <g mask={`url(#${id}-mouth-cover)`} style={{ filter: tone.filter }}><g transform="translate(48 0)">{drawing}</g></g>
      <g transform="rotate(-4 258 313)"><PaintedMouth mouth={appearance.mouth} /></g>
    </>}
  </svg>;
}
