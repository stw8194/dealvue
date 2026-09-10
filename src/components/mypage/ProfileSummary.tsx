import type { User } from "@/type/auth";

type ProfileSummaryProps = {
  user: User;
};

export default function ProfileSummary({ user }: ProfileSummaryProps) {
  return (
    <section className="flex items-center gap-4 px-4 py-6">
      <img
        src={user.profileImage ?? "/icons.svg"}
        alt={user.nickname}
        className="h-16 w-16 rounded-full object-cover"
      />
      <div>
        <p className="text-base font-semibold text-page-heading">{user.nickname}</p>
        <p className="text-sm text-page-text">Lv.{user.level}</p>
        <p className="text-xs text-page-text">{user.totalSavedAmount.toLocaleString()}원 아낌</p>
      </div>
    </section>
  );
}
