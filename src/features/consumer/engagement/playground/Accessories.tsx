import { useId, type CSSProperties } from "react";
import { ACCESSORIES, type Accessories as Selection, type AccessoryId } from "./data";
import { AccessoryShape, JewelShape } from "./AccessoryShapes";
import type { AvatarAppearance } from "./appearance";

function PaintedPiece({ id, jewel = false }: { id: AccessoryId; jewel?: boolean }) {
  const item = ACCESSORIES.find(item => item.id === id)!;
  const gradient = useId().replaceAll(":", "");
  if (item.design === "none") return <><circle cx="40" cy="40" r="22" fill="none" stroke="#cbc5d8" strokeWidth="2" /><path d="m25 55 30-30" stroke="#cbc5d8" strokeWidth="2" /></>;
  return <g style={{ "--item-color": item.color, "--item-shade": `color-mix(in srgb, ${item.color}, #50344e 30%)`, "--item-light": `color-mix(in srgb, ${item.color}, #fff8ed 65%)`, "--metal": item.accent, "--enamel": `url(#${gradient})` } as CSSProperties}>
    <defs><linearGradient id={gradient} x1="0" y1="0" x2=".8" y2="1"><stop stopColor="var(--item-light)" /><stop offset=".36" stopColor="var(--item-color)" /><stop offset="1" stopColor="var(--item-shade)" /></linearGradient></defs>
    {jewel ? <JewelShape design={item.design} /> : <AccessoryShape design={item.design} />}
  </g>;
}
export function AccessoryThumbnail({ id }: { id: AccessoryId }) { return <svg viewBox="0 0 80 80" className="accessory-thumbnail" aria-hidden="true"><PaintedPiece id={id} /></svg>; }
export function WornAccessories({ selection, part, hairstyle = "bob" }: { selection: Selection; part: "head" | "torso" | "arm-right"; hairstyle?: AvatarAppearance["hairstyle"] }) {
  const hair = ACCESSORIES.find(item => item.id === selection.hair)!, necklace = ACCESSORIES.find(item => item.id === selection.necklace)!;
  const hairTransform = ["silk-bow", "mint-bow", "daisy-clip", "butterfly-clip", "star-clip"].includes(hair.design) ? "translate(338 44) rotate(16) scale(1.1)" : hair.design === "rose-beret" ? "translate(124 -45) rotate(-8 40 40) scale(3.6 1.8)" : hair.design === "sunhat" ? "translate(102 -55) scale(3.9 1.8)" : hair.design === "crystal-tiara" || hair.design === "mini-crown" ? "translate(166 0) scale(2.25 1.2)" : "translate(160 -36) scale(2.4 1.3)";
  return <svg className={`fashion-accessories accessories-${part}`} viewBox="0 0 512 768" aria-hidden="true">
    {part === "head" && <>{hair.design !== "none" && <g transform={hairstyle === "bun" && ["silk-bow", "mint-bow", "daisy-clip", "butterfly-clip", "star-clip"].includes(hair.design) ? "translate(304 80) rotate(12) scale(1.1)" : hairTransform}><PaintedPiece id={selection.hair} /></g>}{selection.ears !== "ears-none" && [132, 379].map(x => <g key={x}><circle cx={x} cy="285" r="3.2" fill="#edc579" /><path d={`M${x} 288v17`} stroke="#d7ae5a" strokeWidth="2" /><g className="earring-pendant" style={{ transformOrigin: `${x}px 300px` }}><g transform={`translate(${x} 311)`}><PaintedPiece id={selection.ears} jewel /></g></g></g>)}</>}
    {part === "arm-right" && selection.bag !== "bag-none" && <g className="worn-bag-swing"><g transform="translate(365 489) scale(1.1)"><PaintedPiece id={selection.bag} /></g></g>}
    {part === "torso" && necklace.design !== "none" && <g><path d="M224 377q32 40 64 0" fill="none" stroke={necklace.design === "ribbon-choker" ? necklace.color : necklace.accent} strokeWidth={necklace.design === "ribbon-choker" ? 5 : 2.2} />{necklace.design === "pearl-necklace" || necklace.design === "pearl-choker" ? [0, ...(necklace.design === "pearl-choker" ? [7] : [])].map(offset => <g key={offset}>{Array.from({ length: 7 }, (_, i) => <circle key={i} cx={230 + i * 8.7} cy={384 + Math.sin(i / 6 * Math.PI) * 12 + offset} r="3.5" fill={necklace.color} stroke={necklace.accent} strokeWidth=".6" />)}</g>) : <g transform="translate(256 405) scale(.7)"><PaintedPiece id={selection.necklace} jewel /></g>}</g>}
  </svg>;
}
