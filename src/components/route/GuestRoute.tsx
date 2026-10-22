import { useEffect, useRef, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { consumeReturnPath } from "@/features/consumer/auth/loginReturn";

function AuthenticatedRedirect() {
  const navigate = useNavigate();
  const redirected = useRef(false);
  useEffect(() => {
    if (redirected.current) return;
    redirected.current = true;
    navigate(consumeReturnPath(), { replace: true });
  }, [navigate]);
  return <p role="status" className="p-6">로그인 후 화면으로 이동하고 있습니다.</p>;
}

export default function GuestRoute({ children }: { children: ReactNode }) {
  const { user, initialized } = useAuthStore();
  if (!initialized) return <p role="status" className="p-6">로그인 상태를 확인하고 있습니다.</p>;
  // Own the redirect here: the session bridge can sign in before the form's request resolves.
  return user ? <AuthenticatedRedirect /> : children;
}
