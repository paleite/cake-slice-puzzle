import { create } from "zustand";
import { createNewGame, placePlate } from "../game/game";
import { prefersReducedMotion, type Presentation } from "../game/presentation";
import type { GameEvent, GameState, SlotId } from "../game/types";
import { loadGame, saveGame } from "../lib/persistence";

type GameStore = GameState & {
  selectedPlateId: string | null;
  recentEvents: GameEvent[];
  eventBatchId: number;
  presentation: Presentation | null;
  selectPlate: (plateId: string) => void;
  placeSelectedPlate: (slotId: SlotId) => void;
  advancePresentation: () => void;
  restart: () => void;
};

const initialState = loadGame() ?? createNewGame();

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,
  selectedPlateId: initialState.tray[0]?.id ?? null,
  recentEvents: [],
  eventBatchId: 0,
  presentation: null,

  selectPlate: (plateId) => set({ selectedPlateId: plateId }),

  placeSelectedPlate: (slotId) => {
    const currentState = get();
    if (currentState.presentation !== null || currentState.selectedPlateId === null) return;

    const result = placePlate(currentState, currentState.selectedPlateId, slotId);
    if (result.state === currentState) return;

    const presentation: Presentation | null = result.steps.length > 0 && !prefersReducedMotion()
      ? { startState: result.startState, steps: result.steps, index: 0 }
      : null;

    saveGame(result.state);
    set({
      ...result.state,
      selectedPlateId: result.state.tray[0]?.id ?? null,
      recentEvents: result.events,
      eventBatchId: currentState.eventBatchId + 1,
      presentation,
    });
  },

  advancePresentation: () => set((state) => {
    if (state.presentation === null) return {};
    const nextIndex = state.presentation.index + 1;
    if (nextIndex >= state.presentation.steps.length) return { presentation: null };
    return { presentation: { ...state.presentation, index: nextIndex } };
  }),

  restart: () => {
    const nextState = createNewGame();
    saveGame(nextState);
    set({
      ...nextState,
      selectedPlateId: nextState.tray[0]?.id ?? null,
      recentEvents: [],
      eventBatchId: 0,
      presentation: null,
    });
  },
}));
