import type { ReactNode } from "react";

type BadgeProps = {
  children: ReactNode;
};

export default function Badge({ children }: BadgeProps) {
  return <span className="rounded-full bg-accent-background px-2 py-0.5 text-xs text-accent">{children}</span>;
}
