import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import { SERVICE_CATEGORIES } from "@/data/packageOptions";
import { requestPackages } from "@/api/package";
import type { PackageItem, ServiceCategory } from "@/type/package";

export default function OneShopPackage() {
  const [category, setCategory] = useState<ServiceCategory>(SERVICE_CATEGORIES[0].id);
  const [packages, setPackages] = useState<PackageItem[]>([]);

  useEffect(() => {
    requestPackages("oneShop", category).then(data => {
      if (data) setPackages(data);
    });
  }, [category]);

  return (
    <main className="pb-16">
      <Header title="원샵 패키지" />
      <div className="flex gap-2 overflow-x-auto px-4 py-2">
        {SERVICE_CATEGORIES.map(item => (
          <button
            key={item.id}
            onClick={() => setCategory(item.id)}
            className={`
              shrink-0 rounded-full border px-4 py-2 text-sm
              ${category === item.id ? "border-accent text-accent" : "border-page-border text-page-text"}
            `}
          >
            {item.label}
          </button>
        ))}
      </div>
      <ul className="flex flex-col gap-2 px-4 py-2">
        {packages.map(item => (
          <li key={item.id}>
            <Link
              to={`/package/detail/${item.id}`}
              className="block rounded-xl border border-page-border px-4 py-3 text-sm text-page-text"
            >
              {item.title}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
