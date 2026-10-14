import { useState } from "react";
import { PreviewBoundary } from "@/features/consumer/preview";
import Button from "@/components/common/Button";
import { useAuthStore } from "@/store/useAuthStore";

export default function ProfileEdit() {
  return <PreviewBoundary><ProfileForm /></PreviewBoundary>;
}

function ProfileForm() {
  const user = useAuthStore(state => state.user);
  const [nickname, setNickname] = useState(() => localStorage.getItem("dealvue-preview-profile") ?? user?.nickname ?? "체험 소비자");
  const [message, setMessage] = useState("");

  const handleSubmit = () => {
    if (!nickname.trim()) { setMessage("닉네임을 입력해 주세요."); return; }
    try { localStorage.setItem("dealvue-preview-profile", nickname.trim()); setMessage("이 브라우저에 예시 프로필을 저장했습니다."); }
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
      <p className="text-sm">미리보기 프로필이며 실제 계정 정보는 변경하지 않습니다.</p>
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
