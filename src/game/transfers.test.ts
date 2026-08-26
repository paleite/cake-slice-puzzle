import { describe, expect, it } from "vitest";
import { createEmptySlots } from "./geometry";
import { findMergeCandidate, getMatchingComponentSlotIds } from "./transfers";
import type { CakeTypeId, GameState, Plate, SlotId } from "./types";

function plate(id: string, types: CakeTypeId[]): Plate { return { id, slices: types.map((cakeTypeId) => ({ cakeTypeId })) }; }
function state(plates: Partial<Record<SlotId, Plate>>): GameState {
  return { slots: createEmptySlots().map((slot) => ({ ...slot, plate: plates[slot.id] ?? null })), tray: [], score: 0, cakesCleared: 0, status: "playing", randomSeed: 1, focusedSlotId: null };
}

describe("findMergeCandidate", () => {
  it("collects all matching plates in one connected component", () => {
    const gameState = state({ c1: plate("left", ["mint"]), c2: plate("origin", ["mint", "strawberry"]), c3: plate("right", ["strawberry", "strawberry"]), d2: plate("below", ["strawberry"]) });
    expect(getMatchingComponentSlotIds(gameState, "c2", "strawberry")).toEqual(["c2", "c3", "d2"]);
  });

  it("merges a full connected component into its largest open target", () => {
    const result = findMergeCandidate(state({ b0: plate("left", ["blueberry", "blueberry", "blueberry", "blueberry", "blueberry", "mint"]), b1: plate("origin", ["blueberry", "blueberry", "lemon"]), b2: plate("right", ["blueberry"])}), "b1", new Set());
    expect(result).toMatchObject({ cakeTypeId: "blueberry", targetSlotId: "b1" });
    expect(result?.transfers).toEqual([{ type: "transfer", sourceSlotId: "b0", targetSlotId: "b1", cakeTypeId: "blueberry", sliceCount: 3 }]);
  });

  it("uses capacity before group size and supports partial contribution", () => {
    const result = findMergeCandidate(state({ b0: plate("full", ["orange", "orange", "orange", "orange", "chocolate", "lemon"]), b1: plate("origin", ["orange", "orange", "mint", "mint", "mint"])}), "b1", new Set());
    expect(result).toMatchObject({ targetSlotId: "b1", cakeTypeId: "orange" });
    expect(result?.transfers[0]).toMatchObject({ sourceSlotId: "b0", sliceCount: 1 });
  });

  it("ignores excluded types and disconnected matching pairs", () => {
    const gameState = state({ a0: plate("left", ["lemon"]), a1: plate("right", ["lemon", "lemon", "lemon"]), c1: plate("origin", ["mint"]) });
    expect(findMergeCandidate(gameState, "c1", new Set())).toBeNull();
    expect(findMergeCandidate(state({ b0: plate("left", ["blueberry", "blueberry"]), b1: plate("origin", ["blueberry"]) }), "b1", new Set(["blueberry"]))).toBeNull();
  });
});
