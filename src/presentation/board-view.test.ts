import { describe, expect, it } from "vitest";
import { createEmptySlots } from "../game/geometry";
import type { CakeTypeId, ClearEvent, GameState, Plate, ResolveStep, SlotId, TransferEvent } from "../game/types";
import { buildBoardView, getSlotCenter } from "./board-view";
import type { Presentation } from "./model";

function plate(id: string, types: CakeTypeId[]): Plate {
  return { id, slices: types.map((cakeTypeId) => ({ cakeTypeId })) };
}

function state(plates: Partial<Record<SlotId, Plate>>): GameState {
  return {
    slots: createEmptySlots().map((slot) => ({ ...slot, plate: plates[slot.id] ?? null })),
    tray: [],
    score: 0,
    cakesCleared: 0,
    status: "playing",
    randomSeed: 1,
  };
}

const transfer: TransferEvent = {
  type: "transfer",
  sourceSlotId: "b2",
  targetSlotId: "b1",
  cakeTypeId: "strawberry",
  sliceCount: 1,
};
const clear: ClearEvent = { type: "clear", slotId: "b1", cakeTypeId: "strawberry", score: 100 };

function presentation(index: number): Presentation {
  const start = state({
    b1: plate("five", Array<CakeTypeId>(5).fill("strawberry")),
    b2: plate("one", ["strawberry"]),
  });
  const afterTransfer = state({ b1: plate("five", Array<CakeTypeId>(6).fill("strawberry")) });
  const afterClear = state({});
  const steps: ResolveStep[] = [
    { state: afterTransfer, events: [transfer] },
    { state: afterClear, events: [clear] },
  ];
  return { id: 7, placedSlotId: "b2", startState: start, steps, index };
}

describe("board view", () => {
  it("falls back to the settled board without a presentation", () => {
    const current = state({ b1: plate("one", ["lemon"]) });
    const view = buildBoardView({ slots: current.slots }, null);
    expect(view.slots).toBe(current.slots);
    expect(view.isAnimating).toBe(false);
    expect(view.flights).toEqual([]);
    expect(view.clearingSlotIds.size).toBe(0);
    expect(view.placedSlotId).toBeNull();
  });

  it("empties transfer sources and positions the flight while the target still waits", () => {
    const view = buildBoardView({ slots: [] }, presentation(0));

    expect(view.isAnimating).toBe(true);
    expect(view.placedSlotId).toBe("b2");
    expect(view.slots.find((slot) => slot.id === "b2")?.plate).toBeNull();
    expect(view.slots.find((slot) => slot.id === "b1")?.plate?.slices).toHaveLength(5);
    expect(view.flights).toEqual([{
      event: transfer,
      from: getSlotCenter("b2"),
      to: getSlotCenter("b1"),
    }]);
    expect(view.clearingSlotIds.size).toBe(0);
    expect(view.arrivedSlotIds.size).toBe(0);
  });

  it("marks the previous transfer target as arrived and the clearing slot during a clear step", () => {
    const view = buildBoardView({ slots: [] }, presentation(1));

    expect(view.placedSlotId).toBeNull();
    expect(view.slots.find((slot) => slot.id === "b1")?.plate?.slices).toHaveLength(6);
    expect(view.clearingSlotIds.has("b1")).toBe(true);
    expect(view.arrivedSlotIds.has("b1")).toBe(true);
    expect(view.flights).toEqual([]);
  });

  it("maps grid slots to percentage centers", () => {
    expect(getSlotCenter("a0")).toEqual({ x: 12.5, y: 10 });
    expect(getSlotCenter("e3")).toEqual({ x: 87.5, y: 90 });
  });
});
