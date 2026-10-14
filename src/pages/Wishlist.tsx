import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getSupabaseClient } from "@/api/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { useConsumerCatalog } from "@/features/consumer/catalog";
import { usePreviewStore } from "@/features/consumer/preview";
import { DealCard } from "@/features/consumer/discovery/DealCard";
import { useDiscoveryFavorites } from "@/features/consumer/discovery/favorites";
import { EmptyState, Page } from "@/features/consumer/ui";

function PreviewWishlist() {
  const [tab, setTab] = useState<"deal" | "business">("deal");
  const { deals, loading, error } = useConsumerCatalog();
  const dealIds = useDiscoveryFavorites((state) => state.dealIds);
  const businessIds = useDiscoveryFavorites((state) => state.businessIds);
  const toggleBusiness = useDiscoveryFavorites((state) => state.toggleBusiness);
  const likedDeals = deals.filter((deal) => dealIds.includes(deal.id));
  const businesses = [...new Map(deals.filter((deal) => businessIds.includes(deal.businessId)).map((deal) => [deal.businessId, deal])).values()];
  return (
    <div className="space-y-4">
      <div className="flex gap-2" role="group" aria-label="찜 종류">
        <button type="button" aria-pressed={tab === "deal"} onClick={() => setTab("deal")} className={`flex-1 rounded-lg border p-3 text-sm ${tab === "deal" ? "border-accent text-accent" : "border-page-border"}`}>타임딜 {likedDeals.length}</button>
        <button type="button" aria-pressed={tab === "business"} onClick={() => setTab("business")} className={`flex-1 rounded-lg border p-3 text-sm ${tab === "business" ? "border-accent text-accent" : "border-page-border"}`}>매장 {businesses.length}</button>
      </div>
      <p className="text-xs text-page-text">미리보기에서 찜한 항목은 이 브라우저에 저장됩니다.</p>
      {loading ? <p role="status">찜한 항목을 불러오는 중입니다.</p> : error ? <EmptyState title="찜한 항목을 불러오지 못했습니다" description={error} /> : tab === "deal" ? likedDeals.length ? <div className="space-y-3">{likedDeals.map((deal) => <DealCard key={deal.id} deal={deal} />)}</div> : <EmptyState title="찜한 타임딜이 없습니다" description="마음에 드는 시술의 하트를 눌러보세요." action={<Link to="/search" className="text-accent">타임딜 찾아보기</Link>} /> : businesses.length ? <ul className="space-y-3">{businesses.map((business) => <li key={business.businessId} className="rounded-xl border border-page-border p-4"><Link to={`/business/${business.businessId}`} className="block"><h2 className="font-semibold">{business.businessName}</h2><p className="mt-1 text-sm text-page-text">{business.address}</p></Link><button type="button" onClick={() => toggleBusiness(business.businessId)} className="mt-3 text-sm text-accent">매장 찜 해제</button></li>)}</ul> : <EmptyState title="찜한 매장이 없습니다" description="매장 상세에서 찜한 매장을 모아볼 수 있습니다." action={<Link to="/search" className="text-accent">매장 찾아보기</Link>} />}
    </div>
  );
}

type LikedBusiness = { id: number; name: string; address: string };

function LiveWishlist({ userId }: { userId: string }) {
  const [result, setResult] = useState<{ businesses: LikedBusiness[]; error: string | null } | null>(null);
  useEffect(() => {
    let current = true;
    async function load() {
      const client = getSupabaseClient();
      const { data, error } = await client.from("user_liked").select("business_id").eq("user_id", userId).order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      const ids = [...new Set((data ?? []).map((row) => row.business_id as number | null).filter((id): id is number => id !== null))];
      if (!ids.length) return [];
      const { data: businesses, error: businessError } = await client.from("businesses").select("id, name, address").in("id", ids);
      if (businessError) throw new Error(businessError.message);
      return (businesses ?? []) as LikedBusiness[];
    }
    load().then((businesses) => { if (current) setResult({ businesses, error: null }); }).catch((error: unknown) => { if (current) setResult({ businesses: [], error: error instanceof Error ? error.message : "찜 목록을 불러오지 못했습니다." }); });
    return () => { current = false; };
  }, [userId]);
  if (!result) return <p role="status">찜한 매장을 불러오는 중입니다.</p>;
  if (result.error) return <EmptyState title="찜 목록을 불러오지 못했습니다" description={result.error} action={<button type="button" onClick={() => window.location.reload()} className="text-accent">다시 시도</button>} />;
  return <div className="space-y-4"><p className="text-sm text-page-text">저장된 매장 찜을 조회할 수 있습니다. 타임딜 찜과 찜 추가 · 해제 기능은 준비 중입니다.</p>{result.businesses.length ? <ul className="space-y-3">{result.businesses.map((business) => <li key={business.id}><Link to={`/business/${business.id}`} className="block rounded-xl border border-page-border p-4"><h2 className="font-semibold">{business.name}</h2><p className="mt-1 text-sm text-page-text">{business.address}</p><span className="mt-2 inline-block text-sm text-accent">매장 보기 →</span></Link></li>)}</ul> : <EmptyState title="찜한 매장이 없습니다" action={<Link to="/search" className="text-accent">매장 찾아보기</Link>} />}</div>;
}

export default function Wishlist() {
  const preview = usePreviewStore((state) => state.enabled);
  const user = useAuthStore((state) => state.user);
  return <Page title="찜">{preview ? <PreviewWishlist /> : user ? <LiveWishlist key={user.id} userId={user.id} /> : <EmptyState title="로그인 후 찜 목록을 확인하세요" action={<Link to="/auth/login" className="text-accent">로그인</Link>} />}</Page>;
}
