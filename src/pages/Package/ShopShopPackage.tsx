import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import { requestPackages } from "@/api/package";
import type { PackageItem } from "@/type/package";

export default function ShopShopPackage() {
  const [packages, setPackages] = useState<PackageItem[]>([]);

  useEffect(() => {
    requestPackages("shopShop").then(data => {
      if (data) setPackages(data);
    });
  }, []);

  return (
    <main className="pb-16">
      <Header title="샵+샵 패키지" />
      <ul className="flex flex-col gap-2 px-4 py-4">
        {packages.map(item => (
          <li key={item.id}>
            <Link
              to={`/package/detail/${item.id}`}
              className="block rounded-xl border border-page-border px-4 py-3"
            >
              <p className="text-sm font-semibold text-page-heading">{item.title}</p>
              <p className="text-xs text-page-text">{item.composedServices.join(" + ")}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
