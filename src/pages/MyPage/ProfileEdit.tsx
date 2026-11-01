import { useRef, useState } from "react";
import { PreviewBoundary } from "@/features/consumer/preview";
import { requestUpdateNickname } from "@/api/auth";
import Button from "@/components/common/Button";
import { useAuthStore } from "@/store/useAuthStore";

export default function ProfileEdit() {
  return <PreviewBoundary><ProfileForm /></PreviewBoundary>;
}

function ProfileForm() {
  const user = useAuthStore(state => state.user);
  const [nickname, setNickname] = useState(user?.nickname ?? "딜뷰 이웃");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);

  const handleSubmit = async () => {
    if (!user) { setMessage("로그인 후 닉네임을 저장할 수 있어요."); return; }
    if (lock.current) return;
    if (!nickname.trim()) { setMessage("닉네임을 입력해 주세요."); return; }
    lock.current = true; setBusy(true); setMessage("");
    try {
      const value = await requestUpdateNickname(nickname);
      const current = useAuthStore.getState().user;
      if (current?.id === user.id) useAuthStore.getState().setUser({ ...current, nickname: value });
      setMessage("닉네임을 저장했습니다.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "저장하지 못했어요."); }
    finally { lock.current = false; setBusy(false); }
  };

  return (
    <form
      onSubmit={event => {
        event.preventDefault();
        void handleSubmit();
      }}
      className="flex flex-col gap-3 px-4 py-4"
    >
      <label className="flex flex-col gap-1 text-sm text-page-text">
        닉네임
        <input
          value={nickname}
          maxLength={30}
          onChange={event => setNickname(event.target.value)}
          className="rounded-lg border border-page-border px-3 py-2"
        />
      </label>
      <Button type="submit" disabled={busy || !user}>{busy ? "저장 중…" : "저장"}</Button>
      <p role="status" className="text-sm">{message}</p>
    </form>
  );
}
