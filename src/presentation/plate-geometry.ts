import type { CakeTypeId, Plate } from "../game/types";
import type { SlotCenter } from "./board-view";

const WEDGE_COUNT = 6;
const DEGREES_PER_WEDGE = 360 / WEDGE_COUNT;

function normalizeDegrees(degrees: number): number {
  const normalized = ((degrees % 360) + 360) % 360;
  return normalized > 180 ? normalized - 360 : normalized;
}

export function normalizeAngle(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

export function getSliceStartAngle(plate: Plate, cakeTypeId: CakeTypeId): number {
  const index = plate.slices.findIndex((slice) => slice.cakeTypeId === cakeTypeId);
  return (index < 0 ? 0 : index) * DEGREES_PER_WEDGE;
}

export function getSliceCenterAngle(plate: Plate, cakeTypeId: CakeTypeId): number {
  return getSliceStartAngle(plate, cakeTypeId) + DEGREES_PER_WEDGE / 2;
}

export function getFreeWedgeCenterAngle(plate: Plate): number {
  return plate.slices.length * DEGREES_PER_WEDGE + DEGREES_PER_WEDGE / 2;
}

export function getDirectionDegrees(from: SlotCenter, to: SlotCenter): number {
  return normalizeDegrees(Math.atan2(to.x - from.x, from.y - to.y) * (180 / Math.PI));
}

/** Rotation that points the outgoing slice at the receiving plate. */
export function getSourceRotation(
  plate: Plate,
  cakeTypeId: CakeTypeId,
  source: SlotCenter,
  target: SlotCenter,
): number {
  return normalizeDegrees(getDirectionDegrees(source, target) - getSliceCenterAngle(plate, cakeTypeId));
}

/** Rotation that points the target's first free wedge back at the source. */
export function getTargetRotation(
  plate: Plate,
  source: SlotCenter,
  target: SlotCenter,
): number {
  return normalizeDegrees(getDirectionDegrees(target, source) - getFreeWedgeCenterAngle(plate));
}
