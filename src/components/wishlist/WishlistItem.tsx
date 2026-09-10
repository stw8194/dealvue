import { useNavigate } from "react-router-dom";
import { useWishlistStore } from "@/store/useWishlistStore";
import type { WishlistItem as WishlistItemType } from "@/type/wishlist";

type WishlistItemProps = {
  item: WishlistItemType;
};

export default function WishlistItem({ item }: WishlistItemProps) {
  const navigate = useNavigate();
  const toggle = useWishlistStore(state => state.toggle);

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <button
        onClick={() => navigate(`/product/${item.targetId}`)}
        className="flex flex-1 items-center gap-3 text-left"
      >
        <img src={item.thumbnail} alt={item.name} className="h-16 w-16 rounded-xl object-cover" />
        <p className="text-sm text-page-heading">{item.name}</p>
      </button>
      <button onClick={() => toggle(item.id)} className="text-sm text-page-text">
        찜 해제
      </button>
    </div>
  );
}
