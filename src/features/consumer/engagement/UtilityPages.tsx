import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { requestLogout } from "@/api/auth";
import { useAuthStore } from "@/store/useAuthStore";
import { useBookingStore } from "@/features/consumer/booking/store";
import { useDiscoveryFavorites } from "@/features/consumer/discovery/favorites";
import { PreviewBoundary, usePreviewStore } from "@/features/consumer/preview";
import { EmptyState, Page } from "@/features/consumer/ui";
import { useBusinessHistory } from "@/features/consumer/history";
import { pointBalance, TAGS, useEngagementStore } from "./store";

export function NotificationsPage() {
  return <Page title="알림"><PreviewBoundary><NotificationList /></PreviewBoundary></Page>;
}

function NotificationList() {
  const { notifications, readNotification } = useEngagementStore();
  return <div className="space-y-4"><p className="text-sm">이 브라우저의 체험 활동 알림입니다. 기기로 푸시 알림을 보내지 않습니다.</p><button type="button" disabled={!notifications.some((item) => !item.read)} onClick={() => readNotification()} className="rounded border border-page-border px-3 py-2 text-sm disabled:opacity-40">모두 읽음</button>{notifications.length ? <ul className="space-y-3">{notifications.map((item) => <li key={item.id} className={`rounded border border-page-border p-4 ${item.read ? "bg-white" : "bg-pink-50"}`}><Link to={item.link} onClick={() => readNotification(item.id)}><h2 className="font-semibold">{!item.read && "• "}{item.title}</h2><p className="mt-1 text-sm">{item.body}</p></Link><p className="mt-2 text-xs">{new Date(item.createdAt).toLocaleString("ko-KR")}</p></li>)}</ul> : <EmptyState title="새 알림이 없습니다" description="운세와 룰렛을 체험하면 선물 알림을 확인할 수 있어요." action={<Link to="/rewards" className="text-accent">놀이터에서 행운 모으기</Link>} />}</div>;
}

export function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const preview = usePreviewStore((state) => state.enabled);
  const { notificationSettings, setNotificationSetting, reset } = useEngagementStore();
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  return <Page title="설정">
    <Link to="/mypage/edit" className="block rounded border border-page-border p-4">프로필 설정 →</Link>
    <Link to="/location" className="block rounded border border-page-border p-4">동네 설정 →</Link>
    <Link to="/onboarding" className="block rounded border border-page-border p-4">관심 카테고리 설정 →</Link>
    <fieldset disabled={!preview} className="space-y-3 rounded border border-page-border p-4 disabled:opacity-60"><legend>알림 설정 (미리보기)</legend>{([["activity", "활동 알림"], ["benefits", "혜택 알림"]] as const).map(([key, label]) => <label key={key} className="flex items-center justify-between gap-3"><span>{label}</span><input type="checkbox" checked={notificationSettings[key]} onChange={(event) => setNotificationSetting(key, event.target.checked)} /></label>)}</fieldset>
    <p className="text-sm">알림 설정은 이 브라우저의 미리보기 알림에 적용됩니다. 실제 푸시는 연결 준비 중입니다.</p>
    {preview && <button type="button" className="rounded border border-red-200 px-4 py-3 text-sm text-red-600" onClick={() => {
      if (!window.confirm("이 브라우저의 예시 예약, 찜, 게시글, 리워드를 초기화할까요? 실제 계정 데이터는 변경하지 않습니다.")) return;
      reset(); useBookingStore.getState().resetDemo(); useDiscoveryFavorites.setState({ dealIds: [], businessIds: [] });
      useBusinessHistory.setState((state) => ({ visits: state.visits.filter((visit) => !visit.preview) }));
      localStorage.removeItem("dealvue-preview-profile");
      setMessage("예시 데이터를 초기화했습니다.");
    }}>예시 데이터 초기화</button>}
    {user && <button type="button" className="block rounded border border-page-border px-4 py-3 text-sm" onClick={() => {
      void requestLogout().then(() => { useAuthStore.getState().setUser(null); navigate("/", { replace: true }); }).catch((error: unknown) => setMessage(error instanceof Error ? error.message : "로그아웃하지 못했습니다."));
    }}>실제 계정 로그아웃</button>}
    {!user && <Link to="/auth/login" className="block text-accent">로그인 / 회원가입</Link>}
    {message && <p role="status" className="text-sm">{message}</p>}
  </Page>;
}

export function ShortsPage() {
  return <Page title="뷰티 숏폼"><PreviewBoundary><ShortsContent /></PreviewBoundary></Page>;
}

function ShortsContent() {
  const { shorts, saveShort, deleteShort } = useEngagementStore();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [tag, setTag] = useState<string>(TAGS[0]);
  const [message, setMessage] = useState("");
  return <div className="space-y-5"><p className="text-sm">소비자 영상 목록과 등록 흐름을 확인합니다. 영상 파일은 업로드하지 않고 입력한 HTTPS 주소만 이 브라우저에 저장합니다.</p>
    <form className="space-y-3 rounded border border-page-border p-4" onSubmit={(event) => {
      event.preventDefault();
      if (saveShort(title, url, tag)) { setTitle(""); setUrl(""); setMessage("영상 주소를 저장했습니다."); }
      else setMessage("제목과 올바른 HTTPS 영상 주소를 입력해 주세요.");
    }}>
      <h2 className="font-semibold">영상 등록 체험</h2>
      <label className="block text-sm">제목<input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={80} className="mt-1 block w-full rounded border border-page-border p-3" /></label>
      <label className="block text-sm">영상 URL<input type="url" value={url} onChange={(event) => setUrl(event.target.value)} required placeholder="https://…" className="mt-1 block w-full rounded border border-page-border p-3" /></label>
      <label className="block text-sm">태그<select value={tag} onChange={(event) => setTag(event.target.value)} className="mt-1 rounded border border-page-border p-3">{TAGS.map((value) => <option key={value}>{value}</option>)}</select></label>
      <button className="rounded bg-accent px-4 py-2 text-sm text-white">영상 주소 저장</button>
    </form>
    <p role="status" className="text-sm">{message}</p>
    {shorts.length ? <ul className="space-y-3">{shorts.map((item) => <li key={item.id} className="space-y-2 rounded border border-page-border p-4"><h2 className="font-semibold">{item.title}</h2><p className="text-xs">#{item.tag}</p><a href={item.url} target="_blank" rel="noreferrer" className="text-sm text-accent">영상 링크 열기 ↗</a><button type="button" className="ml-4 text-sm text-red-600" onClick={() => { if (window.confirm("이 영상 주소를 삭제할까요?")) deleteShort(item.id); }}>삭제</button></li>)}</ul> : <EmptyState title="등록한 영상이 없습니다" description="영상 주소를 등록해 목록 흐름을 확인하세요." />}
  </div>;
}

export function ConsumerMyPage() {
  const reservations = useBookingStore((state) => state.reservations);
  const pointHistory = useEngagementStore((state) => state.pointHistory);
  const links = [["예약내역", "/reservation"], ["찜", "/wishlist"], ["내 리뷰", "/mypage/review"], ["쿠폰", "/mypage/coupon"], ["포인트", "/mypage/point"], ["놀이터", "/rewards"], ["오늘의 운세", "/fortune"], ["우리동네", "/community"], ["뷰티 숏폼", "/shorts"], ["알림", "/notifications"], ["설정", "/settings"], ["도움말", "/mypage/inquiry"]];
  return <div className="space-y-5 p-4"><section className="space-y-2 rounded border border-page-border p-4"><h2 className="text-lg font-semibold">소비자 미리보기 계정</h2><p className="text-sm">방문 예정 {reservations.filter((item) => item.status === "waiting" || item.status === "confirmed").length}건 · {pointBalance(pointHistory)} 체험 P</p></section><nav aria-label="마이페이지 기능" className="grid grid-cols-2 gap-3">{links.map(([label, path]) => <Link key={path} to={path} className="rounded border border-page-border p-4 text-sm">{label} →</Link>)}</nav></div>;
}
