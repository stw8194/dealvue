import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PreviewState {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

export const usePreviewStore = create<PreviewState>()(
  persist((set) => ({ enabled: false, setEnabled: (enabled) => set({ enabled }) }), {
    name: "dealvue-consumer-preview-mode",
  }),
);
