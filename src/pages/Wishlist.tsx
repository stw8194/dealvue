import { useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import WishlistItem from "@/components/wishlist/WishlistItem";
import { requestWishlist } from "@/api/wishlist";
import type { WishlistItem as WishlistItemType } from "@/type/wishlist";

export default function Wishlist() {
  const [items, setItems] = useState<WishlistItemType[]>([]);

  useEffect(() => {
    requestWishlist().then(data => {
      if (data) setItems(data);
    });
  }, []);

  return (
    <main className="pb-16">
      <Header title="찜" />
      <ul>
        {items.map(item => (
          <li key={item.id}>
            <WishlistItem item={item} />
          </li>
        ))}
      </ul>
    </main>
  );
}
