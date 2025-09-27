import { create } from "zustand";

type UIState = {
  risk: number; // 0..100
  cooldowns: boolean;
  setRisk: (v: number) => void;
  setCooldowns: (v: boolean) => void;
};

export const useUIStore = create<UIState>((set) => ({
  risk: 40,
  cooldowns: true,
  setRisk: (v) => set({ risk: v }),
  setCooldowns: (v) => set({ cooldowns: v }),
}));


