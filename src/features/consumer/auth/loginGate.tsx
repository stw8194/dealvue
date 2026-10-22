import { useEffect, useRef, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { saveReturnPath, useBookingNavigate, useLoginPrompt } from "./loginReturn";

/** A "예약하기" control: opens the booking screen, or the login prompt for guests. */
export function BookingButton({ to, className, onBeforeNavigate, children }: { to: string; className?: string; onBeforeNavigate?: () => void; children: ReactNode }) {
  const bookingNavigate = useBookingNavigate();
  return <button type="button" className={className} onClick={() => { onBeforeNavigate?.(); bookingNavigate(to); }}>{children}</button>;
}

/** Renders children for logged-in users; guests are sent to login and brought back here. */
export function RequireLogin({ children }: { children: ReactNode }) {
  const user = useAuthStore(state => state.user);
  const initialized = useAuthStore(state => state.initialized);
  const location = useLocation();
  const navigate = useNavigate();
  const guest = initialized && !user;
  useEffect(() => {
    if (!guest) return;
    saveReturnPath(location.pathname + location.search);
    navigate("/auth/login", { replace: true });
  }, [guest, location.pathname, location.search, navigate]);
  if (!initialized) return <p role="status" className="py-10 text-center text-sm text-page-text">로그인 상태를 확인하고 있습니다.</p>;
  if (!user) return <p role="status" className="py-10 text-center text-sm text-page-text">로그인이 필요합니다. 로그인 화면으로 이동합니다.</p>;
  return children;
}

export function LoginRequiredDialog() {
  const path = useLoginPrompt(state => state.path);
  const close = useLoginPrompt(state => state.close);
  const navigate = useNavigate();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (path && !element.open) element.showModal();
    if (!path && element.open) element.close();
  }, [path]);
  const login = () => {
    if (path) saveReturnPath(path);
    close();
    navigate("/auth/login");
  };
  return (
    <dialog
      ref={dialog}
      aria-labelledby="login-required-title"
      onClose={close}
      onClick={event => { if (event.target === event.currentTarget) close(); }}
      className="m-auto w-[calc(100%-3rem)] max-w-sm rounded-3xl border-0 bg-white p-0 text-page-heading backdrop:bg-black/50"
    >
      <div className="flex flex-col items-center px-6 pb-6 pt-8 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-accent/10 text-accent"><LogIn size={26} /></span>
        <h2 id="login-required-title" className="mt-4 text-lg font-black">로그인이 필요합니다</h2>
        <p className="mt-2 text-sm leading-6 text-page-text">예약하려면 로그인해 주세요.<br />로그인 후 보던 예약 화면으로 돌아와요.</p>
        <div className="mt-6 grid w-full grid-cols-2 gap-2">
          <button type="button" onClick={close} className="h-12 rounded-full bg-gray-100 text-sm font-bold text-page-text">취소</button>
          <button type="button" onClick={login} className="h-12 rounded-full bg-accent text-sm font-bold text-white">로그인하기</button>
        </div>
      </div>
    </dialog>
  );
}
