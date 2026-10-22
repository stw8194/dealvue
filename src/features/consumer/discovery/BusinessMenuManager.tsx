import ChoiceGroup from "@/components/common/ChoiceGroup";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { canManageServiceMenu, deleteServiceMenuCategory, getServiceMenuCategories, saveServiceMenuCategory } from "@/api/salonBooking";
import { readConsumerBusiness, type ConsumerBusiness } from "./business";
import type { ServiceMenuCategory } from "../booking/serviceSelection";
import { Page } from "../ui";

export function BusinessMenuManagementLink({ businessId }: { businessId: number }) {
  const userId = useAuthStore((state) => state.user?.id);
  const [allowed, setAllowed] = useState<string | null>(null);
  const key = `${userId}:${businessId}`;
  useEffect(() => {
    if (!userId) return;
    let current = true;
    canManageServiceMenu(businessId).then((value) => { if (current) setAllowed(value ? key : null); });
    return () => { current = false; };
  }, [businessId, userId, key]);
  return userId && allowed === key ? <div className="flex flex-wrap gap-2"><Link to={`/business/${businessId}/manage-menu`} className="inline-block rounded-xl border border-page-border px-4 py-3 text-sm font-semibold text-accent">매장 시술 카테고리 관리</Link></div> : null;
}

export default function BusinessMenuManager() {
  const { businessId } = useParams();
  const userId = useAuthStore((state) => state.user?.id);
  const [refresh, setRefresh] = useState(0);
  const key = `${businessId}:${userId}:${refresh}`;
  const [result, setResult] = useState<{ key: string; business: ConsumerBusiness | null; categories: ServiceMenuCategory[]; error: string } | null>(null);
  const [editing, setEditing] = useState<{ id?: number; name: string; selection_mode: "single" | "multiple"; sort_order: number; serviceIds: number[] } | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!userId) return;
    let current = true;
    async function load() {
      const id = Number(businessId);
      if (!Number.isSafeInteger(id) || id <= 0) throw new Error("매장 주소를 확인해 주세요.");
      if (!await canManageServiceMenu(id)) throw new Error("이 매장의 운영자만 카테고리를 관리할 수 있습니다.");
      const [business, categories] = await Promise.all([readConsumerBusiness(id), getServiceMenuCategories(id)]);
      if (current) setResult({ key, business, categories, error: "" });
    }
    void load().catch((error: unknown) => { if (current) setResult({ key, business: null, categories: [], error: error instanceof Error ? error.message : "매장 정보를 불러오지 못했습니다." }); });
    return () => { current = false; };
  }, [businessId, userId, key]);
  const current = result?.key === key ? result : null;
  const business = current?.business;
  const save = async (event: FormEvent) => {
    event.preventDefault(); if (!editing || !business || saving) return;
    setSaving(true); setMessage("");
    try { await saveServiceMenuCategory(business.id, editing, editing.serviceIds); setEditing(null); setRefresh((value) => value + 1); setMessage("카테고리를 저장했습니다."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "저장하지 못했습니다."); }
    finally { setSaving(false); }
  };
  const remove = async () => {
    if (!business || deleteId === null || saving) return;
    setSaving(true); setMessage("");
    try { await deleteServiceMenuCategory(business.id, deleteId); setDeleteId(null); setRefresh((value) => value + 1); setMessage("카테고리를 삭제했습니다. 소속 메뉴는 기타 시술에 표시됩니다."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "삭제하지 못했습니다."); }
    finally { setSaving(false); }
  };
  return <Page title="매장 시술 카테고리 관리">
    {!userId ? <Link to="/auth/login" className="text-accent">매장 운영자 계정으로 로그인해 주세요.</Link> : !current ? <p role="status">관리 권한과 메뉴를 확인하고 있어요.</p> : current.error ? <p role="alert">{current.error}</p> : !business ? <p>매장을 찾을 수 없습니다.</p> : <div className="space-y-5">
      <div className="flex items-center justify-between"><h1 className="font-bold">{business.name}</h1><Link to={`/business/${business.id}`} className="text-sm text-accent">매장으로</Link></div>
      <p className="text-sm leading-6 text-page-text">매장에 맞는 카테고리를 만들고 메뉴를 배치하세요. 예약 화면에서는 카테고리마다 라디오 버튼으로 표시되며 메뉴 하나만 선택되고, 다시 누르면 선택이 풀립니다(‘선택 방식’ 값은 현재 예약 화면에는 영향을 주지 않습니다). 커트 메뉴끼리는 카테고리가 달라도 한 가지만 선택됩니다.</p>
      {!editing && <button type="button" onClick={() => { setMessage(""); setEditing({ name: "", selection_mode: "multiple", sort_order: current.categories.length * 10, serviceIds: [] }); }} className="rounded-xl bg-accent px-4 py-3 text-sm font-bold text-white">카테고리 만들기</button>}
      {editing && <form onSubmit={save} className="space-y-4 rounded-2xl border border-page-border p-4"><h2 className="font-bold">{editing.id ? "카테고리 수정" : "새 카테고리"}</h2>
        <label className="block space-y-2 text-sm">카테고리 이름<input required maxLength={50} value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} className="block w-full rounded-xl border border-page-border p-3" /></label>
        <ChoiceGroup<"single" | "multiple"> label="예약 시 선택 방식" value={editing.selection_mode} onChange={value => setEditing({ ...editing, selection_mode: value })} options={[{ value: "single", label: "한 가지 선택" }, { value: "multiple", label: "여러 가지 선택" }]} />
        <label className="block space-y-2 text-sm">표시 순서<input type="number" required min={0} max={10000} step={1} value={editing.sort_order} onChange={(event) => setEditing({ ...editing, sort_order: Number(event.target.value) })} className="block w-full rounded-xl border border-page-border p-3" /></label>
        <fieldset className="space-y-2"><legend className="mb-2 text-sm font-semibold">소속 메뉴</legend><p className="mb-2 text-xs text-page-text">다른 카테고리의 메뉴를 선택하면 이 카테고리로 이동합니다.</p>{business.services.map((service) => <label key={service.id} className="flex items-center gap-2 rounded-xl border border-page-border p-3 text-sm"><input type="checkbox" checked={editing.serviceIds.includes(service.id)} onChange={(event) => setEditing({ ...editing, serviceIds: event.target.checked ? [...editing.serviceIds, service.id] : editing.serviceIds.filter((id) => id !== service.id) })} />{service.name}<span className="ml-auto text-xs text-page-text">{current.categories.find((category) => category.id === service.menu_category_id)?.name ?? "기타 시술"}</span></label>)}</fieldset>
        <div className="flex gap-2"><button disabled={saving} className="rounded-xl bg-accent px-4 py-3 text-sm font-bold text-white disabled:opacity-40">{saving ? "저장 중…" : "카테고리 저장"}</button><button type="button" disabled={saving} onClick={() => setEditing(null)} className="rounded-xl border border-page-border px-4 py-3 text-sm">취소</button></div>
      </form>}
      {!editing && <ul className="space-y-3">{current.categories.map((category) => <li key={category.id} className="space-y-3 rounded-2xl border border-page-border p-4"><h2 className="font-bold">{category.name}</h2><p className="text-xs text-page-text">{category.selection_mode === "single" ? "한 가지 선택" : "여러 가지 선택"} · 메뉴 {business.services.filter((service) => service.menu_category_id === category.id).length}개 · 순서 {category.sort_order}</p><div className="flex gap-4 text-sm"><button type="button" onClick={() => { setDeleteId(null); setEditing({ ...category, serviceIds: business.services.filter((service) => service.menu_category_id === category.id).map((service) => service.id) }); }} className="text-accent">수정</button><button type="button" onClick={() => setDeleteId(category.id)} className="text-page-text">삭제</button></div>{deleteId === category.id && <div className="space-y-2 rounded-xl bg-gray-50 p-3 text-sm"><p>카테고리만 삭제합니다. 메뉴는 삭제되지 않고 기타 시술로 이동합니다.</p><button type="button" disabled={saving} onClick={() => void remove()} className="mr-4 text-red-600">카테고리 삭제 확인</button><button type="button" disabled={saving} onClick={() => setDeleteId(null)}>취소</button></div>}</li>)}</ul>}
      {message && <p role="status" className="text-sm text-accent">{message}</p>}
    </div>}
  </Page>;
}
