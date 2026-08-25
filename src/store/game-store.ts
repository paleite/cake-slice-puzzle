import { create } from "zustand";
import { createNewGame, placePlate } from "../game/game";
import type { GameEvent, GameState, SlotId } from "../game/types";
import { loadGame, saveGame } from "../lib/persistence";

type GameStore = GameState & {
  selectedPlateId: string | null;
  recentEvents: GameEvent[];
  selectPlate: (plateId: string) => void;
  placeSelectedPlate: (slotId: SlotId) => void;
  restart: () => void;
};

const initialState = loadGame() ?? createNewGame();

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,
  selectedPlateId: initialState.tray[0]?.id ?? null,
  recentEvents: [],

  selectPlate: (plateId) => set({ selectedPlateId: plateId }),

  placeSelectedPlate: (slotId) => {
    const currentState = get();
    if (currentState.selectedPlateId === null) return;

    const result = placePlate(currentState, currentState.selectedPlateId, slotId);
    const nextSelectedPlateId = result.state.tray[0]?.id ?? null;
    const nextStoreState = {
      ...result.state,
      selectedPlateId: nextSelectedPlateId,
      recentEvents: result.events,
    };
    saveGame(result.state);
    set(nextStoreState);
  },

  restart: () => {
    const nextState = createNewGame();
    saveGame(nextState);
    set({ ...nextState, selectedPlateId: nextState.tray[0]?.id ?? null, recentEvents: [] });
  },
}));
