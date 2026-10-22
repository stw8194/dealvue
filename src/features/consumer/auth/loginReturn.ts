import { useNavigate } from "react-router-dom";
import { create } from "zustand";
import { useAuthStore } from "@/store/useAuthStore";

const RETURN_KEY = "dealvue-login-return";
const RETURN_TTL = 30 * 60_000;

/** Only same-origin app paths outside the auth screens may be returned to after login. */
function safePath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin || url.pathname.startsWith("/auth")) return null;
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}

/** Stored in sessionStorage because OAuth leaves the app and reloads it on return. */
export function saveReturnPath(path: string) {
  const safe = safePath(path);
  if (!safe) return;
  try { sessionStorage.setItem(RETURN_KEY, JSON.stringify({ path: safe, expiresAt: Date.now() + RETURN_TTL })); } catch { /* storage unavailable */ }
}

function readReturnPath() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(RETURN_KEY) ?? "null") as { path?: string; expiresAt?: number } | null;
    return saved && (saved.expiresAt ?? 0) > Date.now() ? safePath(saved.path) : null;
  } catch {
    return null;
  }
}

/** True when the login screen was opened to continue a booking. */
export function hasPendingReturn() {
  return readReturnPath() !== null;
}

/** Returns the saved path once and clears it; falls back to home. */
export function consumeReturnPath() {
  const path = readReturnPath();
  try { sessionStorage.removeItem(RETURN_KEY); } catch { /* storage unavailable */ }
  return path ?? "/";
}

export const useLoginPrompt = create<{ path: string | null; open: (path: string) => void; close: () => void }>(set => ({
  path: null,
  open: path => set({ path }),
  close: () => set({ path: null }),
}));

/** Opens a booking screen, asking guests to log in first. */
export function useBookingNavigate() {
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);
  const initialized = useAuthStore(state => state.initialized);
  const open = useLoginPrompt(state => state.open);
  // While the session is still being checked, the booking screen itself waits and redirects if needed.
  return (path: string) => (user || !initialized ? navigate(path) : open(path));
}
