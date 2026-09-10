import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import { SPECIAL_PACKAGE_TYPES } from "@/data/packageOptions";
import type { SpecialPackageType } from "@/type/package";

export default function SpecialPackage() {
  const [selectedType, setSelectedType] = useState<SpecialPackageType>(SPECIAL_PACKAGE_TYPES[0].id);
  const selected = SPECIAL_PACKAGE_TYPES.find(type => type.id === selectedType) ?? SPECIAL_PACKAGE_TYPES[0];

  return (
    <main className="pb-16">
      <Header title="스페셜 패키지" />
      <div className="flex gap-2 overflow-x-auto px-4 py-2">
        {SPECIAL_PACKAGE_TYPES.map(type => (
          <button
            key={type.id}
            onClick={() => setSelectedType(type.id)}
            className={`
              shrink-0 rounded-full border px-4 py-2 text-sm
              ${selectedType === type.id ? "border-accent text-accent" : "border-page-border text-page-text"}
            `}
          >
            {type.label}
          </button>
        ))}
      </div>
      <ul className="flex flex-col gap-2 px-4 py-2">
        {selected.items.map(item => (
          <li key={item}>
            <Link
              to={`/package/detail/${selected.id}-${item}`}
              className="block rounded-xl border border-page-border px-4 py-3 text-sm text-page-text"
            >
              {item}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
