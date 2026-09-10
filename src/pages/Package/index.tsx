import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";

const PACKAGE_TIERS = [
  { label: "스페셜 패키지", description: "특정 목적과 상황에 맞춘 맞춤형 패키지", path: "/package/special" },
  { label: "원샵 패키지", description: "하나의 매장에서 다양한 시술을 함께", path: "/package/one-shop" },
  { label: "샵+샵 패키지", description: "서로 다른 매장의 인기 시술을 조합", path: "/package/shop-shop" },
];

export default function PackageHome() {
  return (
    <main className="pb-16">
      <Header title="딜뷰패키지" />
      <ul className="flex flex-col gap-3 px-4 py-4">
        {PACKAGE_TIERS.map(tier => (
          <li key={tier.path}>
            <Link to={tier.path} className="block rounded-2xl border border-page-border px-4 py-4">
              <p className="text-sm font-semibold text-page-heading">{tier.label}</p>
              <p className="text-sm text-page-text">{tier.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
