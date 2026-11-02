import { useId } from "react";
import { ACCESSORY_COLORWAYS, type AccessoryItem } from "./accessoryCatalog";
import PaintedAccessory from "./PaintedAccessory";

type Carry = "hand" | "crossbody" | "shoulder";
type Placement = { carry: Carry; x: number; y: number; width: number; height: number; strap?: string };
const HAND: Placement = { carry: "hand", x: 350, y: 492, width: 122, height: 142 };
// Extend over the shoulder, underneath the head/hair layer, rather than ending on the chest.
const SHOULDER_WRAP = "M195 350 Q174 350 181 379";
const CROSSBODY: Placement = { carry: "crossbody", x: 320, y: 510, width: 134, height: 142, strap: `${SHOULDER_WRAP} Q233 440 335 551` };
const PLACEMENTS: Partial<Record<AccessoryItem["design"], Placement>> = {
  "berry-bag": CROSSBODY,
  "camera-bag": { ...CROSSBODY, y: 512, strap: `${SHOULDER_WRAP} Q238 446 335 564` },
  "caramel-satchel": { ...CROSSBODY, y: 506, strap: `${SHOULDER_WRAP} Q238 446 334 555` },
  "moon-bag": { carry: "shoulder", x: 334, y: 438, width: 134, height: 162, strap: "M326 383 Q365 409 351 501" },
  "flower-bag": { ...HAND, x: 355, y: 489, width: 114, height: 156 },
  "teddy-bag": { ...HAND, x: 355, width: 114, height: 142 },
  "star-bag": { ...HAND, x: 353, width: 118, height: 144 },
};

/** Straps lie on the garment; the painted bag lies behind the foreground hand. */
export default function WornBag({ item, layer }: { item: AccessoryItem; layer: "strap" | "strap-front" | "body" }) {
  const id = `bag-strap-${useId().replaceAll(":", "")}`;
  const placement = PLACEMENTS[item.design] ?? HAND;
  if (item.design === "none") return null;
  if (layer === "body") return <g className={placement.carry === "hand" ? "worn-bag-swing" : "worn-bag-body"} data-bag-carry={placement.carry}>
    <PaintedAccessory id={item.id} x={placement.x} y={placement.y} width={placement.width} height={placement.height} />
  </g>;
  if (!placement.strap) return null;
  const foreground = layer === "strap-front";
  if (foreground && placement.carry !== "crossbody") return null;
  return <g style={{ filter: ACCESSORY_COLORWAYS[item.colorway] }} data-bag-strap={placement.carry} clipPath={foreground ? `url(#${id}-front)` : undefined}>
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="1" y2="0"><stop stopColor={item.color} /><stop offset=".5" stopColor={item.accent} /><stop offset="1" stopColor={item.color} /></linearGradient>
      {/* Restore the garment section over the sleeve paint, while keeping the
          shoulder wrap below hair and the lower end below the bag/hand. */}
      {foreground && <clipPath id={`${id}-front`}><rect x="0" y="379" width="512" height="121" /></clipPath>}
    </defs>
    <path d={placement.strap} stroke="#432c3830" strokeWidth="9" strokeLinecap="round" fill="none" transform="translate(1 1)" />
    <path d={placement.strap} stroke={`url(#${id})`} strokeWidth="6" strokeLinecap="round" fill="none" />
    <path d={placement.strap} stroke="#fff5dd" strokeOpacity=".5" strokeWidth="1" strokeLinecap="round" fill="none" />
  </g>;
}
