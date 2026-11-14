import { describe, expect, it } from "vitest";
import { createEmptySlots } from "../game/geometry";
import type { CakeTypeId, ClearEvent, GameState, Plate, ResolveStep, SlotId, TransferEvent } from "../game/types";
import { buildBoardView, getSlotCenter } from "./board-view";
import { resolveBoard } from "../game/resolver";
import type { Presentation, PresentationPhase } from "./model";

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

function presentation(index: number, phase: PresentationPhase = "rotate"): Presentation {
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
  return { id: 7, placedSlotId: "b2", startState: start, steps, index, phase };
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
    expect(view.plateRotations.size).toBe(0);
    expect(view.hiddenSliceIndexes.size).toBe(0);
  });

  it("makes room on the rotated target by hiding the incoming sorted wedges", () => {
    const view = buildBoardView({ slots: [] }, presentation(0, "rotate"));

    expect(view.isAnimating).toBe(true);
    expect(view.placedSlotId).toBe("b2");
    expect(view.slots.find((slot) => slot.id === "b2")?.plate?.slices).toHaveLength(1);
    expect(view.slots.find((slot) => slot.id === "b1")?.plate?.slices).toHaveLength(6);
    expect(view.hiddenSliceIndexes.get("b1")).toEqual(new Set([5]));
    expect(view.flights).toEqual([]);
    expect(view.clearingSlotIds.size).toBe(0);
    expect(view.arrivedSlotIds.size).toBe(0);
    expect(view.plateRotations.get("b2")).toBe(-120);
    expect(view.plateRotations.get("b1")).toBe(120);
  });

  it("empties transfer sources and lands flights in the hidden target wedges", () => {
    const view = buildBoardView({ slots: [] }, presentation(0, "resolve"));

    expect(view.placedSlotId).toBe("b2");
    expect(view.slots.find((slot) => slot.id === "b2")?.plate).toBeNull();
    expect(view.slots.find((slot) => slot.id === "b1")?.plate?.slices).toHaveLength(6);
    expect(view.hiddenSliceIndexes.get("b1")).toEqual(new Set([5]));
    expect(view.flights).toEqual([{
      event: transfer,
      from: getSlotCenter("b2"),
      to: getSlotCenter("b1"),
      spinFrom: 240,
      spinTo: 60,
    }]);
    expect(view.clearingSlotIds.size).toBe(0);
    expect(view.arrivedSlotIds.size).toBe(0);
    expect(view.plateRotations.get("b2")).toBe(-120);
  });

  it("creates one landing per transferred slice, each in the next hidden target wedge", () => {
    const start = state({
      b1: plate("two", Array<CakeTypeId>(2).fill("strawberry")),
      b2: plate("source", Array<CakeTypeId>(2).fill("strawberry")),
    });
    const transferTwo: TransferEvent = { ...transfer, sliceCount: 2 };
    const after = state({ b1: plate("four", Array<CakeTypeId>(4).fill("strawberry")) });
    const active: Presentation = {
      id: 8,
      placedSlotId: "b2",
      startState: start,
      steps: [{ state: after, events: [transferTwo] }],
      index: 0,
      phase: "resolve",
    };

    const view = buildBoardView({ slots: [] }, active);

    expect(view.flights).toHaveLength(2);
    expect(view.flights.map((flight) => [flight.spinFrom, flight.spinTo])).toEqual([
      [240, 60],
      [240, 120],
    ]);
    expect(view.hiddenSliceIndexes.get("b1")).toEqual(new Set([2, 3]));
  });

  it("hides the incoming wedge at its color-sorted position", () => {
    const start = state({
      b1: plate("target", ["lemon", "strawberry"]),
      b2: plate("source", ["blueberry", "lemon"]),
    });
    const after = state({
      b1: plate("target", ["lemon", "strawberry", "lemon"]),
      b2: plate("source", ["blueberry"]),
    });
    const transferLemon: TransferEvent = { ...transfer, cakeTypeId: "lemon" };
    const active: Presentation = {
      id: 9,
      placedSlotId: "b2",
      startState: start,
      steps: [{ state: after, events: [transferLemon] }],
      index: 0,
      phase: "resolve",
    };

    const view = buildBoardView({ slots: [] }, active);

    expect(view.slots.find((slot) => slot.id === "b1")?.plate?.slices).toHaveLength(3);
    expect(view.hiddenSliceIndexes.get("b1")).toEqual(new Set([1]));
    expect(view.plateRotations.get("b1")).toBe(0);
  });

  it("marks the previous transfer target as arrived and the clearing slot during a clear step", () => {
    const view = buildBoardView({ slots: [] }, presentation(1, "resolve"));

    expect(view.placedSlotId).toBeNull();
    expect(view.slots.find((slot) => slot.id === "b1")?.plate?.slices).toHaveLength(6);
    expect(view.hiddenSliceIndexes.size).toBe(0);
    expect(view.clearingSlotIds.has("b1")).toBe(true);
    expect(view.arrivedSlotIds.has("b1")).toBe(true);
    expect(view.flights).toEqual([]);
  });


  it("keeps the two-way blueberry/strawberry swap rotations aligned", () => {
    const start = state({
      a0: plate("orange-five", ["orange", "orange", "orange", "orange", "orange"]),
      a1: plate("origin", ["blueberry", "strawberry", "orange"]),
      a2: plate("right", ["blueberry", "strawberry"]),
    });
    const result = resolveBoard(start, "a1");
    const base: Presentation = {
      id: 12,
      placedSlotId: "a1",
      startState: start,
      steps: result.steps,
      index: 2,
      phase: "rotate",
    };

    const blueRotate = buildBoardView({ slots: [] }, base);
    expect(blueRotate.plateRotations.get("a1")).toBe(0);
    expect(blueRotate.plateRotations.get("a2")).toBe(-120);

    const blueResolve = buildBoardView({ slots: [] }, { ...base, phase: "resolve" });
    expect(blueResolve.flights.map((flight) => [
      flight.event.sourceSlotId,
      flight.event.targetSlotId,
      flight.event.cakeTypeId,
      flight.spinFrom,
      flight.spinTo,
    ])).toEqual([["a2", "a1", "blueberry", 240, 60]]);

    const red: Presentation = { ...base, index: 3 };
    const redRotate = buildBoardView({ slots: [] }, red);
    expect(redRotate.plateRotations.get("a1")).toBe(-60);
    expect(redRotate.plateRotations.get("a2")).toBe(180);

    const redResolve = buildBoardView({ slots: [] }, { ...red, phase: "resolve" });
    expect(redResolve.flights.map((flight) => [
      flight.event.sourceSlotId,
      flight.event.targetSlotId,
      flight.event.cakeTypeId,
      flight.spinFrom,
      flight.spinTo,
    ])).toEqual([["a1", "a2", "strawberry", 60, -120]]);
  });

  it("settles plates back to their base rotation after the final step", () => {
    const view = buildBoardView({ slots: [] }, presentation(2, "settle"));

    expect(view.isAnimating).toBe(true);
    expect(view.placedSlotId).toBeNull();
    expect(view.slots.every((slot) => slot.plate === null)).toBe(true);
    expect(view.plateRotations.size).toBe(0);
    expect(view.hiddenSliceIndexes.size).toBe(0);
    expect(view.flights).toEqual([]);
    expect(view.clearingSlotIds.size).toBe(0);
  });

  it("maps grid slots to percentage centers", () => {
    expect(getSlotCenter("a0")).toEqual({ x: 12.5, y: 10 });
    expect(getSlotCenter("e3")).toEqual({ x: 87.5, y: 90 });
  });
});
