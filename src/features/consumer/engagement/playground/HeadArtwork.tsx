import artwork from "@/data/avatar-art-v4.json";
import type { AvatarAppearance } from "./appearance";
import type { TurnFace } from "./turnViews";

/** The same registered painting is reused for local facial changes, never a different face. */
export default function HeadArtwork({ appearance, view = "front" }: { appearance: AvatarAppearance; view?: TurnFace }) {
  if (appearance.hairstyle === "bob") return <image href="/images/playground/cute-fashion-atlas-v3.png" x="-37.9" width="1536" height="1536" />;
  const atlas = artwork.heads[appearance.hairstyle], placement = atlas.views[view];
  const [left, top, right, bottom] = placement.bounds;
  const cw = atlas.width / 3, ch = atlas.height / 2;
  return <g transform={`matrix(${placement.matrix.join(" ")})`}><svg x={left - placement.cell % 3 * cw} y={top - Math.floor(placement.cell / 3) * ch} width={right - left} height={bottom - top} viewBox={`${left} ${top} ${right - left} ${bottom - top}`} overflow="hidden"><image href={atlas.source} width={atlas.width} height={atlas.height} /></svg></g>;
}
