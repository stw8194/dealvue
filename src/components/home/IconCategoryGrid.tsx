import { Link } from "react-router-dom";
import { ICON_CATEGORIES } from "@/data/categoryIcons";

export default function IconCategoryGrid() {
  return (
    <nav className="grid grid-cols-4 gap-x-3 gap-y-8 px-5 py-6">
      {ICON_CATEGORIES.map((category) => (
        <Link
          key={category.id}
          to={category.path}
          className="flex min-w-0 flex-col items-center gap-2"
        >
          <span className="h-14 w-14 rounded-[20px] border border-[#f7dce8] bg-[#fff3f7] min-[390px]:h-16 min-[390px]:w-16" />
          <span className="w-full truncate text-center text-xs font-medium text-page-heading min-[390px]:text-sm">
            {category.label}
          </span>
        </Link>
      ))}
    </nav>
  );
}
