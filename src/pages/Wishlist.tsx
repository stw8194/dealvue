import { useEffect, useState } from "react";
import { Heart, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { getSupabaseClient } from "@/api/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { useConsumerCatalog } from "@/features/consumer/catalog";
import { DealCard } from "@/features/consumer/discovery/DealCard";
import { useDiscoveryFavorites } from "@/features/consumer/discovery/favorites";
import { useBusinessImages } from "@/features/consumer/useBusinessImages";
import BusinessImage from "@/components/common/BusinessImage";
import { businessAddress } from "@/features/consumer/businessAddress";
import { EmptyState, Page } from "@/features/consumer/ui";

type LikedBusiness = { id: number; name: string; address: string };
type AccountLikes = { userId: string | null; businesses: LikedBusiness[]; error: string | null };

export default function Wishlist() {
  const userId = useAuthStore(state => state.user?.id ?? null);
  const [tab, setTab] = useState<"deal" | "business">("deal");
  const { deals, loading, error } = useConsumerCatalog();
  const dealIds = useDiscoveryFavorites(state => state.dealIds);
  const businessIds = useDiscoveryFavorites(state => state.businessIds);
  const toggleBusiness = useDiscoveryFavorites(state => state.toggleBusiness);
  const [account, setAccount] = useState<AccountLikes | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  useEffect(() => {
    if (!userId) return;
    let current = true;
    async function load() {
      const client = getSupabaseClient();
      const { data, error } = await client.from("user_liked").select("business_id")
        .eq("user_id", userId).order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      const ids = [...new Set((data ?? []).flatMap(row => row.business_id == null ? [] : [Number(row.business_id)]))];
      if (!ids.length) return [];
      const { data: businesses, error: businessError } = await client.from("businesses")
        .select("id, name, address").in("id", ids);
      if (businessError) throw new Error(businessError.message);
      return (businesses ?? []) as LikedBusiness[];
    }
    void load().then(businesses => {
      if (current) setAccount({ userId, businesses, error: null });
    }).catch((error: unknown) => {
      if (current) setAccount({ userId, businesses: [], error: error instanceof Error ? error.message : "계정의 찜 목록을 불러오지 못했습니다." });
    });
    return () => { current = false; };
  }, [userId]);

  // Account and device likes form one list and one empty state. Never show another account's cached result.
  const accountBusinesses = userId && account?.userId === userId ? account.businesses : [];
  const accountError = userId && account?.userId === userId ? account.error : null;
  const accountLoading = !!userId && account?.userId !== userId;
  const localBusinesses = deals.filter(deal => businessIds.includes(deal.businessId))
    .map(deal => ({ id: deal.businessId, name: deal.businessName, address: deal.address }));
  const businesses = [...new Map([...localBusinesses, ...accountBusinesses].map(shop => [shop.id, shop])).values()];
  const images = useBusinessImages(businesses.map(shop => shop.id));
  const likedDeals = deals.filter(deal => dealIds.includes(deal.id));

  async function removeBusiness(id: number) {
    if (pendingId !== null) return;
    setPendingId(id);
    setActionError(null);
    try {
      if (userId && accountBusinesses.some(shop => shop.id === id)) {
        const { error } = await getSupabaseClient().from("user_liked").delete()
          .eq("user_id", userId).eq("business_id", id);
        if (error) throw new Error(error.message);
        setAccount(current => current?.userId === userId ? { ...current, businesses: current.businesses.filter(shop => shop.id !== id) } : current);
      }
      if (businessIds.includes(id)) toggleBusiness(id);
    } catch {
      setActionError("찜을 해제하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setPendingId(null);
    }
  }

  return <Page title="찜"><div className="space-y-4">
    <div className="flex gap-2" role="group" aria-label="찜 종류">
      <button type="button" aria-pressed={tab === "deal"} onClick={() => setTab("deal")} className={`flex-1 rounded-lg border p-3 text-sm ${tab === "deal" ? "border-accent text-accent" : "border-page-border"}`}>타임딜 {likedDeals.length}</button>
      <button type="button" aria-pressed={tab === "business"} onClick={() => setTab("business")} className={`flex-1 rounded-lg border p-3 text-sm ${tab === "business" ? "border-accent text-accent" : "border-page-border"}`}>매장 {businesses.length}</button>
    </div>
    <p className="text-xs text-page-text">마음에 드는 타임딜과 매장을 모아보세요.</p>
    {tab === "deal" ? loading ? <p role="status">찜한 타임딜을 불러오는 중입니다.</p>
      : error ? <EmptyState title="찜한 타임딜을 불러오지 못했습니다" description={error} />
      : likedDeals.length ? <div className="space-y-3">{likedDeals.map(deal => <DealCard key={deal.id} deal={deal} />)}</div>
      : <EmptyState title="찜한 타임딜이 없습니다" description="마음에 드는 시술의 하트를 눌러보세요." action={<Link to="/search" className="text-accent">타임딜 찾아보기</Link>} />
      : <>
        {(accountError || error) && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">일부 찜한 매장을 불러오지 못했습니다. 새로고침 후 다시 확인해 주세요.</p>}
        {actionError && <p role="alert" className="text-sm text-rose-700">{actionError}</p>}
        {businesses.length ? <ul className="space-y-3">{businesses.map(shop => <li key={shop.id}>
          <article className="rounded-xl border border-page-border bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <Link to={`/business/${shop.id}`} className="text-sm text-page-text underline underline-offset-4">{shop.name}</Link>
              <button type="button" aria-label={`${shop.name} 찜 해제`} aria-pressed="true" disabled={pendingId !== null} onClick={() => void removeBusiness(shop.id)} className="shrink-0 rounded-lg p-2 text-accent disabled:opacity-50"><Heart size={20} fill="currentColor" /></button>
            </div>
            <Link to={`/business/${shop.id}`} className="mt-2 block space-y-2">
              <BusinessImage src={images[shop.id] ?? deals.find(deal => deal.businessId === shop.id)?.imageUrl} className="h-36 w-full rounded-lg" />
              <p className="text-xs text-page-text">뷰티 매장</p>
              <h2 className="font-bold text-page-heading">{shop.name}</h2>
              <p className="flex items-start gap-1 text-sm text-page-text"><MapPin size={15} className="mt-0.5 shrink-0" />{businessAddress(shop.address) || "주소 정보 준비 중"}</p>
              <span className="inline-block text-sm font-semibold text-accent">매장 · 시술 둘러보기 →</span>
            </Link>
          </article>
        </li>)}</ul>
          : loading || accountLoading ? <p role="status">찜한 매장을 불러오는 중입니다.</p>
          : !accountError && !error && <EmptyState title="찜한 매장이 없습니다" description="매장 상세에서 마음에 드는 매장의 하트를 눌러보세요." action={<Link to="/search" className="text-accent">매장 찾아보기</Link>} />}
      </>}
  </div></Page>;
}
