import { getSupabaseClient } from "@/api/supabase";

export function resolveBusinessImage(path: string | null | undefined): string | null {
  const value = path?.trim();
  if (!value) return null;
  if (/^(https?:|data:|blob:)/i.test(value) || (value.startsWith("/") && !value.startsWith("//"))) return value;
  return getSupabaseClient().storage
    .from(import.meta.env.VITE_SUPABASE_BUSINESS_IMAGES_BUCKET ?? "businesses")
    .getPublicUrl(value).data.publicUrl;
}
