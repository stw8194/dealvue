import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import { requestContents } from "@/api/content";
import type { ContentItem } from "@/type/content";

export default function Content() {
  const [contents, setContents] = useState<ContentItem[]>([]);

  useEffect(() => {
    requestContents().then((data) => {
      if (data) setContents(data);
    });
  }, []);

  return (
    <main className="pb-16">
      <Header title="내 주변" />
      <ul className="grid grid-cols-2 gap-3 px-4 py-4">
        {contents.map((content) => (
          <li key={content.id}>
            <Link to={content.linkTo}>
              <img
                src={content.thumbnail}
                alt={content.title}
                className="aspect-square w-full rounded-xl object-cover"
              />
              <p className="mt-1 text-sm text-page-heading">{content.title}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
