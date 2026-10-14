import { useEffect } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseClient, isSupabaseConfigured } from "@/api/supabase";
import { getUserFromSession } from "@/api/auth";
import { useAuthStore } from "@/store/useAuthStore";

export default function AuthSessionBridge() {
  useEffect(() => {
    const store = useAuthStore.getState();
    if (!isSupabaseConfigured) {
      store.setInitialized(true);
      return;
    }
    const client = getSupabaseClient();
    let active = true;
    let revision = 0;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const sync = (session: Session | null) => {
      const requestId = ++revision;
      if (session) sessionStorage.setItem("userToken", session.access_token);
      else sessionStorage.removeItem("userToken");
      // Keep DB calls outside Supabase's synchronous auth notification callback.
      const timer = setTimeout(() => {
        timers.delete(timer);
        void (session ? getUserFromSession(session) : Promise.resolve(null)).then(
          (user) => { if (active && revision === requestId) { store.setUser(user); store.setInitialized(true); } },
          () => { if (active && revision === requestId) { store.setUser(null); store.setInitialized(true); } },
        );
      }, 0);
      timers.add(timer);
    };
    const { data: subscription } = client.auth.onAuthStateChange((_event, session) => sync(session));
    return () => {
      active = false;
      revision++;
      timers.forEach(clearTimeout);
      subscription.subscription.unsubscribe();
    };
  }, []);
  return null;
}
