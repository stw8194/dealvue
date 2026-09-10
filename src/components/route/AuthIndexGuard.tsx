import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { requestMe } from "@/api/auth";
import { useAuthStore } from "@/store/useAuthStore";

export default function AuthIndexGuard() {
  const user = useAuthStore(state => state.user);
  const setUser = useAuthStore(state => state.setUser);
  const [isChecking, setIsChecking] = useState(!user);

  useEffect(() => {
    let isMounted = true;

    if (user) {
      setIsChecking(false);
      return;
    }

    requestMe()
      .then(data => {
        if (isMounted && data) setUser(data);
      })
      .finally(() => {
        if (isMounted) setIsChecking(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user, setUser]);

  if (isChecking) return null;

  return <Navigate to={user ? "/" : "/auth/login"} replace />;
}
