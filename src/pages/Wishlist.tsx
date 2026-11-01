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
import { isOpenDeal, useDealTime } from "@/features/consumer/dealTiming";
import { saveReturnPath } from "@/features/consumer/auth/loginReturn";
import { EmptyState, Page } from "@/features/consumer/ui";

type LikedBusiness = { id: number; name: string; address: string };
type AccountLikes = { userId: string | null; businesses: LikedBusiness[]; error: string | null };

export default function Wishlist() {
  const now = useDealTime();
  const userId = useAuthStore(state => state.user?.id ?? null);
  const initialized = useAuthStore(state => state.initialized);
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

  if (!initialized) return <Page title="찜 목록"><p role="status" className="py-6 text-sm">로그인 상태를 확인하고 있어요.</p></Page>;

  return <Page title="찜 목록"><div className="wishlist-page space-y-4">
    <div className="wishlist-tabs flex gap-2" role="group" aria-label="찜 종류">
      <button type="button" aria-pressed={tab === "deal"} onClick={() => setTab("deal")} className={`flex-1 rounded-lg border p-3 text-sm ${tab === "deal" ? "border-accent text-accent" : "border-page-border"}`}>타임딜 {likedDeals.length}</button>
      <button type="button" aria-pressed={tab === "business"} onClick={() => setTab("business")} className={`flex-1 rounded-lg border p-3 text-sm ${tab === "business" ? "border-accent text-accent" : "border-page-border"}`}>매장 {businesses.length}</button>
    </div>
    {!userId && <div className="flex items-center justify-between gap-3 rounded-xl border border-page-border bg-white px-4 py-3 shadow-sm"><div><p className="text-[12px] font-bold text-page-heading">로그인하고 예약과 혜택 누리기</p><p className="mt-1 text-[10px] text-gray-400">마음에 드는 매장을 예약하고 쿠폰 혜택도 받아보세요.</p></div><Link to="/auth/login" onClick={() => saveReturnPath("/wishlist")} className="shrink-0 rounded-full bg-accent px-3 py-1.5 text-[10px] font-semibold text-white">로그인</Link></div>}
    {tab === "deal" ? loading ? <p role="status">찜한 타임딜을 불러오는 중입니다.</p>
      : error ? <EmptyState title="찜한 타임딜을 불러오지 못했습니다" description={error} />
      : likedDeals.length ? <div className="space-y-3">{likedDeals.map(deal => <DealCard key={deal.id} deal={deal} />)}</div>
      : <EmptyState title="찜한 타임딜이 없습니다" description="마음에 드는 시술의 하트를 눌러보세요." action={<Link to="/search" className="text-accent">타임딜 찾아보기</Link>} />
      : <>
        {(accountError || error) && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">일부 찜한 매장을 불러오지 못했습니다. 새로고침 후 다시 확인해 주세요.</p>}
        {actionError && <p role="alert" className="text-sm text-rose-700">{actionError}</p>}
        {businesses.length ? <ul className="space-y-3">{businesses.map(shop => <li key={shop.id}>
          <article className="relative flex gap-3 rounded-2xl border border-page-border bg-white p-3 shadow-[0_2px_6px_rgb(32_38_50/4%)]">
            <Link to={`/business/${shop.id}`} className="w-[104px] shrink-0"><BusinessImage src={images[shop.id] ?? deals.find(deal => deal.businessId === shop.id)?.imageUrl} className="h-[120px] w-full rounded-xl" /></Link>
            <Link to={`/business/${shop.id}`} className="min-w-0 flex-1 py-1">
              <p className="text-[10px] text-gray-400">뷰티 매장</p>
              <h2 className="mt-1 line-clamp-2 pr-6 text-[14px] font-bold text-page-heading">{shop.name}</h2>
              <p className="mt-2 flex items-start gap-1 text-[10px] leading-4 text-gray-400"><MapPin size={11} className="mt-0.5 shrink-0" />{businessAddress(shop.address) || "주소 정보 준비 중"}</p>
              <span className="mt-3 inline-block rounded-full bg-accent px-3 py-1.5 text-[10px] font-semibold text-white">매장 둘러보기</span>
            </Link>
            <button type="button" aria-label={`${shop.name} 찜 해제`} aria-pressed="true" disabled={pendingId !== null} onClick={() => void removeBusiness(shop.id)} className="absolute right-2.5 top-2.5 p-1 text-accent disabled:opacity-50"><Heart size={19} strokeWidth={1.7} fill="currentColor" /></button>
          </article>
        </li>)}</ul>
          : loading || accountLoading ? <p role="status">찜한 매장을 불러오는 중입니다.</p>
          : !accountError && !error && <EmptyState title="찜한 매장이 없습니다" description="매장 상세에서 마음에 드는 매장의 하트를 눌러보세요." action={<Link to="/search" className="text-accent">매장 찾아보기</Link>} />}
      </>}
    {!loading && !error && <section className="pt-5"><div className="mb-3 flex items-center justify-between"><h2 className="text-[15px] font-bold text-page-heading">지금 만날 수 있는 매장</h2><Link to="/search" className="text-[11px] text-accent">전체보기 ›</Link></div><div className="grid grid-cols-3 gap-2">{[...new Map(deals.filter(deal => isOpenDeal(deal, now)).map(deal => [deal.businessId, deal])).values()].slice(0,3).map(deal => <Link key={deal.businessId} to={`/business/${deal.businessId}`} className="overflow-hidden rounded-xl border border-page-border bg-white"><BusinessImage src={deal.imageUrl} className="aspect-[1.2] w-full" /><div className="p-2"><h3 className="truncate text-[10px] font-semibold text-page-heading">{deal.businessName}</h3><p className="mt-1 text-[10px] font-bold text-accent">{deal.price.toLocaleString()}원~</p></div></Link>)}</div></section>}
  </div></Page>;
}
