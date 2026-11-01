import { Link } from "react-router-dom";
import CategoryIllustration from "./CategoryIllustration";
import { ICON_CATEGORIES } from "@/data/categoryIcons";

export default function IconCategoryGrid() {
  return (
    <nav className="grid grid-cols-4 gap-x-3 gap-y-6 px-[18px] py-7">
      {ICON_CATEGORIES.map((category) => {
        const Icon = category.icon;
        return (
          <Link
            key={category.id}
            to={category.path}
            className="flex min-w-0 flex-col items-center gap-2"
          >
            <span className="grid h-[52px] w-[52px] place-items-center rounded-[18px] border border-[#f7e0e9] bg-[#fdf3f6] text-[#de7b9d]">
              <CategoryIllustration id={category.id} fallback={Icon} />
            </span>
            <span className="w-full truncate text-center text-[11px] font-medium text-page-heading">
              {category.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
