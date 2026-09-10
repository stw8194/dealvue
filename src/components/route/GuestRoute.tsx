import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { requestMe } from "@/api/auth";
import { useAuthStore } from "@/store/useAuthStore";

interface GuestRouteProps {
  children: ReactNode;
}

export default function GuestRoute({ children }: GuestRouteProps) {
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

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
}
