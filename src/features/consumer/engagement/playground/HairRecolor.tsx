/**
 * Recolouring the original drawing in place (instead of swapping in separate face/hair art): a copy of the head is
 * keyed down to its hair by brightness — the chestnut hair is far darker than the skin — then given the hair colour.
 * Alpha = 7 × (0.62 − luminance): hair is kept, skin drops out (skin regions are also masked out by FACE_HOLES).
 */
const HAIR_KEY = "0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -1.4882 -5.0064 -0.5054 0 4.34";
export function HairKeyFilter({ id }: { id: string }) {
  return <svg className="hair-key-defs" width="0" height="0" aria-hidden="true"><filter id={id} colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values={HAIR_KEY} result="key" /><feComposite in="SourceGraphic" in2="key" operator="in" /></filter></svg>;
}
