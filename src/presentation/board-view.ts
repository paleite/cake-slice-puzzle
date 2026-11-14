import { SLOT_LAYOUT } from "../game/geometry";
import type { BoardSlot, CakeTypeId, GameState, SlotId, TransferEvent } from "../game/types";
import { getPresentationFrame, getPresentationStep, type Presentation } from "./model";
import {
  getIncomingRotation,
  getSliceStartAngle,
  getSourceRotation,
  normalizeAngle,
  sortSlicesByType,
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
  hiddenSliceIndexes: ReadonlyMap<SlotId, ReadonlySet<number>>;
};

type IncomingWedge = {
  cakeTypeId: CakeTypeId;
  indexes: number[];
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

function getIncomingWedges(presentation: Presentation, stepIndex: number): ReadonlyMap<SlotId, IncomingWedge> {
  const incoming = new Map<SlotId, IncomingWedge>();
  const step = presentation.steps[stepIndex];
  if (step === undefined) return incoming;

  const counts = new Map<SlotId, { cakeTypeId: CakeTypeId; count: number }>();
  for (const event of step.events) {
    if (event.type !== "transfer") continue;
    const existing = counts.get(event.targetSlotId);
    if (existing === undefined) {
      counts.set(event.targetSlotId, { cakeTypeId: event.cakeTypeId, count: event.sliceCount });
    } else {
      existing.count += event.sliceCount;
    }
  }

  const postSlots = new Map(step.state.slots.map((slot) => [slot.id, slot]));
  for (const [targetSlotId, { cakeTypeId, count }] of counts) {
    const postPlate = postSlots.get(targetSlotId)?.plate;
    if (postPlate === null || postPlate === undefined) continue;
    const sorted = sortSlicesByType(postPlate.slices);
    const indexes: number[] = [];
    for (let index = sorted.length - 1; index >= 0 && indexes.length < count; index -= 1) {
      if (sorted[index].cakeTypeId === cakeTypeId) indexes.push(index);
    }
    incoming.set(targetSlotId, { cakeTypeId, indexes: indexes.reverse() });
  }
  return incoming;
}

function getDisplaySlots(
  presentation: Presentation,
  incoming: ReadonlyMap<SlotId, IncomingWedge>,
): readonly BoardSlot[] {
  const frameSlots = getPresentationFrame(presentation).slots;
  const step = getPresentationStep(presentation);
  if (step === undefined) return frameSlots;

  const sourceSlotIds = new Set<SlotId>();
  for (const event of step.events) {
    if (event.type === "transfer") sourceSlotIds.add(event.sourceSlotId);
  }

  const postStepSlots = new Map(step.state.slots.map((slot) => [slot.id, slot]));
  return frameSlots.map((slot) => {
    if (incoming.has(slot.id)) return postStepSlots.get(slot.id) ?? slot;
    if (presentation.phase === "resolve" && sourceSlotIds.has(slot.id)) {
      return postStepSlots.get(slot.id) ?? slot;
    }
    return slot;
  });
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
  const incoming = getIncomingWedges(presentation, stepIndex);

  for (const event of step.events) {
    if (event.type !== "transfer") continue;
    const source = getSlotCenter(event.sourceSlotId);
    const target = getSlotCenter(event.targetSlotId);
    const sourcePlate = plates.get(event.sourceSlotId);

    if (sourcePlate !== null && sourcePlate !== undefined && !rotations.has(event.sourceSlotId)) {
      rotations.set(
        event.sourceSlotId,
        getSourceRotation(sourcePlate, event.cakeTypeId, source, target),
      );
    }
    if (!rotations.has(event.targetSlotId)) {
      const firstIncoming = incoming.get(event.targetSlotId)?.indexes[0];
      if (firstIncoming !== undefined) {
        rotations.set(
          event.targetSlotId,
          getIncomingRotation(firstIncoming, source, target),
        );
      }
    }
  }
  return rotations;
}

function getFlights(
  presentation: Presentation,
  incoming: ReadonlyMap<SlotId, IncomingWedge>,
): readonly SliceFlightView[] {
  if (presentation.phase !== "resolve") return [];
  const step = getPresentationStep(presentation);
  if (step === undefined) return [];

  const frame = presentation.index === 0
    ? presentation.startState
    : presentation.steps[presentation.index - 1].state;
  const plates = new Map(frame.slots.map((slot) => [slot.id, slot.plate]));
  const rotations = getStepRotations(presentation, presentation.index);
  const consumed = new Map<SlotId, number>();
  const flights: SliceFlightView[] = [];

  for (const event of step.events) {
    if (event.type !== "transfer") continue;
    const sourcePlate = plates.get(event.sourceSlotId);
    if (sourcePlate === null || sourcePlate === undefined) continue;

    const from = getSlotCenter(event.sourceSlotId);
    const to = getSlotCenter(event.targetSlotId);
    const sourceRotation = rotations.get(event.sourceSlotId) ?? 0;
    const targetRotation = rotations.get(event.targetSlotId) ?? 0;
    const spinFrom = normalizeAngle(getSliceStartAngle(sourcePlate, event.cakeTypeId) + sourceRotation);
    const incomingIndexes = incoming.get(event.targetSlotId)?.indexes ?? [];

    for (let sliceIndex = 0; sliceIndex < event.sliceCount; sliceIndex += 1) {
      const consumedCount = consumed.get(event.targetSlotId) ?? 0;
      const incomingIndex = incomingIndexes[consumedCount];
      consumed.set(event.targetSlotId, consumedCount + 1);
      if (incomingIndex === undefined) continue;

      const freeStart = normalizeAngle(incomingIndex * 60 + targetRotation);
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

function getHiddenSliceIndexes(
  presentation: Presentation,
  incoming: ReadonlyMap<SlotId, IncomingWedge>,
): ReadonlyMap<SlotId, ReadonlySet<number>> {
  const hidden = new Map<SlotId, ReadonlySet<number>>();
  if (presentation.phase === "settle") return hidden;
  for (const [slotId, wedge] of incoming) {
    hidden.set(slotId, new Set(wedge.indexes));
  }
  return hidden;
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
      hiddenSliceIndexes: new Map(),
    };
  }

  const step = getPresentationStep(presentation);
  const incoming = presentation.phase === "settle" || step === undefined
    ? new Map<SlotId, IncomingWedge>()
    : getIncomingWedges(presentation, presentation.index);
  const clearingSlotIds = new Set<SlotId>();
  for (const event of presentation.phase === "resolve" ? step?.events ?? [] : []) {
    if (event.type === "clear") clearingSlotIds.add(event.slotId);
  }

  return {
    slots: getDisplaySlots(presentation, incoming),
    isAnimating: true,
    stepIndex: presentation.index,
    placedSlotId: presentation.phase !== "settle" && presentation.index === 0
      ? presentation.placedSlotId
      : null,
    clearingSlotIds,
    arrivedSlotIds: getArrivedSlotIds(presentation),
    flights: getFlights(presentation, incoming),
    plateRotations: getPlateRotations(presentation),
    hiddenSliceIndexes: getHiddenSliceIndexes(presentation, incoming),
  };
}
