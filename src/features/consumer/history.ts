import { create } from "zustand";
import { persist } from "zustand/middleware";
import { accountStorage, registerAccountStore } from "@/features/consumer/accountScope";

export interface BusinessVisit { id: number; name: string; preview: boolean; viewedAt: string }
export const useBusinessHistory = create<{ visits: BusinessVisit[]; record: (business: Omit<BusinessVisit, "viewedAt">) => void }>()(persist((set) => ({
  visits: [],
  record: (business) => set((state) => ({ visits: [{ ...business, viewedAt: new Date().toISOString() }, ...state.visits.filter((visit) => visit.id !== business.id || visit.preview !== business.preview)].slice(0, 30) })),
}), { storage: accountStorage(), name: "dealvue-browser-business-history", partialize: state => ({ visits: state.visits }) }));

registerAccountStore(useBusinessHistory);
