import { ACCESSORIES, type Accessories as Selection, type AccessoryId } from "./data";
import type { AvatarAppearance } from "./appearance";
import PaintedAccessory from "./PaintedAccessory";

export function AccessoryThumbnail({ id }: { id: AccessoryId }) {
  const empty = ACCESSORIES.find(item => item.id === id)?.design === "none";
  return <svg viewBox="0 0 80 80" className="accessory-thumbnail" aria-hidden="true">{empty ? <><circle cx="40" cy="40" r="22" fill="none" stroke="#cbc5d8" strokeWidth="2" /><path d="m25 55 30-30" stroke="#cbc5d8" strokeWidth="2" /></> : <PaintedAccessory id={id} x={4} y={4} width={72} height={72} />}</svg>;
}

export function WornAccessories({ selection, part, hairstyle = "bob" }: { selection: Selection; part: "head" | "torso" | "arm-right"; hairstyle?: AvatarAppearance["hairstyle"] }) {
  const hair = ACCESSORIES.find(item => item.id === selection.hair)!;
  const necklace = ACCESSORIES.find(item => item.id === selection.necklace)!;
  const clip = ["silk-bow", "mint-bow", "daisy-clip", "butterfly-clip", "star-clip"].includes(hair.design);
  const hairBox = clip ? hairstyle === "bun" ? [334, 95, 70, 62] : [344, 90, 74, 64]
    : hair.design === "rose-beret" ? [76, -18, 357, 180]
    : hair.design === "sunhat" ? [39, -30, 429, 204]
    : hair.design === "crystal-tiara" || hair.design === "mini-crown" ? [149, -35, 215, 123]
    : [102, -65, 309, 232];
  return <svg className={`fashion-accessories accessories-${part}`} viewBox="0 0 512 768" aria-hidden="true">
    {part === "head" && <>
      {hair.design !== "none" && <PaintedAccessory id={selection.hair} x={hairBox[0]} y={hairBox[1]} width={hairBox[2]} height={hairBox[3]} />}
      {selection.ears !== "ears-none" && [[122, 302], [407, 285]].map(([x, y]) => <g key={x} className="earring-pendant" style={{ transformOrigin: `${x + 8}px ${y}px` }}><PaintedAccessory id={selection.ears} x={x} y={y} width={16} height={35} /></g>)}
    </>}
    {part === "arm-right" && selection.bag !== "bag-none" && <g className="worn-bag-swing"><PaintedAccessory id={selection.bag} x={370} y={490} width={88} height={105} /></g>}
    {part === "torso" && necklace.design !== "none" && <PaintedAccessory id={selection.necklace} x={necklace.design === "star-collar" ? 195 : 211} y={371} width={necklace.design === "star-collar" ? 122 : 90} height={necklace.design === "ribbon-choker" || necklace.design === "pearl-choker" ? 39 : 65} />}
  </svg>;
}
