import { useState } from "react";
import { ChevronLeft, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  requestRegister,
  requestSocialLogin,
  type SocialLoginProvider,
} from "@/api/auth";
import { useForm, useWatch } from "react-hook-form";
import type { RegisterForm } from "@/type/auth";
import kakaoIcon from "@/assets/icons/kakao.png";
import googleIcon from "@/assets/icons/google.png";
import logoUrl from "@/assets/logo.svg";
import { useAuthStore } from "@/store/useAuthStore";

const LOGIN_OPTIONS: {
  label: string;
  className: string;
  iconSrc: string;
  iconAlt: string;
  provider: SocialLoginProvider;
}[] = [
  {
    label: "카카오 회원가입",
    className: "border-[#f2d84c] bg-[#fee500] text-[#191600]",
    iconSrc: kakaoIcon,
    iconAlt: "",
    provider: "custom:kakao",
  },
  {
    label: "구글 회원가입",
    className: "border-page-border bg-white text-page-heading",
    iconSrc: googleIcon,
    iconAlt: "",
    provider: "google",
  },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Register() {
  const navigate = useNavigate();
  const [pendingProvider, setPendingProvider] =
    useState<SocialLoginProvider | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [emailRegisterError, setEmailRegisterError] = useState("");
  const [registrationNotice, setRegistrationNotice] = useState("");
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isEmailRegisterLoading, setIsEmailRegisterLoading] = useState(false);
  const setUser = useAuthStore((state) => state.setUser);
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<RegisterForm>({
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
      nickname: "",
    },
  });
  const [email, password, nickname] = useWatch({
    control,
    name: ["email", "password", "nickname"],
  });
  const canSubmitEmailRegister =
    EMAIL_PATTERN.test(email) &&
    password.length >= 6 &&
    nickname.trim().length > 0 &&
    !isEmailRegisterLoading;

  const closeEmailModal = () => {
    if (isEmailRegisterLoading) return;
    setIsEmailModalOpen(false);
    setEmailRegisterError("");
    reset();
  };

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

  const handleEmailRegister = async (form: RegisterForm) => {
    if (!canSubmitEmailRegister) return;

    try {
      setEmailRegisterError("");
      setIsEmailRegisterLoading(true);
      const user = await requestRegister({
        email: form.email,
        password: form.password,
        nickname: form.nickname.trim(),
      });

      setIsEmailModalOpen(false);
      reset();
      if (!user) {
        setRegistrationNotice("인증 메일을 보냈습니다. 이메일의 인증 링크를 누른 뒤 로그인해 주세요.");
        return;
      }
      setUser(user);
    } catch (err) {
      setEmailRegisterError(
        err instanceof Error ? err.message : "회원가입에 실패했습니다.",
      );
    } finally {
      setIsEmailRegisterLoading(false);
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

      <div className="mt-16 flex flex-col gap-3">
        {registrationNotice && <p role="status" className="rounded-lg border border-page-border p-4 text-sm">{registrationNotice}</p>}
        {LOGIN_OPTIONS.map((option) => (
          <button
            key={option.label}
            type="button"
            disabled={Boolean(pendingProvider)}
            onClick={() => void handleSocialLogin(option.provider)}
            className={`flex h-14 w-full cursor-pointer items-center justify-center rounded-full border px-5 text-base font-semibold shadow-sm disabled:cursor-wait disabled:opacity-80 ${option.className}`}
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

        {errorMessage && (
          <p className="text-center text-sm font-medium text-red-500">
            {errorMessage}
          </p>
        )}

        <button
          type="button"
          onClick={() => {
            setEmailRegisterError("");
            setIsEmailModalOpen(true);
          }}
          className="mt-2 flex h-14 w-full cursor-pointer items-center justify-center rounded-full border border-accent bg-white px-5 text-base font-semibold text-accent shadow-sm hover:opacity-80"
        >
          <Mail className="mr-3" size={20} strokeWidth={2.3} />
          이메일 회원가입
        </button>
      </div>

      <div className="fixed bottom-0 left-1/2 z-20 w-[calc(100%-3rem)] max-w-[432px] -translate-x-1/2 rounded-t-2xl border border-b-0 border-page-border bg-white px-5 py-4 shadow-[0_8px_24px_rgb(0_0_0/8%)]">
        <p className="text-center text-base font-semibold text-page-heading">
          로그인하면 더 많은 혜택을 받을 수 있어요
        </p>
      </div>
      {isEmailModalOpen && (
        <div
          role="presentation"
          onClick={closeEmailModal}
          className="fixed inset-0 z-50 grid cursor-pointer place-items-center bg-black/40 px-4"
        >
          <form
            onSubmit={handleSubmit(handleEmailRegister)}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-[432px] cursor-default rounded-2xl bg-white p-5 shadow-[0_12px_40px_rgb(0_0_0/20%)]"
          >
            <h2 className="text-lg font-bold text-page-heading">
              이메일 회원가입
            </h2>

            <div className="mt-5 grid gap-4">
              <label className="grid gap-2 text-sm font-semibold text-page-heading">
                <span className="flex items-center gap-2">
                  <span>이메일</span>
                  {errors.email?.message && (
                    <span className="text-xs font-medium text-blue-500">
                      {errors.email.message}
                    </span>
                  )}
                </span>
                <input
                  {...register("email", {
                    required: "이메일을 입력해 주세요.",
                    pattern: {
                      value: EMAIL_PATTERN,
                      message: "올바른 이메일 형식으로 입력해 주세요.",
                    },
                    onChange: () => setEmailRegisterError(""),
                  })}
                  type="email"
                  autoComplete="email"
                  className="h-12 w-full rounded-xl border border-page-border bg-white px-4 text-base text-black placeholder:text-gray-400"
                  placeholder="이메일을 입력하세요"
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold text-page-heading">
                <span className="flex items-center gap-2">
                  <span>비밀번호</span>
                  {errors.password?.message && (
                    <span className="text-xs font-medium text-blue-500">
                      {errors.password.message}
                    </span>
                  )}
                </span>
                <input
                  {...register("password", {
                    required: "비밀번호를 입력해 주세요.",
                    minLength: {
                      value: 6,
                      message: "비밀번호는 6자 이상 입력해 주세요.",
                    },
                    onChange: () => setEmailRegisterError(""),
                  })}
                  type="password"
                  autoComplete="new-password"
                  className="h-12 w-full rounded-xl border border-page-border bg-white px-4 text-base text-black placeholder:text-gray-400"
                  placeholder="6자 이상 입력하세요"
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold text-page-heading">
                닉네임
                <input
                  {...register("nickname", {
                    required: "닉네임은 필수 입력사항입니다",
                  })}
                  type="text"
                  autoComplete="nickname"
                  className="h-12 w-full rounded-xl border border-page-border bg-white px-4 text-base text-black placeholder:text-gray-400"
                  placeholder="닉네임을 입력하세요"
                />
              </label>
            </div>

            {emailRegisterError && (
              <p className="mt-4 text-center text-sm font-medium text-red-500">
                {emailRegisterError}
              </p>
            )}

            <button
              type="submit"
              disabled={!canSubmitEmailRegister}
              className={`mt-6 flex h-14 w-full items-center justify-center rounded-full border px-5 text-base font-semibold shadow-sm disabled:cursor-not-allowed disabled:opacity-80 ${
                canSubmitEmailRegister
                  ? "cursor-pointer border-accent bg-accent text-white hover:opacity-80"
                  : "pointer-events-none border-gray-300 bg-gray-300 text-white"
              }`}
            >
              {isEmailRegisterLoading ? "가입 중..." : "가입하기"}
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
