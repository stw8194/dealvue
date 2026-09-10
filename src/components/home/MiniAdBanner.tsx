import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { requestAdBanners } from "@/api/home";
import type { AdBanner } from "@/type/home";

export default function MiniAdBanner() {
  const [banners, setBanners] = useState<AdBanner[]>([]);

  useEffect(() => {
    requestAdBanners().then(data => {
      if (data) setBanners(data);
    });
  }, []);

  return (
    <div className="flex flex-col gap-3 px-4 py-5 min-[390px]:px-5">
      {banners.map(banner => (
        <Link key={banner.id} to={banner.linkTo} className="block overflow-hidden rounded-2xl">
          <img src={banner.image} alt={banner.title} className="w-full object-cover" />
        </Link>
      ))}
    </div>
  );
}
