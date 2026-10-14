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
  setUser: user => set({ user }),
  setInitialized: initialized => set({ initialized }),
}));
