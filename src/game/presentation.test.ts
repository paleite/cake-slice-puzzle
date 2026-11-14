import { describe, expect, it } from "vitest";
import { createEmptySlots } from "./geometry";
import {
  getPresentationCakesCleared,
  getPresentationScore,
  getPresentationSlots,
} from "./presentation";
import type { GameEvent, GameState, ResolveStep, SlotId } from "./types";

function state(score = 0, cakesCleared = 0): GameState {
  return {
    slots: createEmptySlots(),
    tray: [],
    score,
    cakesCleared,
    status: "playing",
    randomSeed: 1,
    focusedSlotId: null,
  };
}

function step(events: GameEvent[], resultingScore: number): ResolveStep {
  const result = state(resultingScore);
  return { state: result, events };
}

describe("presentation staging", () => {
  it("counts a clear as soon as its animation step starts", () => {
    const clear: GameEvent = { type: "clear", slotId: "b1", cakeTypeId: "strawberry", score: 100 };
    const presentation = {
      startState: state(100, 1),
      steps: [step([], 100), step([clear], 200)],
      index: 1,
    };
    expect(getPresentationScore(presentation)).toBe(200);
    expect(getPresentationCakesCleared(presentation)).toBe(2);
  });

  it("empties transfer sources while the target waits for the step to end", () => {
    const transfer: GameEvent = {
      type: "transfer", sourceSlotId: "b2", targetSlotId: "b1", cakeTypeId: "strawberry", sliceCount: 1,
    };
    const start = state();
    const posts = state();
    const plate = { id: "p", slices: [{ cakeTypeId: "strawberry" as const }] };
    start.slots = start.slots.map((slot) => slot.id === "b2" ? { ...slot, plate } : slot);
    posts.slots = posts.slots.map((slot) => slot.id === "b2" ? { ...slot, plate: null } : slot);

    const presentation = {
      startState: start,
      steps: [{ state: posts, events: [transfer] }],
      index: 0,
    };
    const slots = getPresentationSlots(presentation);
    expect(slots.find((slot) => slot.id === ("b2" satisfies SlotId))?.plate).toBeNull();
  });
});
