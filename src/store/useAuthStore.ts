import { changeAccountScope } from "@/features/consumer/accountScope";
import { create } from "zustand";
import type { User } from "@/type/auth";

interface AuthState {
  user: User | null;
  initialized: boolean;
  setUser: (user: User | null) => void;
  setInitialized: (initialized: boolean) => void;
}

export const useAuthStore = create<AuthState>(set => ({
  user: null,
  initialized: false,
  setUser: user => { changeAccountScope(user?.id); set({ user }); },
  setInitialized: initialized => set({ initialized }),
}));
