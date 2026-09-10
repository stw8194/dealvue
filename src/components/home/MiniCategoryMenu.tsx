import { useSearchParams } from "react-router-dom";
import { SERVICE_CATEGORIES } from "@/data/packageOptions";

export default function MiniCategoryMenu() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategory =
    searchParams.get("category") ?? SERVICE_CATEGORIES[0].id;

  return (
    <nav className="mini-category-menu">
      {SERVICE_CATEGORIES.map((category) => (
        <button
          key={category.id}
          onClick={() => setSearchParams({ category: category.id })}
          className={`mini-category-button ${
            selectedCategory === category.id
              ? "mini-category-button-active"
              : "mini-category-button-inactive"
          }`}
        >
          {category.label}
        </button>
      ))}
    </nav>
  );
}
