import { create } from "zustand";

interface WishlistState {
  wishlistIds: Set<number>;
  toggle: (id: number) => void;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  wishlistIds: new Set(),
  toggle: id => {
    const next = new Set(get().wishlistIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    set({ wishlistIds: next });
  },
}));
