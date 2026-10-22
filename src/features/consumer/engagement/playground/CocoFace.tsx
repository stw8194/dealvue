import type { AvatarAppearance } from "./appearance";
import PaintedHead from "./PaintedHead";
import type { TurnView } from "./turnViews";

/** Alternate hairstyles provide complete painted heads, including every turn view. */
export function CocoTurnHead({ appearance, view }: { appearance: AvatarAppearance; view: TurnView }) {
  if (appearance.hairstyle === "bob") return null;
  return <span className="avatar-custom-head turn-view-head" aria-hidden="true"><PaintedHead appearance={appearance} view={view} /></span>;
}
