import { useState } from "react";
import { ChevronLeft, Mail } from "lucide-react";
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
    <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[480px] flex-col px-6 pb-32 pt-6">
      <button
        type="button"
        aria-label="뒤로 가기"
        onClick={() => navigate(-1)}
        className="grid h-10 w-10 place-items-center text-page-heading"
      >
        <ChevronLeft size={30} strokeWidth={2.4} />
      </button>

      <div className="mt-24">
        <img src={logoUrl} alt="DEALVUE" className="h-12 w-auto" />
        <p className="mt-2 text-sm font-bold text-gray-400">
          가치는 그대로, 가격은 최적화
        </p>
      </div>
      {bookingPending && (
        <p role="status" className="mt-8 rounded-2xl bg-accent/10 px-4 py-3 text-sm font-semibold text-accent">
          예약하려면 로그인이 필요합니다. 로그인하면 예약 화면으로 돌아가요.
        </p>
      )}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid gap-3 mt-12  w-full mb-5"
      >
        <p className="flex items-center gap-2">
          <span>이메일</span>
          {errors.email?.message && (
            <span className="text-xs font-medium text-blue-500">
              {errors.email.message}
            </span>
          )}
        </p>
        <input
          {...register("email", {
            required: "이메일을 입력해 주세요.",
            pattern: {
              value: EMAIL_PATTERN,
              message: "올바른 이메일 형식으로 입력해 주세요.",
            },
            onChange: () => setErrorMessage(""),
          })}
          type="email"
          className="h-12 w-full rounded-xl border border-accent bg-white px-5 text-base text-black placeholder:text-gray-400 font-medium shadow-sm"
          placeholder="이메일을 입력해주세요"
        ></input>
        <p className="flex items-center gap-2">
          <span>비밀번호</span>
          {errors.password?.message && (
            <span className="text-xs font-medium text-blue-500">
              {errors.password.message}
            </span>
          )}
        </p>
        <input
          {...register("password", {
            required: "비밀번호를 입력해 주세요.",
            minLength: {
              value: 6,
              message: "비밀번호는 6자 이상 입력해 주세요.",
            },
            onChange: () => setErrorMessage(""),
          })}
          type="password"
          className="h-12 w-full rounded-xl border border-accent bg-white px-5 text-base text-black placeholder:text-gray-400 font-medium shadow-sm"
          placeholder="비밀번호를 입력해주세요"
        ></input>
        {errorMessage && (
          <p className="text-center text-sm mt-4 font-medium text-red-500">
            {errorMessage}
          </p>
        )}
        <button
          type="submit"
          disabled={!canSubmitEmailLogin}
          className={`flex h-14 w-full items-center justify-center rounded-full border px-5 text-base font-semibold shadow-sm disabled:cursor-not-allowed disabled:opacity-80 ${
            canSubmitEmailLogin
              ? "cursor-pointer border-accent text-accent hover:opacity-60"
              : "pointer-events-none border-gray-500 text-gray-500"
          } ${errorMessage ? "mt-4" : "mt-16"}`}
        >
          <Mail className="mr-3" size={20} strokeWidth={2.3} />
          로그인
        </button>
      </form>

      <div className="my-12 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 border-t border-dashed border-gray-400" />
        <span className="text-sm font-medium text-gray-500">또는</span>
        <span className="h-px flex-1 border-t border-dashed border-gray-400" />
      </div>

      <div className="flex flex-col gap-3">
        {LOGIN_OPTIONS.map((option) => (
          <button
            key={option.label}
            type="button"
            disabled={Boolean(pendingProvider)}
            onClick={() => void handleSocialLogin(option.provider)}
            className={`flex h-14 w-full cursor-pointer items-center justify-center rounded-full border px-5 text-base font-semibold shadow-sm disabled:cursor-wait hover:opacity-70 disabled:opacity-80 ${option.className}`}
          >
            {
              <img
                src={option.iconSrc}
                alt={option.iconAlt}
                className="mr-3 h-6 w-6 object-contain"
              />
            }
            {option.label}
          </button>
        ))}
      </div>

      <p className="mt-10 text-center text-base text-page-text">
        계정이 없으신가요?{" "}
        <Link to="/auth/register" className="font-semibold text-accent">
          회원가입
        </Link>
      </p>

      <div className="mt-10 rounded-2xl border border-page-border bg-white px-5 py-4 shadow-[0_2px_12px_rgb(0_0_0/7%)]">
        <p className="text-center text-base font-semibold text-page-heading">
          로그인하면 더 많은 혜택을 받을 수 있어요
        </p>
      </div>
    </section>
  );
}
