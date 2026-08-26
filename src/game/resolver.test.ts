import { describe, expect, it } from "vitest";
import { createEmptySlots } from "./geometry";
import { resolveBoard } from "./resolver";
import type { CakeTypeId, GameState, Plate, SlotId } from "./types";

function plate(id: string, types: CakeTypeId[]): Plate {
  return { id, slices: types.map((cakeTypeId) => ({ cakeTypeId })) };
}

function state(plates: Partial<Record<SlotId, Plate>>): GameState {
  return { slots: createEmptySlots().map((slot) => ({ ...slot, plate: plates[slot.id] ?? null })), tray: [], score: 0, cakesCleared: 0, status: "playing", randomSeed: 1, focusedSlotId: null };
}

describe("resolveBoard", () => {
  it("transfers from a full mixed plate, then clears the completed neighboring cake", () => {
    const result = resolveBoard(state({
      b1: plate("source", ["blueberry", "blueberry", "blueberry", "blueberry", "blueberry", "mint"]),
      b2: plate("target", ["blueberry", "blueberry"]),
    }), "b2");
    expect(result.events[0]).toMatchObject({ type: "transfer", sourceSlotId: "b1", targetSlotId: "b2", cakeTypeId: "blueberry", sliceCount: 4 });
    expect(result.events[1]).toEqual({ type: "clear", slotId: "b2", cakeTypeId: "blueberry", score: 100 });
    expect(result.state.slots.find((slot) => slot.id === "b1")?.plate?.slices.map((slice) => slice.cakeTypeId)).toEqual(["blueberry", "mint"]);
    expect(result.state.slots.find((slot) => slot.id === "b2")?.plate).toBeNull();
    expect(result.state.cakesCleared).toBe(1);
    expect(result.state.status).toBe("playing");
  });

  it("does not relay one cake type through the placed plate", () => {
    const result = resolveBoard(state({
      b0: plate("left", ["blueberry", "blueberry", "blueberry", "blueberry", "blueberry", "mint"]),
      b1: plate("origin", ["blueberry", "blueberry", "lemon"]),
      b2: plate("right", ["blueberry"]),
    }), "b1");
    const blueberryTransfers = result.events.filter((event) => event.type === "transfer" && event.cakeTypeId === "blueberry");
    expect(blueberryTransfers).toHaveLength(1);
    expect(blueberryTransfers[0]).toMatchObject({ sourceSlotId: "b0", targetSlotId: "b1", sliceCount: 3 });
    expect(result.state.slots.find((slot) => slot.id === "b2")?.plate?.slices.map((slice) => slice.cakeTypeId)).toEqual(["blueberry"]);
  });

  it("allows different cake types to resolve with different direct neighbors", () => {
    const result = resolveBoard(state({
      b0: plate("left", ["orange", "orange", "orange"]),
      b1: plate("origin", ["orange", "lemon"]),
      b2: plate("right", ["lemon", "lemon", "lemon"]),
    }), "b1");
    const transfers = result.events.filter((event) => event.type === "transfer");
    expect(transfers).toHaveLength(2);
    expect(transfers).toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceSlotId: "b1", targetSlotId: "b0", cakeTypeId: "orange", sliceCount: 1 }),
      expect.objectContaining({ sourceSlotId: "b1", targetSlotId: "b2", cakeTypeId: "lemon", sliceCount: 1 }),
    ]));
  });
});
