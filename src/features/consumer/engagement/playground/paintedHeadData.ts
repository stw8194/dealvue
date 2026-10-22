import artwork from "@/data/avatar-art-v4.json";
import type { AvatarAppearance } from "./appearance";

export const hasPaintedHead = (appearance: AvatarAppearance) => appearance.hairstyle !== "bob";
export const paintedHeadSource = (appearance: AvatarAppearance) => appearance.hairstyle === "bob" ? undefined : artwork.heads[appearance.hairstyle].source;
