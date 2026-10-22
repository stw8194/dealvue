import { useId } from "react";
import artwork from "@/data/avatar-art-v4.json";
import { ACCESSORIES, ACCESSORY_DESIGNS, isAvailableAccessory, type AccessoryId, type AccessorySlot } from "./accessoryCatalog";

const ATLASES = { hair: "hair-accessories", ears: "earrings", bag: "bags", necklace: "necklaces" } as const;
const COLORWAYS = { original: "none", pearl: "saturate(.25) brightness(1.16)", midnight: "saturate(.45) hue-rotate(225deg) brightness(.65)" };

/** Preserve each painting's proportions instead of stretching a vector symbol. */
export default function PaintedAccessory({ id, x = 0, y = 0, width = 80, height = 80 }: { id: AccessoryId; x?: number; y?: number; width?: number; height?: number }) {
  const filter = `accessory-paint-${useId().replaceAll(":", "")}`;
  const item = ACCESSORIES.find(item => item.id === id);
  if (!item || item.design === "none" || !isAvailableAccessory(item)) return null;
  const slot: AccessorySlot = item.slot;
  const atlas = artwork.accessories[ATLASES[slot]];
  const index = ACCESSORY_DESIGNS.filter(design => design.slot === slot).findIndex(design => design.id === item.design);
  const crop = atlas.crops[index];
  return <svg x={x} y={y} width={width} height={height} viewBox={crop.join(" ")} overflow="hidden" preserveAspectRatio="xMidYMid meet" data-painted-accessory={item.design} style={{ filter: COLORWAYS[item.colorway] }}>
    <defs><clipPath id={`${filter}-crop`}><rect x={crop[0]} y={crop[1]} width={crop[2]} height={crop[3]} /></clipPath><filter id={filter} x="0" y="0" width="1" height="1" colorInterpolationFilters="sRGB"><feComponentTransfer><feFuncA type="linear" slope="1.3" intercept="-.3" /></feComponentTransfer></filter></defs>
    <image href={atlas.source} width={atlas.width} height={atlas.height} clipPath={`url(#${filter}-crop)`} filter={`url(#${filter})`} />
  </svg>;
}
