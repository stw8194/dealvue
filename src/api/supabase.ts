import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let supabaseClient: SupabaseClient | null = null;

export const getSupabaseClient = () => {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase 환경변수가 설정되지 않았습니다. VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 확인하세요.",
    );
  }

  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    });
  }

  return supabaseClient;
};

export const supabase = isSupabaseConfigured ? getSupabaseClient() : null;

export const initializeSupabase = async () => {
  if (!isSupabaseConfigured) {
    console.warn("Supabase 연결이 비활성화되었습니다. .env 설정을 확인하세요.");
    return null;
  }

  const client = getSupabaseClient();
  const { error } = await client.auth.getSession();

  if (error) {
    console.error("Supabase 초기 연결 확인 중 오류가 발생했습니다.", error);
  }

  return client;
};
