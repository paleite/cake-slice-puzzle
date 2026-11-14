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
    tray: [], score: 0, cakesCleared: 0, status: "playing", randomSeed: 1,
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

  it("resolves the same cake type again when a clear unlocks another merge", () => {
    const result = resolveBoard(state({
      a1: plate("five", ["strawberry", "strawberry", "strawberry", "strawberry", "strawberry"]),
      a2: plate("feeder", ["strawberry"]),
      b1: plate("origin", ["strawberry", "lemon"]),
      b2: plate("tail", ["strawberry"]),
    }), "b1");

    expect(result.events.map((event) => event.type === "transfer"
      ? `${event.sourceSlotId}>${event.targetSlotId}x${event.sliceCount}`
      : `clear:${event.slotId}`)).toEqual(["a2>a1x1", "clear:a1", "b1>b2x1"]);
    expect(cakeTypesAt(result.state, "b1")).toEqual(["lemon"]);
    expect(cakeTypesAt(result.state, "b2")).toEqual(["strawberry", "strawberry"]);
  });

  it("groups resolution events into ordered animation steps", () => {
    const result = resolveBoard(state({
      a1: plate("five", ["strawberry", "strawberry", "strawberry", "strawberry", "strawberry"]),
      a2: plate("feeder", ["strawberry"]),
      b1: plate("origin", ["strawberry", "lemon"]),
      b2: plate("tail", ["strawberry"]),
    }), "b1");

    expect(result.steps.map((step) => step.events.map((event) => event.type))).toEqual([
      ["transfer"],
      ["clear"],
      ["transfer"],
    ]);
    expect(result.steps.flatMap((step) => step.events)).toEqual(result.events);
    expect(result.steps.at(-1)?.state.slots).toEqual(result.state.slots);
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

  it("clears the full orange target, then swaps blueberry and strawberry between the remaining pair", () => {
    const result = resolveBoard(state({
      a0: plate("orange-five", ["orange", "orange", "orange", "orange", "orange"]),
      a1: plate("origin", ["blueberry", "strawberry", "orange"]),
      a2: plate("right", ["blueberry", "strawberry"]),
    }), "a1");

    expect(result.events.map((event) => event.type === "transfer"
      ? `${event.sourceSlotId}>${event.targetSlotId}x${event.sliceCount}:${event.cakeTypeId}`
      : `clear:${event.slotId}`)).toEqual([
      "a1>a0x1:orange",
      "clear:a0",
      "a2>a1x1:blueberry",
      "a1>a2x1:strawberry",
    ]);
    expect(cakeTypesAt(result.state, "a0")).toEqual([]);
    expect(cakeTypesAt(result.state, "a1")).toEqual(["blueberry", "blueberry"]);
    expect(cakeTypesAt(result.state, "a2")).toEqual(["strawberry", "strawberry"]);
    expect(result.state.cakesCleared).toBe(1);
    expect(result.state.score).toBe(100);
  });
});
