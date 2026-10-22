import ChoiceGroup from "@/components/common/ChoiceGroup";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { readDealKits, readDealKitTemplates, canManageDealKits, saveDealKit, type DealKit, type DealKitInput, type DealKitTemplate } from "../dealKits";
import { Page } from "../ui";

const blank: DealKitInput = { template_id: null, title: "", description: "", type: "oneShop", purpose: "", items: [], original_price: 0, price: 0, active: false };
const field = "mt-2 block w-full rounded-xl border border-page-border p-3";
export function DealKitManagementLink({ businessId }: { businessId: number }) {
  const userId = useAuthStore((state) => state.user?.id);
  const key = `${businessId}:${userId}`;
  const [allowed, setAllowed] = useState<string | null>(null);
  useEffect(() => {
    if (!userId) return;
    let current = true;
    void canManageDealKits(businessId).then((value) => { if (current) setAllowed(value ? key : null); });
    return () => { current = false; };
  }, [businessId, userId, key]);
  return userId && allowed === key ? <Link to={`/business/${businessId}/manage-deal-kits`} className="inline-block rounded-xl border border-page-border px-4 py-3 text-sm font-semibold text-accent">딜키트 관리</Link> : null;
}
export default function DealKitManager() {
  const { businessId } = useParams();
  const userId = useAuthStore((state) => state.user?.id);
  return <DealKitManagerContent key={`${businessId}:${userId}`} />;
}

function DealKitManagerContent() {
  const { businessId } = useParams();
  const userId = useAuthStore((state) => state.user?.id);
  const [refresh, setRefresh] = useState(0);
  const key = `${businessId}:${userId}:${refresh}`;
  const [result, setResult] = useState<{ key: string; kits: DealKit[]; templates: DealKitTemplate[]; error: string } | null>(null);
  const [editing, setEditing] = useState<{ id?: number; input: DealKitInput; items: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!userId) return;
    let current = true;
    async function load() {
      const id = Number(businessId);
      if (!Number.isSafeInteger(id) || id <= 0 || !await canManageDealKits(id)) throw new Error("이 매장의 운영자만 딜키트를 관리할 수 있습니다.");
      const [kits, templates] = await Promise.all([readDealKits(id, true), readDealKitTemplates()]);
      if (current) setResult({ key, kits, templates, error: "" });
    }
    void load().catch((error: unknown) => { if (current) setResult({ key, kits: [], templates: [], error: error instanceof Error ? error.message : "딜키트를 불러오지 못했습니다." }); });
    return () => { current = false; };
  }, [businessId, userId, key]);
  const current = result?.key === key ? result : null;
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editing || saving || !current || current.error) return;
    if (!editing.input.template_id) { setMessage("미리 만들어진 패키지를 선택해 주세요."); return; }
    setSaving(true); setMessage("");
    try {
      await saveDealKit(Number(businessId), { ...editing.input, items: editing.items.split("\n").map((item) => item.trim()).filter(Boolean) }, editing.id);
      setEditing(null); setRefresh((value) => value + 1); setMessage("딜키트를 저장했습니다.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "저장하지 못했습니다."); }
    finally { setSaving(false); }
  }
  const change = (input: Partial<DealKitInput>) => { if (editing) setEditing({ ...editing, input: { ...editing.input, ...input } }); };
  return <Page title="딜키트 관리">
    {!userId ? <Link to="/auth/login">운영자 계정으로 로그인해 주세요.</Link> : !current ? <p role="status">관리 권한과 딜키트를 확인하고 있습니다.</p> : current.error ? <p role="alert">{current.error}</p> : <div className="space-y-5">
      <Link to={`/business/${businessId}`} className="text-sm text-accent">매장으로 →</Link>
      <p className="text-sm">상품종류를 선택하고 우리 매장의 패키지 이름, 실제 제공 서비스, 가격을 등록하세요. 고객은 같은 종류의 매장별 상품을 비교할 수 있습니다.</p>
      {editing ? <form onSubmit={save} className="space-y-4 rounded-2xl border border-page-border p-4"><fieldset disabled={saving} className="space-y-4">
        <legend className="font-bold">{editing.id ? "딜키트 수정" : "패키지 상품 등록"}</legend>
        <ChoiceGroup label="등록할 패키지" value={String(editing.input.template_id ?? "")} required layout="cards" options={current.templates.map(template => ({ value: String(template.id), label: template.title, description: template.description }))} onChange={value => {
          const template = current.templates.find(item => item.id === Number(value));
          if (template) setEditing({ ...editing, input: { ...editing.input, template_id: template.id, title: template.title, description: template.description, type: template.type, purpose: template.purpose }, items: template.items.join("\n") });
        }} />
        <label className="block text-sm">상품명<input className={field} required maxLength={100} value={editing.input.title} onChange={(event) => change({ title: event.target.value })} /></label>
        <label className="block text-sm">설명<textarea className={field} maxLength={3000} value={editing.input.description} onChange={(event) => change({ description: event.target.value })} /></label>
        <label className="block text-sm">패키지 구성 (한 줄에 하나씩, 최소 2개)<textarea className={field} required rows={4} placeholder="커트\n클리닉" value={editing.items} onChange={(event) => setEditing({ ...editing, items: event.target.value })} /></label>
        <p className="text-xs text-page-text">여러 매장 구성은 매장명과 시술명을 함께 입력해 주세요.</p>
        <label className="block text-sm">정상가 (원)<input className={field} type="number" required min={1} max={2147483647} step={1} value={editing.input.original_price || ""} onChange={(event) => change({ original_price: Number(event.target.value) })} /></label>
        <label className="block text-sm">패키지 할인가 (원)<input className={field} type="number" required min={1} max={2147483647} step={1} value={editing.input.price || ""} onChange={(event) => change({ price: Number(event.target.value) })} /></label>
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={editing.input.active} onChange={(event) => change({ active: event.target.checked })} />판매 중 (소비자에게 공개)</label>
        <div className="flex gap-4"><button className="rounded-xl bg-accent px-4 py-3 text-white">{saving ? "저장 중…" : "저장"}</button><button type="button" onClick={() => setEditing(null)}>취소</button></div>
      </fieldset></form> : <><button type="button" onClick={() => { setMessage(""); setEditing({ input: { ...blank }, items: "" }); }} className="rounded-xl bg-accent px-4 py-3 font-bold text-white">패키지 상품 등록</button>
        {current.kits.length ? <ul className="space-y-3">{current.kits.map((kit) => <li key={kit.id} className="space-y-2 rounded-2xl border border-page-border p-4"><h2 className="font-bold">{kit.title}</h2><p className="text-sm">{kit.active ? "판매 중" : "판매 중지"} · 시간제한 없음</p><p className="text-sm">{kit.items.join(" + ")}</p><p>{kit.original_price.toLocaleString()}원 → {kit.price.toLocaleString()}원</p><button type="button" className="text-sm text-accent" onClick={() => { setMessage(""); setEditing({ id: kit.id, input: { template_id: kit.template_id, title: kit.title, description: kit.description, type: kit.type, purpose: kit.purpose, items: kit.items, original_price: kit.original_price, price: kit.price, active: kit.active }, items: kit.items.join("\n") }); }}>구성 · 가격 · 판매 상태 수정</button></li>)}</ul> : <p>등록한 딜키트가 없습니다.</p>}</>}
    </div>}
    {message && <p role="status" className="mt-4 text-sm text-accent">{message}</p>}
  </Page>;
}
