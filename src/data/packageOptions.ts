import type { SpecialPackageType } from "@/type/package";
import type { ServiceCategory } from "@/type/package";

export const SPECIAL_PACKAGE_TYPES: {
  id: SpecialPackageType;
  label: string;
  items: string[];
}[] = [
  { id: "wedding", label: "웨딩", items: ["본식", "혼주", "화보", "스냅"] },
  {
    id: "photoShoot",
    label: "촬영",
    items: ["일상 프로필", "방송", "바디프로필", "증명사진"],
  },
  {
    id: "exam",
    label: "수험생",
    items: ["졸업사진", "면접 준비", "수능끝난후 특별"],
  },
  {
    id: "interview",
    label: "면접",
    items: ["취업", "승무원", "면접 프로필 촬영"],
  },
  { id: "personal", label: "퍼스널", items: ["컬러 진단", "스타일 컨설팅"] },
];

export const SERVICE_CATEGORIES: { id: ServiceCategory; label: string }[] = [
  { id: "hair", label: "헤어" },
  { id: "makeup", label: "메이크업" },
  { id: "aesthetic", label: "에스테틱" },
  { id: "nail", label: "네일" },
  { id: "eyelash", label: "속눈썹/왁싱" },
];
