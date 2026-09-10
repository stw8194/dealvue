type LiveViewerBadgeProps = {
  count: number;
};

export default function LiveViewerBadge({ count }: LiveViewerBadgeProps) {
  return <p className="px-4 py-2 text-sm text-accent">현재 {count}명이 보고 있어요</p>;
}
