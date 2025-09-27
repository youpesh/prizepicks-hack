import { create } from "zustand";

export type PickItem = { id: string; playerId: string; side: "Over" | "Under"; line: number; addedAt: number };

type PicksState = {
  picks: PickItem[];
  addPick: (p: PickItem) => void;
  removePick: (id: string) => void;
  clear: () => void;
};

export const usePicksStore = create<PicksState>((set) => ({
  picks: [],
  addPick: (p) => set((s) => ({ picks: [p, ...s.picks].slice(0, 10) })),
  removePick: (id) => set((s) => ({ picks: s.picks.filter((p) => p.id !== id) })),
  clear: () => set({ picks: [] }),
}));


