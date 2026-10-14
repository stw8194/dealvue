import { create } from "zustand";
import { persist } from "zustand/middleware";

interface DiscoveryFavorites {
  dealIds: number[];
  businessIds: number[];
  toggleDeal: (id: number) => void;
  toggleBusiness: (id: number) => void;
}

export const useDiscoveryFavorites = create<DiscoveryFavorites>()(
  persist(
    (set) => ({
      dealIds: [],
      businessIds: [],
      toggleDeal: (id) => set((state) => ({
        dealIds: state.dealIds.includes(id) ? state.dealIds.filter((value) => value !== id) : [...state.dealIds, id],
      })),
      toggleBusiness: (id) => set((state) => ({
        businessIds: state.businessIds.includes(id) ? state.businessIds.filter((value) => value !== id) : [...state.businessIds, id],
      })),
    }),
    { name: "dealvue-consumer-preview-favorites-v1" },
  ),
);
