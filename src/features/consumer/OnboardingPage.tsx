import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SERVICE_CATEGORIES } from "@/data/packageOptions";
import { Page } from "./ui";

export default function OnboardingPage() {
  const [categories, setCategories] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  return <Page title="딜뷰 시작하기"><p>관심 있는 뷰티 서비스를 골라보세요.</p><fieldset className="space-y-3"><legend className="mb-3 text-sm">관심 카테고리 (선택)</legend>{SERVICE_CATEGORIES.map((category) => <label key={category.id} className="flex items-center gap-3 rounded border border-page-border p-3"><input type="checkbox" checked={categories.includes(category.id)} onChange={() => setCategories((current) => current.includes(category.id) ? current.filter((id) => id !== category.id) : [...current, category.id])} />{category.label}</label>)}</fieldset><button type="button" className="rounded bg-accent px-4 py-3 text-white" onClick={() => { try { localStorage.setItem("dealvue-interests", JSON.stringify(categories)); navigate("/location"); } catch { setMessage("브라우저 저장소를 사용할 수 없습니다."); } }}>저장하고 동네 설정</button><Link to="/" className="block text-sm text-accent">나중에 설정</Link>{message && <p role="alert">{message}</p>}</Page>;
}
