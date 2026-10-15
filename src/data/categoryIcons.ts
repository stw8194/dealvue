import { Brush, Eye, Flower2, Gamepad2, Gift, MessagesSquare, Paintbrush, Scissors, type LucideIcon } from "lucide-react";

export interface IconCategoryMeta {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
}

export const ICON_CATEGORIES: IconCategoryMeta[] = [
  { id: "hair", label: "헤어", path: "/businesses?category=hair", icon: Scissors },
  { id: "makeup", label: "메이크업", path: "/businesses?category=makeup", icon: Brush },
  { id: "aesthetic", label: "에스테틱", path: "/businesses?category=aesthetic", icon: Flower2 },
  { id: "nail", label: "네일", path: "/businesses?category=nail", icon: Paintbrush },
  {
    id: "eyelash",
    label: "속눈썹·왁싱",
    path: "/businesses?category=eyelash",
    icon: Eye,
  },
  { id: "dealviewPackage", label: "딜키트", path: "/package", icon: Gift },
  { id: "playground", label: "출석·캐릭터", path: "/rewards", icon: Gamepad2 },
  { id: "community", label: "우리동네", path: "/community", icon: MessagesSquare },
];
