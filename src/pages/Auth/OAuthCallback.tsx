import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { handleSocialLoginCallback } from "@/api/auth";
import { useAuthStore } from "@/store/useAuthStore";

export default function OAuthCallback() {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    handleSocialLoginCallback()
      .then((user) => {
        if (!isMounted) return;
        setUser(user);
        navigate("/", { replace: true });
      })
      .catch((err) => {
        if (!isMounted) return;
        setErrorMessage(
          err instanceof Error ? err.message : "소셜 로그인 처리 중 오류가 발생했습니다.",
        );
      });

    return () => {
      isMounted = false;
    };
  }, [navigate, setUser]);

  return (
    <section className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-[480px] place-items-center px-6 text-center">
      <div>
        <p className="text-base font-semibold text-page-heading">
          {errorMessage || "로그인 처리 중입니다."}
        </p>
        {errorMessage && (
          <button
            type="button"
            onClick={() => navigate("/auth/login", { replace: true })}
            className="mt-5 h-11 rounded-full bg-accent px-6 text-sm font-semibold text-white"
          >
            로그인으로 돌아가기
          </button>
        )}
      </div>
    </section>
  );
}
