import { useId } from "react";
import { hairCutoutSource, type AvatarAppearance } from "./appearance";
import type { TurnFace } from "./turnViews";

export type RedesignedHair = Exclude<AvatarAppearance["hairstyle"], "bob">;
const VIEW_CELLS: Record<TurnFace, number> = { front: 0, "front-quarter": 1, side: 2, "back-quarter": 3, back: 4 };
type Placement = { crop: [number, number, number, number]; x: number; y: number; sx?: number; sy?: number };
const PLACEMENTS: Record<RedesignedHair, Record<TurnFace, Placement>> = {
  waves: {
    "front": {"crop": [20, 113, 529, 615], "x": 6.3, "y": -91.9, "sx": 0.9, "sy": 0.9},
    "front-quarter": {"crop": [530, 116, 1045, 624], "x": 6.3, "y": -91.9, "sx": 0.9, "sy": 0.9},
    "side": {"crop": [1044, 123, 1518, 641], "x": -20.3, "y": -100.7, "sx": 0.86, "sy": 0.9},
    "back-quarter": {"crop": [36, 770, 500, 1265], "x": 14.6, "y": 8.4, "sx": 0.9, "sy": 0.9},
    "back": {"crop": [532, 766, 1033, 1272], "x": 12.4, "y": 11.7, "sx": 0.9, "sy": 0.9},
  },
  twintails: {
    "front": {"crop": [14, 90, 516, 652], "x": 17.3, "y": -71.0, "sx": 0.9, "sy": 0.9},
    "front-quarter": {"crop": [545, 88, 1063, 660], "x": 17.3, "y": -71.0, "sx": 0.9, "sy": 0.9},
    "side": {"crop": [1082, 86, 1517, 673], "x": -19.2, "y": -67.7, "sx": 0.86, "sy": 0.9},
    "back-quarter": {"crop": [20, 823, 473, 1382], "x": 33.9, "y": -39.0, "sx": 0.9, "sy": 0.9},
    "back": {"crop": [503, 827, 1044, 1364], "x": 20.7, "y": -43.4, "sx": 0.9, "sy": 0.9},
  },
  braids: {
    "front": {"crop": [13, 47, 533, 702], "x": 10.2, "y": -30.3, "sx": 0.9, "sy": 0.86},
    "front-quarter": {"crop": [545, 45, 1072, 702], "x": 10.2, "y": -30.3, "sx": 0.9, "sy": 0.86},
    "side": {"crop": [1080, 48, 1524, 705], "x": -25.6, "y": -31.4, "sx": 0.86, "sy": 0.86},
    "back-quarter": {"crop": [40, 772, 517, 1417], "x": 5.2, "y": 6.6, "sx": 0.9, "sy": 0.86},
    "back": {"crop": [540, 774, 1048, 1414], "x": 2.4, "y": 5.5, "sx": 0.9, "sy": 0.86},
  },
  bun: {
    "front": {"crop": [7, 102, 527, 568], "x": 10.7, "y": -98.0, "sx": 0.9, "sy": 0.9},
    "front-quarter": {"crop": [536, 97, 1032, 580], "x": 10.7, "y": -77.3, "sx": 0.9, "sy": 0.8},
    "side": {"crop": [1064, 93, 1535, 585], "x": -35.1, "y": -63.4, "sx": 0.86, "sy": 0.8},
    "back-quarter": {"crop": [33, 845, 526, 1276], "x": 4.6, "y": -58.9, "sx": 0.9, "sy": 0.9},
    "back": {"crop": [525, 838, 1042, 1270], "x": 11.8, "y": -53.3, "sx": 0.9, "sy": 0.9},
  },
  pixie: {
    "front": {"crop": [-1, 110, 528, 537], "x": 18.4, "y": -88.6, "sx": 0.9, "sy": 0.9},
    "front-quarter": {"crop": [526, 105, 1059, 542], "x": 18.4, "y": -88.6, "sx": 0.9, "sy": 0.9},
    "side": {"crop": [1068, 106, 1526, 543], "x": -26.6, "y": -85.4, "sx": 0.86, "sy": 0.9},
    "back-quarter": {"crop": [18, 825, 509, 1250], "x": 19.0, "y": -41.2, "sx": 0.9, "sy": 0.9},
    "back": {"crop": [525, 826, 1060, 1249], "x": 3.5, "y": -42.3, "sx": 0.9, "sy": 0.9},
  },
};

/** Hair-only paintings share Coco's 512×768 frame; the face stays in CocoFace. */
export default function HairArtwork({ hairstyle, view = "front", hairRibbon = "ribbon" }: { hairstyle: RedesignedHair; view?: TurnFace; hairRibbon?: AvatarAppearance["hairRibbon"] }) {
  const cell = VIEW_CELLS[view];
  const alphaId = `hair-alpha-${useId().replaceAll(":", "")}`;
  const placement = PLACEMENTS[hairstyle][view];
  const [left, top, right, bottom] = placement.crop;
  return <svg className="redesigned-hair-art" viewBox="0 0 512 768" aria-hidden="true" data-hair-design="v3" data-hair-ribbon={hairRibbon} data-hair-view={view}>
    <defs><filter id={alphaId} x="-.02" y="-.02" width="1.04" height="1.04" colorInterpolationFilters="sRGB"><feComponentTransfer><feFuncA type="linear" slope="1.08" intercept="-.08" /></feComponentTransfer></filter></defs>
    <g filter={`url(#${alphaId})`}><g transform={`translate(${placement.x} ${placement.y}) scale(${placement.sx ?? 1} ${placement.sy ?? 1})`}>
      <svg x={left - cell % 3 * 512} y={top - Math.floor(cell / 3) * 768} width={right - left} height={bottom - top} viewBox={`${left} ${top} ${right - left} ${bottom - top}`} overflow="hidden">
        <image href={hairCutoutSource(view, hairstyle, hairRibbon)} width="1536" height="1536" />
      </svg>
    </g></g>
  </svg>;
}

/** The face opening in the front painting is not the back of the head. Render
 * actual painted rear hair behind Coco's cheeks instead of duplicating that hole. */
export function HairBacking({ hairstyle, view = "front" }: { hairstyle: RedesignedHair; view?: TurnFace }) {
  const id = `hair-backing-${useId().replaceAll(":", "")}`;
  const outlines: Partial<Record<TurnFace, string>> = {
    front: "M138 222Q120 290 145 332Q165 365 224 377L228 347H287L291 377Q355 366 381 332Q408 287 385 222Z",
    "front-quarter": "M123 160Q104 290 145 335Q169 367 233 379L238 345H294L299 375Q373 365 401 324Q424 277 410 160Z",
    side: "M190 225Q164 277 191 322Q212 346 254 358L257 340H292L298 358L327 347L335 306L305 226Z",
  };
  // The swept-up bun exposes the nape and both sides of the jaw. Its rear cap
  // must reach the side locks rather than using the narrower long-hair mask.
  if (hairstyle === "bun" && view === "front") {
    outlines.front = "M126 222Q112 290 133 334Q143 352 157 362Q190 378 229 379L229 348H286L286 379Q338 378 368 360Q388 344 393 318Q410 278 391 222Z";
  }
  if (hairstyle === "bun" && view === "front-quarter") {
    outlines["front-quarter"] = "M123 160Q104 290 145 335Q169 367 233 379L238 345H294L299 375Q390 370 423 335Q445 287 431 160Z";
  }
  const backingTransform = hairstyle === "bun" && view === "front"
    ? "translate(256 320) scale(1.12 1) translate(-256 -320)"
    : view === "front-quarter"
      ? `translate(256 0) scale(${hairstyle === "bun" ? 1.25 : 1.12} 1) translate(-256 0)`
      : undefined;
  if (!outlines[view]) return null;
  return <svg className="redesigned-hair-art" viewBox="0 0 512 768" aria-hidden="true" data-hair-backing={view}>
    <defs>
      <filter id={`${id}-edge`}><feGaussianBlur stdDeviation="1.2" /></filter>
      <mask id={id} x="0" y="0" width="512" height="768" maskUnits="userSpaceOnUse"><path d={outlines[view]} fill="white" filter={`url(#${id}-edge)`} /></mask>
    </defs>
    <g mask={`url(#${id})`}><g transform={backingTransform}><HairArtwork hairstyle={hairstyle} view="back" hairRibbon="none" /></g></g>
  </svg>;
}
