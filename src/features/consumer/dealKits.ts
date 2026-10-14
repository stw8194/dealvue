import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/api/supabase";
import { usePreviewStore } from "./preview";

export type DealKitType = "special" | "oneShop" | "shopShop";
export interface DealKitTemplate {
  id: number;
  slug: string;
  title: string;
  description: string;
  type: DealKitType;
  purpose: string;
  items: string[];
  image_url: string;
  sort_order: number;
}
export interface DealKit {
  id: number;
  business_id: number;
  title: string;
  description: string;
  type: DealKitType;
  purpose: string;
  items: string[];
  original_price: number;
  price: number;
  active: boolean;
  template_id: number | null;
  template?: DealKitTemplate | null;
  is_demo?: boolean;
  business?: { id: number; name: string; address: string; business_images?: { img_url: string }[] } | null;
}
export type DealKitInput = Omit<DealKit, "id" | "business_id" | "template" | "is_demo" | "business">;

// Independent packages: no time-deal references, deadlines or slot inventory.
export const PREVIEW_DEAL_KIT_TEMPLATES: DealKitTemplate[] = [
  { id: 1, slug: "wedding", title: "웨딩 헤메드 패키지", description: "특별한 날을 위한 헤어, 메이크업, 드레스 구성", type: "special", purpose: "wedding", items: ["웨딩 헤어", "신부 메이크업", "드레스 피팅"], image_url: "/images/deal-kits/wedding.png", sort_order: 10 },
  { id: 2, slug: "profile", title: "프로필 촬영 패키지", description: "나다운 모습을 담는 헤어·메이크업과 프로필 촬영", type: "special", purpose: "photoShoot", items: ["촬영 헤어", "메이크업", "프로필 촬영"], image_url: "/images/deal-kits/profile.png", sort_order: 20 },
  { id: 3, slug: "student", title: "수험생 뷰티 패키지", description: "새로운 시작을 위한 스타일링과 뷰티 케어", type: "special", purpose: "exam", items: ["헤어 스타일링", "내추럴 메이크업"], image_url: "/images/deal-kits/student.png", sort_order: 30 },
];
export const PREVIEW_DEAL_KITS: DealKit[] = PREVIEW_DEAL_KIT_TEMPLATES.flatMap((template, index) => [0, 1].map((variant) => ({
  id: index * 2 + variant + 1, business_id: variant ? 7002 : 7001, template_id: template.id, template,
  business: { id: variant ? 7002 : 7001, name: variant ? "오늘 메이크업" : "딜뷰 헤어 스튜디오", address: variant ? "서울 강남구 청담동" : "서울 강남구 신사동" },
  title: [variant ? "본식 프리미엄 헤어·메이크업" : "내추럴 웨딩 헤메드", variant ? "스튜디오 프로필 촬영 + 메이크업" : "퍼스널 프로필 헤어·메이크업", variant ? "새내기 메이크업 클래스" : "수험생 헤어 변신 패키지"][index], description: "화면 확인용 샘플 상품입니다. 실제 판매 상품이 아닙니다.",
  type: template.type, purpose: template.purpose,
  items: [variant ? ["본식 헤어·메이크업", "신랑 스타일링", "현장 수정 1회"] : ["신부 헤어", "내추럴 메이크업", "드레스 피팅"], variant ? ["촬영 메이크업", "스튜디오 촬영 60분", "보정 사진 3장"] : ["프로필 헤어", "카메라 메이크업"], variant ? ["퍼스널 메이크업 레슨 60분", "데일리 메이크업"] : ["디자인 커트", "수분 클리닉", "데일리 스타일링"]][index],
  original_price: [800000, 500000, 180000][index], price: (variant ? [600000, 360000, 120000] : [480000, 300000, 99000])[index], active: true, is_demo: true,
})));

export async function canManageDealKits(businessId: number) {
  const { data, error } = await getSupabaseClient().rpc("can_manage_deal_kits", { p_business_id: businessId });
  return !error && data === true;
}

export async function readDealKitTemplates(): Promise<DealKitTemplate[]> {
  const { data, error } = await getSupabaseClient().from("deal_kit_templates").select("*").order("sort_order").order("id");
  if (error) throw new Error("패키지 목록을 불러오지 못했습니다. 딜키트 SQL 적용 여부를 확인해 주세요.");
  return data ?? [];
}

export function groupDealKits(kits: DealKit[]) {
  const groups = new Map<string, { key: string; template: DealKitTemplate | null; offers: DealKit[]; lowest: DealKit }>();
  for (const kit of kits) {
    if (!kit.active) continue;
    const key = kit.template_id && kit.template ? `template-${kit.template_id}` : `offer-${kit.id}`;
    const group = groups.get(key);
    if (!group) groups.set(key, { key, template: kit.template ?? null, offers: [kit], lowest: kit });
    else {
      group.offers.push(kit);
      if (kit.price < group.lowest.price || (kit.price === group.lowest.price && kit.id < group.lowest.id)) group.lowest = kit;
    }
  }
  return [...groups.values()].sort((a, b) => (a.template?.sort_order ?? 999) - (b.template?.sort_order ?? 999) || a.lowest.id - b.lowest.id);
}

export function validateDealKit(input: DealKitInput): string | null {
  if (!input.title.trim() || input.title.trim().length > 100) return "이름을 1~100자로 입력해 주세요.";
  if (input.items.length < 2 || input.items.length > 30 || input.items.some((item) => !item.trim() || item.trim().length > 200)) return "패키지 구성을 2~30개 입력해 주세요. 항목은 200자 이내입니다.";
  if (![input.original_price, input.price].every((price) => Number.isSafeInteger(price) && price > 0 && price <= 2147483647) || input.price >= input.original_price) return "패키지 할인가를 정상가보다 낮은 양의 정수로 입력해 주세요.";
  return null;
}

export async function readDealKits(businessId?: number, manage = false): Promise<DealKit[]> {
  const kits: DealKit[] = [];
  const pageSize = 500;
  for (let page = 0; ; page += 1) {
    let query = getSupabaseClient().from("deal_kits").select("*,template:deal_kit_templates(*),business:businesses(id,name,address,business_images(img_url))").order("id");
    if (businessId !== undefined) query = query.eq("business_id", businessId);
    if (!manage) query = query.eq("active", true);
    const { data, error } = await query.range(page * pageSize, (page + 1) * pageSize - 1);
    if (error) throw new Error(error.code === "PGRST205" || error.code === "42P01" ? "딜키트 서비스를 준비 중입니다." : "딜키트를 불러오지 못했습니다. 다시 시도해 주세요.");
    kits.push(...(data ?? []) as DealKit[]);
    if (!data || data.length < pageSize) return kits;
  }
}

export async function saveDealKit(businessId: number, input: DealKitInput, id?: number) {
  const message = validateDealKit(input);
  if (message) throw new Error(message);
  const client = getSupabaseClient();
  const row = { ...input, title: input.title.trim(), items: input.items.map((item) => item.trim()), business_id: businessId };
  const query = id === undefined ? client.from("deal_kits").insert(row) : client.from("deal_kits").update(row).eq("id", id).eq("business_id", businessId);
  const { error } = await query.select("id").single();
  if (error) throw new Error("딜키트를 저장하지 못했습니다. 관리 권한과 입력 내용을 확인해 주세요.");
}

export function useDealKits(businessId?: number) {
  const preview = usePreviewStore((state) => state.enabled);
  const key = `${preview}:${businessId}`;
  const [result, setResult] = useState<{ key: string; kits: DealKit[]; error: string | null } | null>(null);
  useEffect(() => {
    if (preview) return;
    let current = true;
    void readDealKits(businessId).then(
      (kits) => { if (current) setResult({ key, kits, error: null }); },
      (error: unknown) => { if (current) setResult({ key, kits: [], error: error instanceof Error ? error.message : "딜키트를 불러오지 못했습니다." }); },
    );
    return () => { current = false; };
  }, [preview, businessId, key]);
  return preview ? { kits: PREVIEW_DEAL_KITS.filter((kit) => businessId === undefined || kit.business_id === businessId), loading: false, error: null }
    : { kits: result?.key === key ? result.kits : [], loading: result?.key !== key, error: result?.key === key ? result.error : null };
}
