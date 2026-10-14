export interface IconCategoryMeta {
  id: string;
  label: string;
  path: string;
}

export const ICON_CATEGORIES: IconCategoryMeta[] = [
  { id: "hair", label: "헤어", path: "/businesses?category=hair" },
  { id: "makeup", label: "메이크업", path: "/businesses?category=makeup" },
  { id: "aesthetic", label: "에스테틱", path: "/businesses?category=aesthetic" },
  { id: "nail", label: "네일", path: "/businesses?category=nail" },
  {
    id: "eyelash",
    label: "속눈썹·왁싱",
    path: "/businesses?category=eyelash",
  },
  { id: "dealviewPackage", label: "딜키트", path: "/package" },
  { id: "playground", label: "출석·캐릭터", path: "/rewards" },
  { id: "community", label: "우리동네", path: "/community" },
];
