import { SLOT_LAYOUT } from "../game/geometry";
import type { BoardSlot, GameState, SlotId, TransferEvent } from "../game/types";
import { getPresentationFrame, getPresentationStep, type Presentation } from "./model";

export type SlotCenter = {
  x: number;
  y: number;
};

export type SliceFlightView = {
  event: TransferEvent;
  from: SlotCenter;
  to: SlotCenter;
};

export type BoardView = {
  slots: readonly BoardSlot[];
  isAnimating: boolean;
  stepIndex: number;
  placedSlotId: SlotId | null;
  clearingSlotIds: ReadonlySet<SlotId>;
  arrivedSlotIds: ReadonlySet<SlotId>;
  flights: readonly SliceFlightView[];
};

const slotPositions = new Map(SLOT_LAYOUT.map((slot) => [slot.id, slot]));

export function getSlotCenter(slotId: SlotId): SlotCenter {
  const slot = slotPositions.get(slotId);
  if (slot === undefined) return { x: 50, y: 50 };
  return {
    x: (slot.column + 0.5) * 25,
    y: (slot.row + 0.5) * 20,
  };
}

function getDisplaySlots(presentation: Presentation): readonly BoardSlot[] {
  const frameSlots = getPresentationFrame(presentation).slots;
  const step = getPresentationStep(presentation);
  if (step === undefined) return frameSlots;

  const sourceSlotIds = new Set<SlotId>();
  for (const event of step.events) {
    if (event.type === "transfer") sourceSlotIds.add(event.sourceSlotId);
  }
  if (sourceSlotIds.size === 0) return frameSlots;

  // Sources empty as their slices take flight; the target only fills once the step ends.
  const postStepSlots = new Map(step.state.slots.map((slot) => [slot.id, slot]));
  return frameSlots.map((slot) =>
    sourceSlotIds.has(slot.id) ? postStepSlots.get(slot.id) ?? slot : slot
  );
}

function getArrivedSlotIds(presentation: Presentation): ReadonlySet<SlotId> {
  const arrivedSlotIds = new Set<SlotId>();
  if (presentation.index === 0) return arrivedSlotIds;

  const previousStep = presentation.steps[presentation.index - 1];
  for (const event of previousStep?.events ?? []) {
    if (event.type === "transfer") arrivedSlotIds.add(event.targetSlotId);
  }
  return arrivedSlotIds;
}

function getFlights(presentation: Presentation): readonly SliceFlightView[] {
  const step = getPresentationStep(presentation);
  if (step === undefined) return [];

  const flights: SliceFlightView[] = [];
  for (const event of step.events) {
    if (event.type !== "transfer") continue;
    flights.push({
      event,
      from: getSlotCenter(event.sourceSlotId),
      to: getSlotCenter(event.targetSlotId),
    });
  }
  return flights;
}

export function buildBoardView(state: Pick<GameState, "slots">, presentation: Presentation | null): BoardView {
  if (presentation === null) {
    return {
      slots: state.slots,
      isAnimating: false,
      stepIndex: 0,
      placedSlotId: null,
      clearingSlotIds: new Set(),
      arrivedSlotIds: new Set(),
      flights: [],
    };
  }

  const step = getPresentationStep(presentation);
  const clearingSlotIds = new Set<SlotId>();
  for (const event of step?.events ?? []) {
    if (event.type === "clear") clearingSlotIds.add(event.slotId);
  }

  return {
    slots: getDisplaySlots(presentation),
    isAnimating: true,
    stepIndex: presentation.index,
    placedSlotId: presentation.index === 0 ? presentation.placedSlotId : null,
    clearingSlotIds,
    arrivedSlotIds: getArrivedSlotIds(presentation),
    flights: getFlights(presentation),
  };
}
