import { describe, expect, it } from "vitest";
import { createEmptySlots } from "./geometry";
import { resolveBoard } from "./resolver";
import type { CakeTypeId, GameState, Plate, SlotId } from "./types";

function plate(id: string, cakeTypeIds: CakeTypeId[]): Plate {
  return { id, slices: cakeTypeIds.map((cakeTypeId) => ({ cakeTypeId })) };
}

function state(plates: Partial<Record<SlotId, Plate>>): GameState {
  return {
    slots: createEmptySlots().map((slot) => ({ ...slot, plate: plates[slot.id] ?? null })),
    tray: [], score: 0, cakesCleared: 0, status: "playing", randomSeed: 1, focusedSlotId: null,
  };
}

function cakeTypesAt(gameState: GameState, slotId: SlotId): CakeTypeId[] {
  return gameState.slots.find((slot) => slot.id === slotId)?.plate?.slices.map((slice) => slice.cakeTypeId) ?? [];
}

describe("resolveBoard matching propagation", () => {
  it.each([
    {
      name: "two adjacent groups consolidate into the larger matching group", originSlotId: "b1" as SlotId,
      plates: { b1: plate("origin", ["strawberry"]), b2: plate("right", ["strawberry", "strawberry", "strawberry"]) },
      expected: { b1: [], b2: ["strawberry", "strawberry", "strawberry", "strawberry"] }, expectedCakeClears: 0,
    },
    {
      name: "full larger group transfers into the only neighbor with capacity", originSlotId: "b2" as SlotId,
      plates: { b1: plate("full", ["blueberry", "blueberry", "blueberry", "blueberry", "blueberry", "mint"]), b2: plate("origin", ["blueberry", "blueberry"]) },
      expected: { b1: ["blueberry", "mint"], b2: [] }, expectedCakeClears: 1,
    },
    {
      name: "matching slices propagate through a three-plate chain", originSlotId: "b1" as SlotId,
      plates: { b0: plate("left", ["strawberry", "strawberry", "strawberry"]), b1: plate("origin", ["strawberry"]), b2: plate("right", ["strawberry"]) },
      expected: { b0: ["strawberry", "strawberry", "strawberry", "strawberry", "strawberry"], b1: [], b2: [] }, expectedCakeClears: 0,
    },
    {
      name: "bridge placement consumes both matching branches before bridge disappears", originSlotId: "c2" as SlotId,
      plates: { c1: plate("left-green", ["mint"]), c2: plate("origin", ["mint", "strawberry"]), c3: plate("right-red", ["strawberry", "strawberry"]), d2: plate("below-red", ["strawberry"]) },
      expected: { c1: ["mint", "mint"], c2: [], c3: ["strawberry", "strawberry", "strawberry", "strawberry"], d2: [] }, expectedCakeClears: 0,
    },
    {
      name: "different cake types propagate independently through different neighbors", originSlotId: "b1" as SlotId,
      plates: { b0: plate("left", ["orange", "orange", "orange"]), b1: plate("origin", ["orange", "lemon"]), b2: plate("right", ["lemon", "lemon", "lemon"]) },
      expected: { b0: ["orange", "orange", "orange", "orange"], b1: [], b2: ["lemon", "lemon", "lemon", "lemon"] }, expectedCakeClears: 0,
    },
  ])("$name", ({ originSlotId, plates, expected, expectedCakeClears }) => {
    const result = resolveBoard(state(plates), originSlotId);
    for (const [slotId, cakeTypeIds] of Object.entries(expected)) {
      expect(cakeTypesAt(result.state, slotId as SlotId)).toEqual(cakeTypeIds);
    }
    expect(result.state.cakesCleared).toBe(expectedCakeClears);
    expect(result.state.status).toBe("playing");
  });

  it("keeps every branch in the frozen component even when the origin becomes empty", () => {
    const result = resolveBoard(state({
      c2: plate("origin", ["strawberry"]), c3: plate("strong-target", ["strawberry", "strawberry"]), d2: plate("outer-source", ["strawberry"]),
    }), "c2");
    const strawberryTransfers = result.events.filter((event) => event.type === "transfer" && event.cakeTypeId === "strawberry");
    expect(strawberryTransfers).toHaveLength(2);
    expect(cakeTypesAt(result.state, "c2")).toEqual([]);
    expect(cakeTypesAt(result.state, "d2")).toEqual([]);
    expect(cakeTypesAt(result.state, "c3")).toEqual(["strawberry", "strawberry", "strawberry", "strawberry"]);
  });
});
