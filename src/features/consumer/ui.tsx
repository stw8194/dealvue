import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";

export function Page({ title, children }: { title: string; children: ReactNode }) {
  return <main className="min-h-[80vh] pb-24"><Header title={title} /><div className="mx-auto max-w-3xl space-y-5 px-4 py-5">{children}</div></main>;
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <section className="space-y-3 rounded-xl border border-page-border p-6 text-center"><h2 className="font-semibold text-page-heading">{title}</h2>{description && <p className="text-sm">{description}</p>}{action}</section>;
}

export function NotFoundPage() {
  return <Page title="페이지를 찾을 수 없어요"><EmptyState title="주소를 다시 확인해 주세요" action={<Link to="/" className="text-accent underline">홈으로 이동</Link>} /></Page>;
}
