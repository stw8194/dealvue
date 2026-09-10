import type { Provider, Session } from "@supabase/supabase-js";
import type { LoginForm, RegisterForm, User } from "@/type/auth";
import { getSupabaseClient, isSupabaseConfigured } from "./supabase";

export type SocialLoginProvider = Extract<
  Provider,
  "google" | "kakao" | `custom:${string}`
>;

interface UserProfileRow {
  id: string;
  email: string | null;
  nickname: string;
  level: number;
  total_saved_amount: number;
}

function getOAuthRedirectUrl() {
  return `${window.location.origin}/auth/callback`;
}

function getNestedString(value: unknown, keys: string[]) {
  let current: unknown = value;

  for (const key of keys) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }

  return typeof current === "string" && current.trim()
    ? current.trim()
    : undefined;
}

function getSessionNickname(session: Session) {
  const metadata = session.user.user_metadata;

  return (
    getNestedString(metadata, ["nickname"]) ??
    getNestedString(metadata, ["name"]) ??
    getNestedString(metadata, ["full_name"]) ??
    getNestedString(metadata, ["preferred_username"]) ??
    getNestedString(metadata, ["properties", "nickname"]) ??
    getNestedString(metadata, ["kakao_account", "profile", "nickname"]) ??
    session.user.email?.split("@")[0] ??
    "user"
  );
}

function mapSupabaseSessionToUser(
  session: Session,
  profile?: UserProfileRow | null,
): User {
  return {
    id: session.user.id,
    email: profile?.email ?? session.user.email ?? "",
    nickname: profile?.nickname ?? getSessionNickname(session),
    profileImage: null,
    level: profile?.level ?? 1,
    totalSavedAmount: profile?.total_saved_amount ?? 0,
  };
}

async function getUserFromSession(session: Session) {
  const supabase = getSupabaseClient();
  const fallbackUser = mapSupabaseSessionToUser(session);
  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, email, nickname, level, total_saved_amount")
    .eq("id", session.user.id)
    .maybeSingle<UserProfileRow>();

  if (error) {
    console.error("사용자 프로필을 불러오지 못했습니다.", error);
    return fallbackUser;
  }

  if (data) return mapSupabaseSessionToUser(session, data);

  const { data: createdProfile, error: createError } = await supabase
    .from("user_profiles")
    .upsert(
      {
        id: session.user.id,
        email: session.user.email ?? null,
        nickname: getSessionNickname(session),
      },
      { onConflict: "id" },
    )
    .select("id, email, nickname, level, total_saved_amount")
    .single<UserProfileRow>();

  if (createError) {
    console.error("사용자 프로필을 저장하지 못했습니다.", createError);
    return fallbackUser;
  }

  return mapSupabaseSessionToUser(session, createdProfile);
}

function getSocialLoginScopes(provider: SocialLoginProvider) {
  if (provider === "kakao" || provider === "custom:kakao") {
    return "profile_nickname";
  }

  if (provider === "google") {
    return "email profile";
  }

  return undefined;
}

function getAuthErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;

  if (error.message.includes("Invalid login credentials")) {
    return "비밀번호를 확인해 주세요.";
  }

  if (error.message.includes("Email not confirmed")) {
    return fallback;
  }

  if (error.message.includes("User already registered")) {
    return "이미 가입된 이메일입니다.";
  }

  return error.message || fallback;
}

export async function requestLogin(form: LoginForm) {
  const supabase = getSupabaseClient();
  const email = form.email.trim().toLowerCase();
  const { data: isRegistered, error: lookupError } = await supabase.rpc(
    "is_email_registered",
    { email_to_check: email },
  );

  if (lookupError) {
    throw new Error("이메일 가입 여부를 확인하지 못했습니다.");
  }
  if (!isRegistered) {
    throw new Error("가입되지 않은 이메일입니다.");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: form.password,
  });

  if (error) {
    throw new Error(getAuthErrorMessage(error, "로그인에 실패했습니다."));
  }
  if (!data.session) throw new Error("로그인 세션을 만들지 못했습니다.");

  sessionStorage.setItem("userToken", data.session.access_token);
  return getUserFromSession(data.session);
}

export async function requestRegister(
  form: RegisterForm,
) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email: form.email.trim(),
    password: form.password,
    options: {
      data: {
        nickname: form.nickname.trim(),
      },
    },
  });

  if (error) {
    throw new Error(getAuthErrorMessage(error, "회원가입에 실패했습니다."));
  }
  if (!data.user) throw new Error("회원 정보를 만들지 못했습니다.");
  if (data.user.identities?.length === 0) {
    throw new Error("이미 가입된 이메일입니다.");
  }

  if (!data.session) {
    throw new Error("회원가입에 실패했습니다. 잠시 후 다시 시도해 주세요.");
  }

  sessionStorage.setItem("userToken", data.session.access_token);
  return getUserFromSession(data.session);
}

export async function requestMe() {
  if (!isSupabaseConfigured) return undefined;

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!data.session) return undefined;

    sessionStorage.setItem("userToken", data.session.access_token);
    return await getUserFromSession(data.session);
  } catch (error) {
    console.error("로그인 정보를 확인하지 못했습니다.", error);
    return undefined;
  }
}

export async function requestLogout() {
  sessionStorage.removeItem("userToken");
  if (isSupabaseConfigured) {
    await getSupabaseClient().auth.signOut();
  }
}

export async function requestSocialLogin(provider: SocialLoginProvider) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: getOAuthRedirectUrl(),
      scopes: getSocialLoginScopes(provider),
    },
  });

  if (error) throw error;
}

export async function handleSocialLoginCallback() {
  const supabase = getSupabaseClient();
  const code = new URLSearchParams(window.location.search).get("code");

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session) throw new Error("로그인 세션을 만들지 못했습니다.");

  sessionStorage.setItem("userToken", data.session.access_token);
  return getUserFromSession(data.session);
}
