import type { ServiceCategory } from "@/type/package";

export type StaffMember = { id: number; name: string; position: string };

const NAMES = ["김지수", "이수진", "박서연", "최하은", "정민지", "한유나", "오세린", "윤가은", "서다인", "임채원", "강나연", "조은비", "신예린", "문소율", "배지아"];
const POSITIONS: Record<string, [string, string, string]> = {
  hair: ["원장", "실장", "디자이너"],
  makeup: ["원장", "수석 아티스트", "아티스트"],
  aesthetic: ["원장", "실장", "테라피스트"],
  nail: ["원장", "실장", "네일리스트"],
  eyelash: ["원장", "실장", "아티스트"],
};

/** The sample shops have no staff rows, so each gets a stable team of three. */
export function sampleStaff(businessId: number, category: ServiceCategory | string | null | undefined): StaffMember[] {
  const positions = POSITIONS[category ?? ""] ?? POSITIONS.hair;
  return positions.map((position, index) => ({
    id: -(businessId * 10 + index + 1),
    name: NAMES[(businessId * 3 + index * 5) % NAMES.length],
    position,
  }));
}
