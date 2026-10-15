import { Link } from "react-router-dom";
import { ICON_CATEGORIES } from "@/data/categoryIcons";

export default function IconCategoryGrid() {
  return (
    <nav className="grid grid-cols-4 gap-x-3 gap-y-8 px-5 py-6">
      {ICON_CATEGORIES.map((category) => {
        const Icon = category.icon;
        return (
          <Link
            key={category.id}
            to={category.path}
            className="flex min-w-0 flex-col items-center gap-2"
          >
            <span className="grid h-14 w-14 place-items-center rounded-[20px] border border-[#f7dce8] bg-[#fff3f7] text-[#cf7395] min-[390px]:h-16 min-[390px]:w-16">
              <Icon aria-hidden="true" size={29} strokeWidth={1.5} />
            </span>
            <span className="w-full truncate text-center text-xs font-medium text-page-heading min-[390px]:text-sm">
              {category.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
