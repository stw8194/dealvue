import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "@/components/layout/Header";
import { requestSearchRanking, requestSearchResults } from "@/api/search";
import type { PopularSearchKeyword } from "@/type/home";

export default function Search() {
  const [searchParams] = useSearchParams();
  const keyword = searchParams.get("keyword") ?? "";
  const [ranking, setRanking] = useState<PopularSearchKeyword[]>([]);
  const [results, setResults] = useState<unknown[]>([]);

  useEffect(() => {
    requestSearchRanking().then(data => {
      if (data) setRanking(data);
    });
  }, []);

  useEffect(() => {
    if (!keyword) return;
    requestSearchResults(keyword).then(data => {
      if (data) setResults(data);
    });
  }, [keyword]);

  return (
    <main className="pb-16">
      <Header title="검색" />
      {!keyword ? (
        <ul className="flex flex-col gap-1 px-4 py-4">
          {ranking.map(item => (
            <li key={item.rank} className="flex items-center gap-2 text-sm text-page-text">
              <span className="font-semibold text-accent">{item.rank}</span>
              {item.keyword}
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 py-4 text-sm text-page-text">
          "{keyword}" 검색 결과 {results.length}건
        </p>
      )}
    </main>
  );
}
