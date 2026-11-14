import type { CakeTypeId, Plate, Slice } from "../game/types";
import type { SlotCenter } from "./board-view";

const WEDGE_COUNT = 6;
const DEGREES_PER_WEDGE = 360 / WEDGE_COUNT;

export function sortSlicesByType(slices: readonly Slice[]): Slice[] {
  return [...slices].sort((left, right) => left.cakeTypeId.localeCompare(right.cakeTypeId));
}

export function normalizeSignedAngle(degrees: number): number {
  const normalized = ((degrees % 360) + 360) % 360;
  return normalized > 180 ? normalized - 360 : normalized;
}

export function normalizeAngle(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

export function getRotationDelta(fromDegrees: number, toDegrees: number): number {
  return normalizeSignedAngle(toDegrees - fromDegrees);
}

export function getSliceStartAngle(plate: Plate, cakeTypeId: CakeTypeId): number {
  const index = sortSlicesByType(plate.slices).findIndex((slice) => slice.cakeTypeId === cakeTypeId);
  return (index < 0 ? 0 : index) * DEGREES_PER_WEDGE;
}

export function getSliceCenterAngle(plate: Plate, cakeTypeId: CakeTypeId): number {
  return getSliceStartAngle(plate, cakeTypeId) + DEGREES_PER_WEDGE / 2;
}

export function getDirectionDegrees(from: SlotCenter, to: SlotCenter): number {
  return normalizeSignedAngle(Math.atan2(to.x - from.x, from.y - to.y) * (180 / Math.PI));
}

/** Rotation that points the outgoing slice at the receiving plate. */
export function getSourceRotation(
  plate: Plate,
  cakeTypeId: CakeTypeId,
  source: SlotCenter,
  target: SlotCenter,
): number {
  return normalizeSignedAngle(getDirectionDegrees(source, target) - getSliceCenterAngle(plate, cakeTypeId));
}

/** Rotation that points a sorted target wedge at the source. */
export function getIncomingRotation(
  wedgeIndex: number,
  source: SlotCenter,
  target: SlotCenter,
): number {
  return normalizeSignedAngle(
    getDirectionDegrees(target, source) - (wedgeIndex * DEGREES_PER_WEDGE + DEGREES_PER_WEDGE / 2),
  );
}
