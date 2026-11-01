import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, TrendingUp } from "lucide-react";

export default function PopularSearchBar() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  return <form className="mx-[18px] mt-4 flex h-12 items-center gap-2 rounded-2xl border border-[#f0f1f4] bg-[#f8f9fb] px-4" onSubmit={event => { event.preventDefault(); navigate(`/search?keyword=${encodeURIComponent(keyword.trim())}`); }}>
    <Search size={18} className="shrink-0 text-gray-400" strokeWidth={1.8} />
    <input type="search" aria-label="매장 또는 시술 검색" placeholder="매장, 시술, 동네를 검색하세요" value={keyword} onChange={event => setKeyword(event.target.value)} className="h-full min-w-0 flex-1 border-0 bg-transparent text-[12px] outline-none placeholder:text-gray-400" />
    <button type="submit" aria-label="검색" className="grid h-8 w-8 shrink-0 place-items-center text-accent"><TrendingUp size={18} /></button>
  </form>;
}
