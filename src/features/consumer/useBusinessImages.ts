import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/api/supabase";
import { resolveBusinessImage } from "./businessImages";

/** Load each shop's representative image in one request, including old history entries. */
export function useBusinessImages(ids: number[]) {
  const key = [...new Set(ids)].sort((a, b) => a - b).join(",");
  const [images, setImages] = useState<Record<number, string>>({});
  useEffect(() => {
    if (!key) return;
    let current = true;
    void (async () => {
      const { data, error } = await getSupabaseClient().from("business_images")
        .select("business_id, img_url").in("business_id", key.split(",").map(Number));
      if (error || !current) return;
      const next: Record<number, string> = {};
      for (const row of data ?? []) {
        const url = resolveBusinessImage(row.img_url);
        if (url && !next[row.business_id]) next[row.business_id] = url;
      }
      setImages(next);
    })().catch(() => { /* The image fallback preserves access to the shop. */ });
    return () => { current = false; };
  }, [key]);
  return images;
}
