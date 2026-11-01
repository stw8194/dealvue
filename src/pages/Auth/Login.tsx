import { useState } from "react";
import { ChevronLeft, LockKeyhole, Mail } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import {
  requestLogin,
  requestSocialLogin,
  type SocialLoginProvider,
} from "@/api/auth";
import kakaoIcon from "@/assets/icons/kakao.png";
import googleIcon from "@/assets/icons/google.png";
import logoUrl from "@/assets/logo.svg";
import { useForm, useWatch } from "react-hook-form";
import type { LoginForm } from "@/type/auth";
import { useAuthStore } from "@/store/useAuthStore";
import { hasPendingReturn } from "@/features/consumer/auth/loginReturn";

const LOGIN_OPTIONS: {
  label: string;
  className: string;
  iconSrc: string;
  iconAlt: string;
  provider: SocialLoginProvider;
}[] = [
  {
    label: "카카오로 로그인하기",
    className: "border-[#f2d84c] bg-[#fee500] text-[#191600]",
    iconSrc: kakaoIcon,
    iconAlt: "",
    provider: "custom:kakao",
  },
  {
    label: "구글로 로그인하기",
    className: "border-page-border bg-white text-page-heading",
    iconSrc: googleIcon,
    iconAlt: "",
    provider: "google",
  },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const navigate = useNavigate();
  const [emailMode, setEmailMode] = useState(false);
  const setUser = useAuthStore((state) => state.setUser);
  const [pendingProvider, setPendingProvider] =
    useState<SocialLoginProvider | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isEmailLoginLoading, setIsEmailLoginLoading] = useState(false);
  const [bookingPending] = useState(hasPendingReturn);

  const handleSocialLogin = async (provider: SocialLoginProvider) => {
    try {
      setErrorMessage("");
      setPendingProvider(provider);
      await requestSocialLogin(provider);
    } catch (err) {
      setPendingProvider(null);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "소셜 로그인을 시작하지 못했습니다.",
      );
    }
  };

  const {
    register,
    handleSubmit,
    getValues,
    control,
    formState: { errors },
  } = useForm<LoginForm>({
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
    },
  });
  const [email, password] = useWatch({
    control,
    name: ["email", "password"],
  });
  const canSubmitEmailLogin =
    EMAIL_PATTERN.test(email) &&
    password.length >= 6 &&
    !isEmailLoginLoading;

  const onSubmit = async () => {
    if (!canSubmitEmailLogin) return;

    try {
      setErrorMessage("");
      setIsEmailLoginLoading(true);
      const { email, password } = getValues();
      const user = await requestLogin({ email, password });
      setUser(user);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "로그인에 실패했습니다.",
      );
    } finally {
      setIsEmailLoginLoading(false);
    }
  };

  return (
    <section className="auth-login flex min-h-dvh flex-col px-6 pb-8 text-page-heading">
      <header className="relative -mx-2 flex h-14 shrink-0 items-center gap-2">
        <button type="button" aria-label="뒤로 가기" onClick={() => emailMode ? setEmailMode(false) : navigate(-1)} className="grid h-9 w-9 place-items-center"><ChevronLeft size={23} strokeWidth={1.8} /></button>
        <h1 className="text-[16px] font-bold">로그인</h1>
      </header>
      {emailMode ? <div className="mb-7 mt-9"><img src={logoUrl} alt="DEALVUE" className="h-8 w-auto" /><p className="mt-2 text-[12px] text-gray-400">가치는 그대로, 가격은 최적화</p></div>
        : <div className="mb-9 mt-12 text-center"><img src="/images/brand/dealvue-symbol.jpeg" alt="" className="mx-auto h-24 w-24 object-contain mix-blend-multiply" /><h2 className="mt-5 text-[22px] font-bold">딜뷰에 오신 걸 환영해요</h2><p className="mt-2 text-[12px] text-gray-400">로그인하고 뷰티 타임딜을 즐겨보세요</p></div>}
      {bookingPending && <p role="status" className="mb-5 rounded-xl bg-[#fff4f8] px-4 py-3 text-[12px] leading-5 text-accent">계속하려면 로그인이 필요합니다.<br />로그인 후 이전 화면으로 돌아가요.</p>}
      {emailMode && <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <label className="block text-[12px] font-medium">이메일
          <input {...register("email", { required: "이메일을 입력해 주세요.", pattern: { value: EMAIL_PATTERN, message: "올바른 이메일 형식으로 입력해 주세요." }, onChange: () => setErrorMessage("") })} type="email" autoComplete="email" className="mt-2 h-12 w-full rounded-xl border border-page-border bg-white px-4 text-[13px] font-normal outline-none placeholder:text-gray-400 focus:border-accent" placeholder="이메일을 입력해주세요" />
          {errors.email?.message && <span className="mt-1 block text-[11px] text-rose-600">{errors.email.message}</span>}
        </label>
        <label className="block text-[12px] font-medium">비밀번호
          <input {...register("password", { required: "비밀번호를 입력해 주세요.", minLength: { value: 6, message: "비밀번호는 6자 이상 입력해 주세요." }, onChange: () => setErrorMessage("") })} type="password" autoComplete="current-password" className="mt-2 h-12 w-full rounded-xl border border-page-border bg-white px-4 text-[13px] font-normal outline-none placeholder:text-gray-400 focus:border-accent" placeholder="비밀번호를 입력해주세요" />
          {errors.password?.message && <span className="mt-1 block text-[11px] text-rose-600">{errors.password.message}</span>}
        </label>
        <button type="submit" disabled={!canSubmitEmailLogin} className="mt-3 flex h-12 w-full items-center justify-center rounded-xl bg-accent text-[14px] font-bold text-white disabled:opacity-40">{isEmailLoginLoading ? "로그인하는 중…" : "로그인"}</button>
      </form>}
      {errorMessage && <p role="alert" className="my-3 rounded-lg bg-rose-50 p-3 text-[12px] text-rose-600">{errorMessage}</p>}
      {emailMode && <div className="my-6 flex items-center gap-3 text-[10px] text-gray-400"><span className="h-px flex-1 bg-page-border" />간편 로그인<span className="h-px flex-1 bg-page-border" /></div>}
      <div className="space-y-3">
        {LOGIN_OPTIONS.map(option => <button key={option.provider} type="button" disabled={Boolean(pendingProvider)} onClick={() => void handleSocialLogin(option.provider)} className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl border text-[13px] font-bold transition hover:brightness-95 disabled:opacity-60 ${option.className}`}><img src={option.iconSrc} alt="" className="h-5 w-5 object-contain" />{pendingProvider === option.provider ? "연결하는 중…" : option.label}</button>)}
      </div>
      {!emailMode && <><div className="my-6 flex items-center gap-3 text-[10px] text-gray-300"><span className="h-px flex-1 bg-page-border" />또는<span className="h-px flex-1 bg-page-border" /></div><button type="button" onClick={() => setEmailMode(true)} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-accent text-[13px] font-semibold text-accent"><Mail size={17} />이메일로 로그인</button></>}
      <p className="mt-6 text-center text-[12px] text-gray-400">계정이 없으신가요? <Link to="/auth/register" className="ml-1 font-semibold text-accent">회원가입</Link></p>
      <div className="mt-auto pt-12"><p className="flex items-center justify-center gap-2 rounded-xl border border-page-border bg-[#fafbfc] px-3 py-4 text-[11px] text-page-text"><LockKeyhole size={13} />로그인하면 더 많은 혜택을 받을 수 있어요</p></div>
    </section>
  );
}
