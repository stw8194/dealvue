import { create } from "zustand";

interface ModalState {
  isLoginModalOpen: boolean;
  isLogoutModalOpen: boolean;
  isWelcomeModalOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  openLogoutModal: () => void;
  closeLogoutModal: () => void;
  openWelcomeModal: () => void;
  closeWelcomeModal: () => void;
}

export const useModalStore = create<ModalState>(set => ({
  isLoginModalOpen: false,
  isLogoutModalOpen: false,
  isWelcomeModalOpen: false,
  openLoginModal: () => set({ isLoginModalOpen: true }),
  closeLoginModal: () => set({ isLoginModalOpen: false }),
  openLogoutModal: () => set({ isLogoutModalOpen: true }),
  closeLogoutModal: () => set({ isLogoutModalOpen: false }),
  openWelcomeModal: () => set({ isWelcomeModalOpen: true }),
  closeWelcomeModal: () => set({ isWelcomeModalOpen: false }),
}));
