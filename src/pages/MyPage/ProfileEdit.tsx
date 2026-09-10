import { useState } from "react";
import { requestUpdateProfile } from "@/api/mypage";
import Button from "@/components/common/Button";
import { useAuthStore } from "@/store/useAuthStore";

export default function ProfileEdit() {
  const user = useAuthStore(state => state.user);
  const [nickname, setNickname] = useState(user?.nickname ?? "");
  const [address, setAddress] = useState("");

  const handleSubmit = async () => {
    await requestUpdateProfile({ nickname, address });
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
          onChange={event => setNickname(event.target.value)}
          className="rounded-lg border border-page-border px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-page-text">
        배송지
        <input
          value={address}
          onChange={event => setAddress(event.target.value)}
          className="rounded-lg border border-page-border px-3 py-2"
        />
      </label>
      <Button type="submit">저장</Button>
    </form>
  );
}
