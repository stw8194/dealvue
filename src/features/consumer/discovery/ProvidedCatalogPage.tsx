import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { getSupabaseClient } from "@/api/supabase";
import { EmptyState, Page } from "../ui";

// Old shared links resolve into the same store pages and real database IDs.
export default function ProvidedCatalogRedirect() {
  const { slug } = useParams();
  const [result, setResult] = useState<{ id: number | null; error: string | null } | null>(null);
  useEffect(() => {
    if (!slug) return;
    let current = true;
    getSupabaseClient().from("businesses").select("id").eq("source_key", "provided:" + slug).maybeSingle().then(({ data, error }) => {
      if (current) setResult({ id: data?.id ?? null, error: error?.message ?? null });
    });
    return () => { current = false; };
  }, [slug]);
  if (!slug) return <Navigate to="/businesses" replace />;
  if (!result) return <Page title="매장 상세"><p role="status">매장 정보를 불러오는 중입니다.</p></Page>;
  if (result.id) return <Navigate to={"/business/" + result.id} replace />;
  return <Page title="매장 상세"><EmptyState title="매장을 찾을 수 없습니다" description={result.error ?? undefined} /></Page>;
}
