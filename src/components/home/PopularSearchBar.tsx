import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { requestPopularSearchKeywords } from "@/api/home";
import type { PopularSearchKeyword } from "@/type/home";
import PopularSearchRankList from "./PopularSearchRankList";

export default function PopularSearchBar() {
  const navigate = useNavigate();
  const [keywords, setKeywords] = useState<PopularSearchKeyword[]>([]);
  const [isRankOpen, setIsRankOpen] = useState(false);

  useEffect(() => {
    requestPopularSearchKeywords().then((data) => {
      if (data) setKeywords(data);
    });
  }, []);

  return (
    <div className="relative px-4 py-4 min-[390px]:px-5">
      <button
        onClick={() => setIsRankOpen((prev) => !prev)}
        className="flex h-14 w-full items-center rounded-[22px] border border-page-border bg-[#fafbfc] px-5 text-left text-sm text-page-text shadow-sm"
      >
        {keywords[0]?.keyword ?? "실시간 인기 검색어를 확인해보세요"}
      </button>
      {isRankOpen && (
        <PopularSearchRankList
          keywords={keywords}
          onSelect={(keyword) => {
            setIsRankOpen(false);
            navigate(`/search?keyword=${encodeURIComponent(keyword)}`);
          }}
        />
      )}
    </div>
  );
}
