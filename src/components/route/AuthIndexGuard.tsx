import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";

export default function AuthIndexGuard() {
  const { user, initialized } = useAuthStore();
  if (!initialized) return <p role="status" className="p-6">로그인 상태를 확인하고 있습니다.</p>;
  return <Navigate to={user ? "/" : "/auth/login"} replace />;
}
