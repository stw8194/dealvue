import type { PopularSearchKeyword } from "@/type/home";

type PopularSearchRankListProps = {
  keywords: PopularSearchKeyword[];
  onSelect: (keyword: string) => void;
};

export default function PopularSearchRankList({
  keywords,
  onSelect,
}: PopularSearchRankListProps) {
  return (
    <ul
      className="
        top-12 z-30 w-full rounded-2xl border border-page-border
        bg-page-background p-2 shadow-social
      "
    >
      {keywords.map((item) => (
        <li key={item.rank}>
          <button
            onClick={() => onSelect(item.keyword)}
            className="flex w-full items-center gap-2 px-2 py-2 text-sm text-page-text"
          >
            <span className="font-semibold text-accent">{item.rank}</span>
            {item.keyword}
          </button>
        </li>
      ))}
    </ul>
  );
}
