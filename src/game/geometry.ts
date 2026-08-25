import type { BoardSlot, SlotId } from "./types";

export const SLOT_LAYOUT: ReadonlyArray<Omit<BoardSlot, "plate">> = [
  { id: "a0", row: 0, column: 0 },
  { id: "a1", row: 0, column: 1 },
  { id: "a2", row: 0, column: 2 },
  { id: "a3", row: 0, column: 3 },
  { id: "b0", row: 1, column: 0 },
  { id: "b1", row: 1, column: 1 },
  { id: "b2", row: 1, column: 2 },
  { id: "b3", row: 1, column: 3 },
  { id: "c0", row: 2, column: 0 },
  { id: "c1", row: 2, column: 1 },
  { id: "c2", row: 2, column: 2 },
  { id: "c3", row: 2, column: 3 },
  { id: "d0", row: 3, column: 0 },
  { id: "d1", row: 3, column: 1 },
  { id: "d2", row: 3, column: 2 },
  { id: "d3", row: 3, column: 3 },
  { id: "e0", row: 4, column: 0 },
  { id: "e1", row: 4, column: 1 },
  { id: "e2", row: 4, column: 2 },
  { id: "e3", row: 4, column: 3 },
];

const adjacency: Record<SlotId, readonly SlotId[]> = {
  a0: ["a1", "b0"], a1: ["a0", "a2", "b1"], a2: ["a1", "a3", "b2"], a3: ["a2", "b3"],
  b0: ["a0", "b1", "c0"], b1: ["a1", "b0", "b2", "c1"], b2: ["a2", "b1", "b3", "c2"], b3: ["a3", "b2", "c3"],
  c0: ["b0", "c1", "d0"], c1: ["b1", "c0", "c2", "d1"], c2: ["b2", "c1", "c3", "d2"], c3: ["b3", "c2", "d3"],
  d0: ["c0", "d1", "e0"], d1: ["c1", "d0", "d2", "e1"], d2: ["c2", "d1", "d3", "e2"], d3: ["c3", "d2", "e3"],
  e0: ["d0", "e1"], e1: ["d1", "e0", "e2"], e2: ["d2", "e1", "e3"], e3: ["d3", "e2"],
};

export function createEmptySlots(): BoardSlot[] {
  return SLOT_LAYOUT.map((slot) => ({ ...slot, plate: null }));
}

export function getAdjacentSlotIds(slotId: SlotId): readonly SlotId[] {
  return adjacency[slotId];
}
