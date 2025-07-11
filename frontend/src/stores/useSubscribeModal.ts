import { create } from 'zustand'

interface ModalState {
  isOpen: boolean
  open: () => void
  close: () => void
}

export const useSubscribeModal = create<ModalState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
})) 