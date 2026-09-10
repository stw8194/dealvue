import { create } from "zustand";

interface CartItem {
  productId: number;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  addItem: (productId: number) => void;
  removeItem: (productId: number) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  addItem: productId => {
    const existing = get().items.find(item => item.productId === productId);
    if (existing) {
      set({
        items: get().items.map(item =>
          item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item,
        ),
      });
      return;
    }
    set({ items: [...get().items, { productId, quantity: 1 }] });
  },
  removeItem: productId => {
    set({ items: get().items.filter(item => item.productId !== productId) });
  },
  clear: () => set({ items: [] }),
}));
