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

type HistoryEntry = {
  game: GameState;
  selectedPlateId: string | null;
};

type GameStore = {
  game: GameState;
  selectedPlateId: string | null;
  lastEvents: GameEvent[];
  presentation: Presentation | null;
  nextPresentationId: number;
  history: HistoryEntry[];
  selectPlate: (plateId: string) => void;
  placeSelectedPlate: (slotId: SlotId) => void;
  finishPresentationStep: () => void;
  undo: () => void;
  restart: () => void;
};

const HISTORY_LIMIT = 200;
const initialGame = loadGame() ?? createNewGame(Date.now() >>> 0);

export const useGameStore = create<GameStore>((set, get) => ({
  game: initialGame,
  selectedPlateId: initialGame.tray[0]?.id ?? null,
  lastEvents: [],
  presentation: null,
  nextPresentationId: 1,
  history: [],

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
      history: [
        ...currentStore.history,
        { game: currentStore.game, selectedPlateId: currentStore.selectedPlateId },
      ].slice(-HISTORY_LIMIT),
    });
  },

  finishPresentationStep: () => set((state) => ({
    presentation: state.presentation === null ? null : advanceStep(state.presentation),
  })),

  undo: () => {
    const currentStore = get();
    if (currentStore.presentation !== null) return;
    const previous = currentStore.history[currentStore.history.length - 1];
    if (previous === undefined) return;

    const selectedPlateId = previous.selectedPlateId !== null
      && previous.game.tray.some((plate) => plate.id === previous.selectedPlateId)
      ? previous.selectedPlateId
      : previous.game.tray[0]?.id ?? null;

    saveGame(previous.game);
    set({
      game: previous.game,
      selectedPlateId,
      lastEvents: [],
      presentation: null,
      history: currentStore.history.slice(0, -1),
    });
  },

  restart: () => {
    const game = createNewGame(Date.now() >>> 0);
    saveGame(game);
    set({
      game,
      selectedPlateId: game.tray[0]?.id ?? null,
      lastEvents: [],
      presentation: null,
      nextPresentationId: 1,
      history: [],
    });
  },
}));
