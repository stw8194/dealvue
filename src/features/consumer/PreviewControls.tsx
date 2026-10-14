import type { ReactNode } from "react";
import { usePreviewStore } from "./previewStore";

export function PreviewBoundary({ children }: { children: ReactNode }) {
  const enabled = usePreviewStore((state) => state.enabled);
  const setEnabled = usePreviewStore((state) => state.setEnabled);
  if (enabled) return children;
  return (
    <section className="mx-auto max-w-2xl space-y-4 px-5 py-10">
      <h2 className="text-lg font-semibold text-page-heading">소비자 기능 미리보기</h2>
      <p className="text-sm">이 기능은 화면과 이용 흐름을 먼저 확인할 수 있도록 준비 중입니다. 미리보기에서는 예시 데이터를 이 브라우저에만 저장합니다.</p>
      <p className="text-sm">실제 예약·결제·포인트 지급·게시물 등록은 발생하지 않습니다.</p>
      <button type="button" onClick={() => setEnabled(true)} className="rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-white">예시 데이터로 시작</button>
    </section>
  );
}

export function PreviewBar() {
  const { enabled, setEnabled } = usePreviewStore();
  return (
    <aside aria-label="데이터 모드" className="border-b border-page-border bg-slate-50 px-4 py-2 text-xs">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2">
        <span>{enabled ? "미리보기 · 예시 데이터 / 실제 예약·결제되지 않습니다" : "소비자 앱 개발 중 · 현재 연결된 데이터 조회"}</span>
        <button type="button" onClick={() => setEnabled(!enabled)} className="rounded border border-page-border bg-white px-3 py-2 font-semibold text-page-heading">{enabled ? "실제 데이터 보기" : "전체 기능 미리보기"}</button>
      </div>
    </aside>
  );
}
