import { createEmptySlots } from "./geometry";
import { generateTray } from "./generator";
import { resolveBoard } from "./resolver";
import type { GameEvent, GameState, ResolveStep, SlotId } from "./types";

export function createNewGame(seed: number): GameState {
  const opening = generateTray(seed, 0);
  const generated = generateTray(opening.seed, 0);
  const openingSlotIds = ["b1", "b2", "c1"] as const;
  return {
    slots: createEmptySlots().map((slot) => {
      const openingIndex = openingSlotIds.indexOf(slot.id as typeof openingSlotIds[number]);
      return openingIndex === -1 ? slot : { ...slot, plate: opening.tray[openingIndex] };
    }),
    tray: generated.tray,
    score: 0,
    cakesCleared: 0,
    status: "playing",
    randomSeed: generated.seed,
  };
}

export type PlacementResult = {
  state: GameState;
  events: GameEvent[];
  steps: ResolveStep[];
  startState: GameState;
};

export function placePlate(state: GameState, plateId: string, targetSlotId: SlotId): PlacementResult {
  if (state.status !== "playing") return { state, events: [], steps: [], startState: state };
  const plate = state.tray.find((candidate) => candidate.id === plateId);
  const targetSlot = state.slots.find((slot) => slot.id === targetSlotId);
  if (plate === undefined || targetSlot === undefined || targetSlot.plate !== null) {
    return { state, events: [], steps: [], startState: state };
  }

  const placedState: GameState = {
    ...state,
    slots: state.slots.map((slot) => slot.id === targetSlotId ? { ...slot, plate } : slot),
    tray: state.tray.filter((candidate) => candidate.id !== plateId),
  };

  const resolved = resolveBoard(placedState, targetSlotId);
  let nextState = resolved.state;

  if (nextState.tray.length === 0) {
    const generated = generateTray(nextState.randomSeed, nextState.score);
    nextState = { ...nextState, tray: generated.tray, randomSeed: generated.seed };
  }

  const boardIsFull = nextState.slots.every((slot) => slot.plate !== null);
  if (boardIsFull) nextState = { ...nextState, status: "game-over" };

  return { state: nextState, events: resolved.events, steps: resolved.steps, startState: placedState };
}
