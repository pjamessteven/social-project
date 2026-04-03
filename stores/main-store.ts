import { create } from "zustand";

interface MainState {
  scrollPosition: number;
  setScrollPosition: (pos: number) => void;
}

export const useMainStore = create<MainState>((set, get) => ({
  scrollPosition: 0,
  setScrollPosition: (pos) => {
    set({
      scrollPosition: pos,
    });
  },
}));
