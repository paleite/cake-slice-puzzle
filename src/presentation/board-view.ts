import { SLOT_LAYOUT } from "../game/geometry";
import type { BoardSlot, GameState, SlotId, TransferEvent } from "../game/types";
import { getPresentationFrame, getPresentationStep, type Presentation } from "./model";
import {
  getSliceStartAngle,
  getSourceRotation,
  getTargetRotation,
  normalizeAngle,
} from "./plate-geometry";

export type SlotCenter = {
  x: number;
  y: number;
};

export type SliceFlightView = {
  event: TransferEvent;
  from: SlotCenter;
  to: SlotCenter;
  spinFrom: number;
  spinTo: number;
};

export type BoardView = {
  slots: readonly BoardSlot[];
  isAnimating: boolean;
  stepIndex: number;
  placedSlotId: SlotId | null;
  clearingSlotIds: ReadonlySet<SlotId>;
  arrivedSlotIds: ReadonlySet<SlotId>;
  flights: readonly SliceFlightView[];
  plateRotations: ReadonlyMap<SlotId, number>;
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
  if (presentation.phase !== "resolve") return frameSlots;

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

function getStepRotations(presentation: Presentation, stepIndex: number): ReadonlyMap<SlotId, number> {
  const rotations = new Map<SlotId, number>();
  const step = presentation.steps[stepIndex];
  if (step === undefined) return rotations;

  const frame = stepIndex === 0 ? presentation.startState : presentation.steps[stepIndex - 1].state;
  const plates = new Map(frame.slots.map((slot) => [slot.id, slot.plate]));

  for (const event of step.events) {
    if (event.type !== "transfer") continue;
    const source = getSlotCenter(event.sourceSlotId);
    const target = getSlotCenter(event.targetSlotId);
    const sourcePlate = plates.get(event.sourceSlotId);
    const targetPlate = plates.get(event.targetSlotId);

    if (sourcePlate !== null && sourcePlate !== undefined) {
      rotations.set(
        event.sourceSlotId,
        getSourceRotation(sourcePlate, event.cakeTypeId, source, target),
      );
    }
    if (targetPlate !== null && targetPlate !== undefined && targetPlate.slices.length < 6) {
      rotations.set(event.targetSlotId, getTargetRotation(targetPlate, source, target));
    }
  }
  return rotations;
}

function getFlights(presentation: Presentation): readonly SliceFlightView[] {
  if (presentation.phase !== "resolve") return [];
  const step = getPresentationStep(presentation);
  if (step === undefined) return [];

  const frame = presentation.index === 0
    ? presentation.startState
    : presentation.steps[presentation.index - 1].state;
  const plates = new Map(frame.slots.map((slot) => [slot.id, slot.plate]));
  const rotations = getStepRotations(presentation, presentation.index);
  const incomingCounts = new Map<SlotId, number>();
  const flights: SliceFlightView[] = [];

  for (const event of step.events) {
    if (event.type !== "transfer") continue;
    const sourcePlate = plates.get(event.sourceSlotId);
    const targetPlate = plates.get(event.targetSlotId);
    if (sourcePlate === null || sourcePlate === undefined) continue;
    if (targetPlate === null || targetPlate === undefined) continue;

    const from = getSlotCenter(event.sourceSlotId);
    const to = getSlotCenter(event.targetSlotId);
    const sourceRotation = rotations.get(event.sourceSlotId) ?? 0;
    const targetRotation = rotations.get(event.targetSlotId) ?? 0;
    const spinFrom = normalizeAngle(getSliceStartAngle(sourcePlate, event.cakeTypeId) + sourceRotation);
    const firstFreeWedge = targetPlate.slices.length + (incomingCounts.get(event.targetSlotId) ?? 0);

    for (let sliceIndex = 0; sliceIndex < event.sliceCount; sliceIndex += 1) {
      const freeStart = normalizeAngle((firstFreeWedge + sliceIndex) * 60 + targetRotation);
      let delta = ((freeStart - spinFrom + 540) % 360) - 180;
      if (Math.abs(delta) < 45) delta += delta <= 0 ? -360 : 360;
      flights.push({
        event,
        from,
        to,
        spinFrom,
        spinTo: spinFrom + delta,
      });
    }

    incomingCounts.set(
      event.targetSlotId,
      (incomingCounts.get(event.targetSlotId) ?? 0) + event.sliceCount,
    );
  }
  return flights;
}

function getPlateRotations(presentation: Presentation): ReadonlyMap<SlotId, number> {
  const rotations = new Map<SlotId, number>();
  if (presentation.phase === "settle") return rotations;

  for (let stepIndex = 0; stepIndex <= presentation.index; stepIndex += 1) {
    for (const [slotId, angle] of getStepRotations(presentation, stepIndex)) {
      rotations.set(slotId, angle);
    }
  }
  return rotations;
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
      plateRotations: new Map(),
    };
  }

  const step = getPresentationStep(presentation);
  const clearingSlotIds = new Set<SlotId>();
  for (const event of presentation.phase === "resolve" ? step?.events ?? [] : []) {
    if (event.type === "clear") clearingSlotIds.add(event.slotId);
  }

  return {
    slots: getDisplaySlots(presentation),
    isAnimating: true,
    stepIndex: presentation.index,
    placedSlotId: presentation.phase !== "settle" && presentation.index === 0
      ? presentation.placedSlotId
      : null,
    clearingSlotIds,
    arrivedSlotIds: getArrivedSlotIds(presentation),
    flights: getFlights(presentation),
    plateRotations: getPlateRotations(presentation),
  };
}
