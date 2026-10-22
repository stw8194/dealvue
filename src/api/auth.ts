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
  name: string | null;
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
    nickname: profile?.name ?? getSessionNickname(session),
    profileImage: null,
    level: 1,
    totalSavedAmount: 0,
  };
}

export async function getUserFromSession(session: Session) {
  const supabase = getSupabaseClient();
  const fallbackUser = mapSupabaseSessionToUser(session);
  const { data, error } = await supabase
    .from("users")
    .select("id, email, name")
    .eq("id", session.user.id)
    .maybeSingle<UserProfileRow>();

  if (error) {
    console.error("사용자 프로필을 불러오지 못했습니다.", error);
    return fallbackUser;
  }

  return data ? mapSupabaseSessionToUser(session, data) : fallbackUser;
}

function getSocialLoginScopes(provider: SocialLoginProvider) {
  if (provider === "custom:kakao") {
    return "openid profile_nickname";
  }

  if (provider === "kakao") {
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
    return "이메일 또는 비밀번호를 확인해 주세요.";
  }

  if (error.message.includes("Email not confirmed")) {
    return "받으신 이메일에서 인증을 완료한 뒤 로그인해 주세요.";
  }

  if (error.message.includes("User already registered")) {
    return "이미 가입된 이메일입니다.";
  }

  return error.message || fallback;
}

export async function requestLogin(form: LoginForm) {
  const supabase = getSupabaseClient();
  const email = form.email.trim().toLowerCase();
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
    return null;
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
  if (isSupabaseConfigured) {
    const { error } = await getSupabaseClient().auth.signOut();
    if (error) throw error;
  }
  sessionStorage.removeItem("userToken");
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
  // detectSessionInUrl owns the callback, including PKCE code exchange. Repeating
  // the exchange here can consume the same one-use code twice (also in StrictMode).
  // getSession() waits for initialization but does not propagate its OAuth errors.
  const { error: callbackError } = await supabase.auth.initialize();
  if (callbackError) throw callbackError;

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session) throw new Error("로그인 결과를 확인할 수 없습니다. 로그인을 시작한 브라우저와 주소에서 다시 시도해 주세요.");

  sessionStorage.setItem("userToken", data.session.access_token);
  return getUserFromSession(data.session);
}
