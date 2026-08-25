import { createEmptySlots } from "./geometry";
import { generateTray } from "./generator";
import { resolveBoard } from "./resolver";
import type { GameState, Plate, SlotId } from "./types";

export function createNewGame(seed = Date.now() >>> 0): GameState {
  const generated = generateTray(seed, 0);
  return {
    slots: createEmptySlots(),
    tray: generated.tray,
    score: 0,
    cakesCleared: 0,
    status: "playing",
    randomSeed: generated.seed,
    focusedSlotId: null,
  };
}

export function placePlate(state: GameState, plateId: string, targetSlotId: SlotId): { state: GameState; events: ReturnType<typeof resolveBoard>["events"] } {
  if (state.status !== "playing") return { state, events: [] };
  const plate = state.tray.find((candidate) => candidate.id === plateId);
  const targetSlot = state.slots.find((slot) => slot.id === targetSlotId);
  if (plate === undefined || targetSlot === undefined || targetSlot.plate !== null) return { state, events: [] };

  const placedState: GameState = {
    ...state,
    slots: state.slots.map((slot) => slot.id === targetSlotId ? { ...slot, plate } : slot),
    tray: state.tray.filter((candidate) => candidate.id !== plateId),
    focusedSlotId: targetSlotId,
  };

  const resolved = resolveBoard(placedState);
  let nextState = resolved.state;

  if (nextState.tray.length === 0) {
    const generated = generateTray(nextState.randomSeed, nextState.score);
    nextState = { ...nextState, tray: generated.tray, randomSeed: generated.seed };
  }

  const boardIsFull = nextState.slots.every((slot) => slot.plate !== null);
  if (boardIsFull) nextState = { ...nextState, status: "game-over" };

  return { state: nextState, events: resolved.events };
}

export function copyPlate(plate: Plate): Plate {
  return { ...plate, slices: plate.slices.map((slice) => ({ ...slice })) };
}
