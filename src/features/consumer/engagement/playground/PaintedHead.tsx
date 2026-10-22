import { useId } from "react";
import HeadArtwork from "./HeadArtwork";
import { FACE_HOLES, FACE_TONES, HAIR_COLORS, hairRecolorStyle, type AvatarAppearance } from "./appearance";
import { HairKeyFilter } from "./HairRecolor";
import PaintedAccessory from "./PaintedAccessory";
import type { TurnFace } from "./turnViews";

const FRONT_BOWS = { waves: [[358, 130]], twintails: [[70, 283], [369, 273]], braids: [[74, 306], [367, 296]], bun: [[73, 56], [367, 56]], pixie: [[360, 148]] };

/** Register complete paintings with one uniform scale/rotation. Never reshape the face.
 * The current garment supplies its own neck and collar beneath a soft neck-only join. */
export default function PaintedHead({ appearance, view = "front" }: { appearance: AvatarAppearance; view?: TurnFace }) {
  const id = `painted-head-${useId().replaceAll(":", "")}`;
  if (appearance.hairstyle === "bob") return null;
  const tone = FACE_TONES.find(item => item.id === appearance.tone)!;
  const color = HAIR_COLORS.find(item => item.id === appearance.hairColor)!;
  const neck = view === "side" ? [256, 36] : view === "front-quarter" ? [236, 62] : [224, 66];
  const painting = <HeadArtwork appearance={appearance} view={view} />;
  const art = (suffix: string) => <svg className="original-portrait painted-head-art" viewBox="0 0 512 768" aria-hidden="true" data-painted-head={view}>
    <defs>
      <linearGradient id={`${id}-${suffix}-neck`} x1="0" y1="365" x2="0" y2="394" gradientUnits="userSpaceOnUse"><stop stopColor="white" /><stop offset="1" stopColor="black" /></linearGradient>
      <filter id={`${id}-${suffix}-neck-edge`} x="-.2" y="-.05" width="1.4" height="1.1"><feGaussianBlur stdDeviation="3" /></filter>
      <mask id={`${id}-${suffix}-join`} maskUnits="userSpaceOnUse" x="-128" y="-128" width="768" height="1024"><rect x="-128" y="-128" width="768" height="1024" fill="white" /><rect x={neck[0]} y="365" width={neck[1]} height="403" fill={`url(#${id}-${suffix}-neck)`} filter={`url(#${id}-${suffix}-neck-edge)`} /></mask>
      <filter id={`${id}-${suffix}-alpha`} x="-.03" y="-.03" width="1.06" height="1.06" colorInterpolationFilters="sRGB"><feComponentTransfer><feFuncA type="linear" slope="1.3" intercept="-.3" /></feComponentTransfer></filter>
    </defs>
    <g mask={`url(#${id}-${suffix}-join)`} filter={`url(#${id}-${suffix}-alpha)`}>{painting}</g>
  </svg>;
  const bows = view === "front" ? FRONT_BOWS[appearance.hairstyle]
    : view === "side" ? [[152, appearance.hairstyle === "bun" ? 75 : 260]]
    : view === "back" ? [[91, appearance.hairstyle === "bun" ? 65 : 300], [363, appearance.hairstyle === "bun" ? 65 : 300]]
    : view === "back-quarter" ? [[120, appearance.hairstyle === "bun" ? 70 : 300], [370, appearance.hairstyle === "bun" ? 85 : 305]]
    : FRONT_BOWS[appearance.hairstyle].map(([x, y]) => [x + 16, y]);
  return <>
    <span className="original-portrait" style={{ filter: tone.filter }}>{art("base")}</span>
    {(color.id !== "chestnut" || tone.id !== "peach") && <span className="original-portrait" style={hairRecolorStyle(`${id}-key`, color.filter, FACE_HOLES[view])}>{art("hair")}<HairKeyFilter id={`${id}-key`} /></span>}
    {appearance.hairRibbon === "ribbon" && <svg className="original-portrait" viewBox="0 0 512 768" aria-hidden="true">{bows.map(([x, y], index) => <PaintedAccessory key={index} id="silk-bow" x={x} y={y} width={59} height={46} />)}</svg>}
  </>;
}
