import { create } from "zustand";
import { createNewGame, placePlate } from "../game/game";
import type { GameEvent, GameState, SlotId } from "../game/types";
import { prefersReducedMotion } from "../presentation/motion";
import {
  createPresentation,
  finishPresentationStep as advanceStep,
  type Presentation,
} from "../presentation/model";
import { loadGame, saveGame } from "../lib/persistence";

type GameStore = {
  game: GameState;
  selectedPlateId: string | null;
  lastEvents: GameEvent[];
  presentation: Presentation | null;
  nextPresentationId: number;
  selectPlate: (plateId: string) => void;
  placeSelectedPlate: (slotId: SlotId) => void;
  finishPresentationStep: () => void;
  restart: () => void;
};

const initialGame = loadGame() ?? createNewGame(Date.now() >>> 0);

export const useGameStore = create<GameStore>((set, get) => ({
  game: initialGame,
  selectedPlateId: initialGame.tray[0]?.id ?? null,
  lastEvents: [],
  presentation: null,
  nextPresentationId: 1,

  selectPlate: (plateId) => set({ selectedPlateId: plateId }),

  placeSelectedPlate: (slotId) => {
    const currentStore = get();
    if (currentStore.presentation !== null || currentStore.selectedPlateId === null) return;

    const result = placePlate(currentStore.game, currentStore.selectedPlateId, slotId);
    if (result.state === currentStore.game) return;

    const presentation = result.steps.length > 0 && !prefersReducedMotion()
      ? createPresentation(currentStore.nextPresentationId, slotId, result.startState, result.steps)
      : null;

    saveGame(result.state);
    set({
      game: result.state,
      selectedPlateId: result.state.tray[0]?.id ?? null,
      lastEvents: result.events,
      presentation,
      nextPresentationId: presentation === null
        ? currentStore.nextPresentationId
        : currentStore.nextPresentationId + 1,
    });
  },

  finishPresentationStep: () => set((state) => ({
    presentation: state.presentation === null ? null : advanceStep(state.presentation),
  })),

  restart: () => {
    const game = createNewGame(Date.now() >>> 0);
    saveGame(game);
    set({
      game,
      selectedPlateId: game.tray[0]?.id ?? null,
      lastEvents: [],
      presentation: null,
      nextPresentationId: 1,
    });
  },
}));
