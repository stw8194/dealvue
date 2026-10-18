import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/api/supabase";
import type { ConsumerDeal, KitLeg } from "./types";
import { resolveBusinessImage } from "./businessImages";
import { packageSlots } from "./booking/packageSchedule";

export const KIT_DEAL_OFFSET = 2_000_000;

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
  /** Bookable visits per shop; only packages linked to real services have them. */
  legs?: KitLeg[];
}
export type DealKitInput = Omit<DealKit, "id" | "business_id" | "template" | "is_demo" | "business" | "legs">;

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

type ProvidedKit = Omit<DealKit, "business_id" | "business" | "active" | "template" | "template_id" | "items" | "legs"> & {
  templateSlug?: string;
  /** Visits in order; each names its shop and the services' stable source keys. */
  visits: { shop: string; services: string[] }[];
};

// Packages built from the supplied shops' menus, linked by service source keys rather than names.
const PROVIDED_KITS: ProvidedKit[] = [
  { id: 101, templateSlug: "wedding", type: "special", purpose: "wedding", title: "하객·혼주 웨딩 메이크업 패키지", description: "결혼식 하객과 혼주 메이크업을 한 번에 예약하는 웨딩 데이 패키지입니다.", visits: [{ shop: "provided:nouvelic", services: ["provided:nouvelic:service:1", "provided:nouvelic:service:2"] }], original_price: 230000, price: 161000 },
  { id: 102, templateSlug: "wedding", type: "special", purpose: "wedding", title: "웨딩 촬영 퍼스널 메이크업 패키지", description: "피부 톤과 촬영 콘셉트에 맞춘 1:1 퍼스널 메이크업에 포인트 메이크업을 더했어요.", visits: [{ shop: "provided:riobella", services: ["provided:riobella:service:1", "provided:riobella:service:4"] }], original_price: 200000, price: 150000 },
  { id: 103, templateSlug: "profile", type: "special", purpose: "photoShoot", title: "프로필·증명사진 메이크업 패키지", description: "취업 프로필과 증명사진을 같은 날 촬영할 수 있도록 두 가지 메이크업을 이어서 진행합니다.", visits: [{ shop: "provided:bellunique", services: ["provided:bellunique:service:5", "provided:bellunique:service:1"] }], original_price: 120000, price: 84000 },
  { id: 104, templateSlug: "profile", type: "special", purpose: "photoShoot", title: "여행 스냅 촬영 메이크업 패키지", description: "야외 촬영에도 오래 유지되는 스냅 메이크업과 데일리 메이크업을 함께 받아요.", visits: [{ shop: "provided:arvien", services: ["provided:arvien:service:4", "provided:arvien:service:1"] }], original_price: 155000, price: 116000 },
  { id: 105, templateSlug: "student", type: "special", purpose: "exam", title: "수험생 헤어 변신 패키지", description: "시험이 끝난 수험생을 위한 커트·매직·홈케어 구성입니다.", visits: [{ shop: "provided:rivelloa", services: ["provided:rivelloa:service:1", "provided:rivelloa:service:3", "provided:rivelloa:service:5"] }], original_price: 185000, price: 120000 },
  { id: 106, templateSlug: "student", type: "special", purpose: "exam", title: "새내기 데일리 메이크업 패키지", description: "처음 메이크업을 시작하는 새내기를 위한 데일리·소개팅 메이크업 구성입니다.", visits: [{ shop: "provided:arvien", services: ["provided:arvien:service:1", "provided:arvien:service:2"] }], original_price: 145000, price: 99000 },
  { id: 111, type: "oneShop", purpose: "", title: "컬러 체인지 풀케어", description: "애쉬 톤다운 염색 후 컬러 클리닉으로 손상을 줄이고, 컨설팅 커트로 스타일을 완성합니다.", visits: [{ shop: "provided:roere", services: ["provided:roere:service:1", "provided:roere:service:4", "provided:roere:service:3"] }], original_price: 290000, price: 203000 },
  { id: 112, type: "oneShop", purpose: "", title: "페이셜 & 바디 릴랙스", description: "베이직 페이셜 케어와 바디 릴랙스 케어를 한 번의 방문으로 받는 휴식 패키지입니다.", visits: [{ shop: "provided:ongyeol", services: ["provided:ongyeol:service:1", "provided:ongyeol:service:4"] }], original_price: 210000, price: 147000 },
  { id: 113, type: "oneShop", purpose: "", title: "두피 집중 케어 3단계", description: "스케일링으로 두피를 정돈하고 헤드스파와 진정 케어로 마무리하는 두피 집중 관리입니다.", visits: [{ shop: "provided:nuagen", services: ["provided:nuagen:service:1", "provided:nuagen:service:2", "provided:nuagen:service:5"] }], original_price: 220000, price: 154000 },
  { id: 114, type: "oneShop", purpose: "", title: "매직 & 손상모 클리닉", description: "클리닉 매직스트레이트와 손상모 집중 클리닉을 함께 받아 매끈한 결을 오래 유지해요.", visits: [{ shop: "provided:moneve", services: ["provided:moneve:service:1", "provided:moneve:service:5"] }], original_price: 290000, price: 203000 },
  { id: 121, type: "shopShop", purpose: "", title: "면접 완성 헤어·메이크업", description: "모네브의 앞머리 매직으로 단정하게 정리한 뒤 모아렌 뷰티랩에서 면접 메이크업을 받습니다.", visits: [{ shop: "provided:moneve", services: ["provided:moneve:service:2"] }, { shop: "provided:moaren", services: ["provided:moaren:service:1"] }], original_price: 120000, price: 90000 },
  { id: 122, type: "shopShop", purpose: "", title: "데이트 스타일 체인지", description: "Ardien 디자인컷으로 스타일을 바꾸고 리오벨라 메이크업에서 데이트 메이크업을 받아요.", visits: [{ shop: "provided:ardien", services: ["provided:ardien:service:3"] }, { shop: "provided:riobella", services: ["provided:riobella:service:5"] }], original_price: 135000, price: 101000 },
  { id: 123, type: "shopShop", purpose: "", title: "촬영 전 페이스라인 케어", description: "결채의 얼굴선 집중관리 후 벨루니크 메이크업에서 프로필 촬영 메이크업을 받는 촬영 준비 패키지입니다.", visits: [{ shop: "provided:gyeolchae", services: ["provided:gyeolchae:service:2"] }, { shop: "provided:bellunique", services: ["provided:bellunique:service:5"] }], original_price: 180000, price: 126000 },
  { id: 124, type: "shopShop", purpose: "", title: "힐링 데이 바디 & 두피", description: "담온의 전신 아로마 관리 후 NUAGEN 탈모완화 헤드스파로 하루를 온전히 쉬어가는 구성입니다.", visits: [{ shop: "provided:damon", services: ["provided:damon:service:3"] }, { shop: "provided:nuagen", services: ["provided:nuagen:service:2"] }], original_price: 190000, price: 133000 },
];

type ProvidedShop = { id: number; name: string; address: string; source_key: string; business_images?: { img_url: string }[]; business_category?: { category: string }[] | null; source_details?: { opening_hours?: string; closed_days?: string; cancellation_policy?: string } | null };
type ProvidedService = { id: number; business_id: number; name: string; price: number; duration_minutes: number; display_duration_minutes: number | null; source_key: string };

async function readProvidedCatalog() {
  const client = getSupabaseClient();
  const serviceKeys = [...new Set(PROVIDED_KITS.flatMap(kit => kit.visits.flatMap(visit => visit.services)))];
  const [shops, services] = await Promise.all([
    client.from("businesses").select("id,name,address,source_key,source_details,business_images(img_url),business_category(category)").like("source_key", "provided:%"),
    client.from("services").select("id,business_id,name,price,duration_minutes,display_duration_minutes,source_key").in("source_key", serviceKeys),
  ]);
  if (shops.error || services.error) throw new Error("딜키트 매장 정보를 불러오지 못했습니다. 다시 시도해 주세요.");
  return {
    shops: new Map(((shops.data ?? []) as ProvidedShop[]).filter(shop => shop.source_key).map(shop => [shop.source_key, shop])),
    services: new Map(((services.data ?? []) as ProvidedService[]).filter(service => service.source_key).map(service => [service.source_key, service])),
  };
}

/** Builds the supplied packages; a package whose shop or services are missing is left out. */
async function readProvidedKits(): Promise<{ kits: DealKit[]; shops: Map<string, ProvidedShop> }> {
  const { shops, services } = await readProvidedCatalog();
  const kits = PROVIDED_KITS.flatMap(({ templateSlug, visits, ...kit }) => {
    const legs: KitLeg[] = [];
    for (const visit of visits) {
      const shop = shops.get(visit.shop);
      const items = visit.services.map(key => services.get(key));
      if (!shop || items.some(item => !item || item.business_id !== shop.id)) return [];
      const rows = items as ProvidedService[];
      legs.push({
        businessId: shop.id, businessName: shop.name, address: shop.address,
        serviceIds: rows.map(row => row.id), serviceNames: rows.map(row => row.name),
        durationMinutes: rows.reduce((sum, row) => sum + row.duration_minutes, 0),
        displayMinutes: rows.reduce((sum, row) => sum + (row.display_duration_minutes ?? row.duration_minutes), 0),
        menuPrice: rows.reduce((sum, row) => sum + row.price, 0),
        openingHours: shop.source_details?.opening_hours, closedDays: shop.source_details?.closed_days, cancellationPolicy: shop.source_details?.cancellation_policy,
      });
    }
    const first = shops.get(visits[0].shop)!;
    const template = PREVIEW_DEAL_KIT_TEMPLATES.find((item) => item.slug === templateSlug) ?? null;
    const items = legs.flatMap(leg => leg.serviceNames.map(name => legs.length > 1 ? `${name} · ${leg.businessName}` : name));
    return [{ ...kit, items, legs, business_id: first.id, active: true, template_id: template?.id ?? null, template, business: { id: first.id, name: first.name, address: first.address, business_images: first.business_images } }];
  });
  return { kits, shops };
}

/** A deal kit as a bookable item for the shared checkout, read from the same list the pages show. */
export function useKitDeal(kitId?: number) {
  const [result, setResult] = useState<{ id?: number; deal: ConsumerDeal | null; error: string | null; reason: string | null } | null>(null);
  useEffect(() => {
    if (kitId === undefined) return;
    let current = true;
    readDealKits().then((kits) => {
      const kit = kits.find((item) => item.id === kitId);
      const legs = kit?.legs ?? [];
      const deal: ConsumerDeal | null = kit && legs.length ? {
        id: KIT_DEAL_OFFSET + kit.id, kitId: kit.id, businessId: legs[0].businessId, serviceId: -kit.id,
        businessName: legs.map(leg => leg.businessName).join(" → "), serviceName: kit.title, category: null, description: kit.description,
        imageUrl: kit.template?.image_url ?? resolveBusinessImage(kit.business?.business_images?.[0]?.img_url) ?? null, address: legs[0].address,
        originalPrice: kit.original_price, price: kit.price, remainingCapacity: 99, endAt: "", slots: [],
        regularSlots: packageSlots(legs), legs,
        durationMinutes: legs.reduce((sum, leg) => sum + leg.durationMinutes, 0), cancellationPolicy: legs[0].cancellationPolicy,
      } : null;
      const reason = !kit ? "판매 중인 딜키트를 찾을 수 없습니다." : !legs.length ? "이 딜키트는 구성 시술이 매장 메뉴와 연결되어 있지 않아 앱에서 예약할 수 없어요. 매장에 문의해 주세요." : null;
      if (current) setResult({ id: kitId, deal, error: null, reason });
    }, (error: unknown) => { if (current) setResult({ id: kitId, deal: null, error: error instanceof Error ? error.message : "딜키트를 불러오지 못했습니다.", reason: null }); });
    return () => { current = false; };
  }, [kitId]);
  const current = result?.id === kitId ? result : null;
  return { deal: current?.deal ?? null, loading: kitId !== undefined && !current, error: current?.error ?? null, reason: current?.reason ?? null };
}

export async function readDealKits(businessId?: number, manage = false): Promise<DealKit[]> {
  if (!manage) {
    // Consumers see the supplied shops' packages plus packages managers registered for those shops.
    // A failed read is reported, not shown as "no packages".
    const [{ kits, shops }, stored] = await Promise.all([readProvidedKits(), readStoredDealKits(businessId, false)]);
    // A shop's own page lists everything it registered; the shared catalog leaves out packages of
    // shops the app no longer lists (older sample rows).
    const providedIds = new Set([...shops.values()].map((shop) => shop.id));
    return [...kits.filter((kit) => businessId === undefined || kit.business_id === businessId), ...stored.filter((kit) => businessId !== undefined || providedIds.has(kit.business_id))];
  }
  return readStoredDealKits(businessId, manage);
}

async function readStoredDealKits(businessId?: number, manage = false): Promise<DealKit[]> {
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
  const key = `${businessId}`;
  const [result, setResult] = useState<{ key: string; kits: DealKit[]; error: string | null } | null>(null);
  useEffect(() => {
    let current = true;
    void readDealKits(businessId).then(
      (kits) => { if (current) setResult({ key, kits, error: null }); },
      (error: unknown) => { if (current) setResult({ key, kits: [], error: error instanceof Error ? error.message : "딜키트를 불러오지 못했습니다." }); },
    );
    return () => { current = false; };
  }, [businessId, key]);
  return { kits: result?.key === key ? result.kits : [], loading: result?.key !== key, error: result?.key === key ? result.error : null };
}
