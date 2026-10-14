import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function PopularSearchBar() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  return <form className="flex gap-2 px-4 py-4" onSubmit={(event) => { event.preventDefault(); navigate(`/search?keyword=${encodeURIComponent(keyword.trim())}`); }}>
    <input type="search" aria-label="매장 또는 시술 검색" placeholder="매장, 시술, 동네를 검색하세요" value={keyword} onChange={(event) => setKeyword(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-page-border px-4 py-3 text-sm" />
    <button type="submit" className="rounded-xl bg-accent px-4 text-sm text-white">검색</button>
  </form>;
}
