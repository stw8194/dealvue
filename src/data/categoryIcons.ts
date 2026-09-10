export interface IconCategoryMeta {
  id: string;
  label: string;
  path: string;
}

export const ICON_CATEGORIES: IconCategoryMeta[] = [
  { id: "hair", label: "헤어", path: "/?category=hair" },
  { id: "makeup", label: "메이크업", path: "/?category=makeup" },
  { id: "aesthetic", label: "에스테틱", path: "/?category=aesthetic" },
  { id: "nail", label: "네일", path: "/?category=nail" },
  {
    id: "eyelash",
    label: "속눈썹·왁싱",
    path: "/?category=eyelash",
  },
  { id: "dealviewPackage", label: "딜뷰 패키지", path: "/package" },
  { id: "playground", label: "놀이터", path: "/mypage/playground" },
  { id: "designer", label: "디자이너", path: "/" },
];
