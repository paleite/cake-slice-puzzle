import { describe, expect, it } from "vitest";
import { createEmptySlots } from "./geometry";
import { findTransfer } from "./transfers";
import type { CakeTypeId, GameState, Plate, SlotId } from "./types";

function plate(id: string, types: CakeTypeId[]): Plate {
  return { id, slices: types.map((cakeTypeId) => ({ cakeTypeId })) };
}

function state(plates: Partial<Record<SlotId, Plate>>): GameState {
  return { slots: createEmptySlots().map((slot) => ({ ...slot, plate: plates[slot.id] ?? null })), tray: [], score: 0, cakesCleared: 0, status: "playing", randomSeed: 1, focusedSlotId: null };
}

describe("findTransfer", () => {
  it("moves a full larger group into a smaller group with capacity", () => {
    const result = findTransfer(state({
      b1: plate("source", ["blueberry", "blueberry", "blueberry", "blueberry", "blueberry", "mint"]),
      b2: plate("target", ["blueberry", "blueberry"]),
    }));
    expect(result).toMatchObject({ sourceSlotId: "b1", targetSlotId: "b2", cakeTypeId: "blueberry", sliceCount: 4, completesCake: true });
  });

  it("uses the only plate with capacity", () => {
    const result = findTransfer(state({
      b1: plate("full", ["lemon", "lemon", "lemon", "strawberry", "mint", "orange"]),
      b2: plate("open", ["lemon"]),
    }));
    expect(result).toMatchObject({ sourceSlotId: "b1", targetSlotId: "b2", cakeTypeId: "lemon", sliceCount: 3 });
  });

  it("returns no transfer when both plates are full or share no type", () => {
    expect(findTransfer(state({ b1: plate("a", ["lemon", "strawberry", "mint", "orange", "chocolate", "blueberry"]), b2: plate("b", ["lemon", "strawberry", "mint", "orange", "chocolate", "blueberry"]) }))).toBeNull();
    expect(findTransfer(state({ b1: plate("a", ["lemon"]), b2: plate("b", ["mint"]) }))).toBeNull();
  });

  it("transfers only slices that fit and uses lower slot order for ties", () => {
    expect(findTransfer(state({ b1: plate("a", ["orange", "orange", "orange", "orange", "chocolate", "lemon"]), b2: plate("b", ["orange", "orange", "mint", "mint", "mint"]) }))).toMatchObject({ sourceSlotId: "b1", targetSlotId: "b2", sliceCount: 1 });
    expect(findTransfer(state({ b1: plate("a", ["strawberry", "strawberry"]), b2: plate("b", ["strawberry", "strawberry"]) }))).toMatchObject({ sourceSlotId: "b2", targetSlotId: "b1", sliceCount: 2 });
  });
});
