import { useState } from "react";
import { PreviewBoundary } from "@/features/consumer/preview";
import Button from "@/components/common/Button";
import { useAuthStore } from "@/store/useAuthStore";

export default function ProfileEdit() {
  return <PreviewBoundary><ProfileForm /></PreviewBoundary>;
}

function ProfileForm() {
  const user = useAuthStore(state => state.user);
  const [nickname, setNickname] = useState(() => {
    const saved = localStorage.getItem("dealvue-preview-profile");
    return saved && saved !== "체험 소비자" ? saved : user?.nickname ?? "딜뷰 회원";
  });
  const [message, setMessage] = useState("");

  const handleSubmit = () => {
    if (!nickname.trim()) { setMessage("닉네임을 입력해 주세요."); return; }
    try { localStorage.setItem("dealvue-preview-profile", nickname.trim()); setMessage("닉네임을 저장했습니다."); }
    catch { setMessage("브라우저 저장소를 사용할 수 없습니다."); }
  };

  return (
    <form
      onSubmit={event => {
        event.preventDefault();
        handleSubmit();
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
      <Button type="submit">저장</Button>
      <p role="status" className="text-sm">{message}</p>
    </form>
  );
}
