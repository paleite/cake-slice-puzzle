import { GAME_CONFIG } from "./config";
import { getAdjacentSlotIds } from "./geometry";
import type { CakeTypeId, GameState, SlotId, TransferEvent } from "./types";

export type TransferCandidate = TransferEvent & { completesCake: boolean; targetExistingCount: number };
type TransferDirection = { sourceSlotId: SlotId; targetSlotId: SlotId } | null;

function getPlate(state: GameState, slotId: SlotId) {
  return state.slots.find((slot) => slot.id === slotId)?.plate ?? null;
}

function countType(state: GameState, slotId: SlotId, cakeTypeId: CakeTypeId): number {
  return getPlate(state, slotId)?.slices.filter((slice) => slice.cakeTypeId === cakeTypeId).length ?? 0;
}

function getCakeTypes(state: GameState, slotId: SlotId): CakeTypeId[] {
  return [...new Set(getPlate(state, slotId)?.slices.map((slice) => slice.cakeTypeId) ?? [])];
}

function getFreeCapacity(state: GameState, slotId: SlotId): number {
  const plate = getPlate(state, slotId);
  return plate === null ? 0 : GAME_CONFIG.plateCapacity - plate.slices.length;
}

export function chooseTransferDirection(
  firstSlotId: SlotId, firstMatchingCount: number, firstFreeCapacity: number,
  secondSlotId: SlotId, secondMatchingCount: number, secondFreeCapacity: number,
  slotOrder: ReadonlyMap<SlotId, number>,
): TransferDirection {
  const firstCanReceive = firstFreeCapacity > 0;
  const secondCanReceive = secondFreeCapacity > 0;
  if (!firstCanReceive && !secondCanReceive) return null;
  if (firstCanReceive && !secondCanReceive) return { sourceSlotId: secondSlotId, targetSlotId: firstSlotId };
  if (!firstCanReceive && secondCanReceive) return { sourceSlotId: firstSlotId, targetSlotId: secondSlotId };
  if (firstMatchingCount > secondMatchingCount) return { sourceSlotId: secondSlotId, targetSlotId: firstSlotId };
  if (secondMatchingCount > firstMatchingCount) return { sourceSlotId: firstSlotId, targetSlotId: secondSlotId };
  const firstOrder = slotOrder.get(firstSlotId) ?? Number.MAX_SAFE_INTEGER;
  const secondOrder = slotOrder.get(secondSlotId) ?? Number.MAX_SAFE_INTEGER;
  return firstOrder <= secondOrder
    ? { sourceSlotId: secondSlotId, targetSlotId: firstSlotId }
    : { sourceSlotId: firstSlotId, targetSlotId: secondSlotId };
}

export function findTransfer(
  state: GameState,
  resolutionOriginSlotId: SlotId,
  excludedCakeTypeIds: ReadonlySet<CakeTypeId>,
): TransferCandidate | null {
  const candidates: TransferCandidate[] = [];
  const slotOrder = new Map<SlotId, number>(state.slots.map((slot, index) => [slot.id, index]));
  const originPlate = getPlate(state, resolutionOriginSlotId);
  if (originPlate === null) return null;

  for (const neighborSlotId of getAdjacentSlotIds(resolutionOriginSlotId)) {
    const neighborPlate = getPlate(state, neighborSlotId);
    if (neighborPlate === null) continue;
    const neighborTypes = new Set(getCakeTypes(state, neighborSlotId));
    const sharedTypes = getCakeTypes(state, resolutionOriginSlotId).filter(
      (cakeTypeId) => neighborTypes.has(cakeTypeId) && !excludedCakeTypeIds.has(cakeTypeId),
    );

    for (const cakeTypeId of sharedTypes) {
        const direction = chooseTransferDirection(
          resolutionOriginSlotId, countType(state, resolutionOriginSlotId, cakeTypeId), getFreeCapacity(state, resolutionOriginSlotId),
          neighborSlotId, countType(state, neighborSlotId, cakeTypeId), getFreeCapacity(state, neighborSlotId), slotOrder,
        );
        if (direction === null) continue;

        const sourceCount = countType(state, direction.sourceSlotId, cakeTypeId);
        const targetCount = countType(state, direction.targetSlotId, cakeTypeId);
        const targetFreeCapacity = getFreeCapacity(state, direction.targetSlotId);
        const sliceCount = Math.min(sourceCount, targetFreeCapacity);
        const targetPlate = getPlate(state, direction.targetSlotId);
        if (sliceCount <= 0 || targetPlate === null) continue;

        candidates.push({
          type: "transfer", sourceSlotId: direction.sourceSlotId, targetSlotId: direction.targetSlotId,
          cakeTypeId, sliceCount,
          completesCake: targetPlate.slices.length + sliceCount === GAME_CONFIG.plateCapacity
            && targetCount + sliceCount === GAME_CONFIG.plateCapacity,
          targetExistingCount: targetCount,
        });
    }
  }

  candidates.sort((left, right) => {
    if (left.completesCake !== right.completesCake) return left.completesCake ? -1 : 1;
    if (left.targetExistingCount !== right.targetExistingCount) return right.targetExistingCount - left.targetExistingCount;
    const leftTargetOrder = slotOrder.get(left.targetSlotId) ?? 0;
    const rightTargetOrder = slotOrder.get(right.targetSlotId) ?? 0;
    if (leftTargetOrder !== rightTargetOrder) return leftTargetOrder - rightTargetOrder;
    return (slotOrder.get(left.sourceSlotId) ?? 0) - (slotOrder.get(right.sourceSlotId) ?? 0);
  });
  return candidates[0] ?? null;
}

export function applyTransfer(state: GameState, transfer: TransferEvent): GameState {
  const slots = state.slots.map((slot) => {
    if (slot.id !== transfer.sourceSlotId && slot.id !== transfer.targetSlotId) return slot;
    if (slot.plate === null) return slot;
    if (slot.id === transfer.sourceSlotId) {
      let slicesToRemove = transfer.sliceCount;
      const remainingSlices = slot.plate.slices.filter((slice) => {
        if (slice.cakeTypeId === transfer.cakeTypeId && slicesToRemove > 0) { slicesToRemove -= 1; return false; }
        return true;
      });
      return { ...slot, plate: remainingSlices.length === 0 ? null : { ...slot.plate, slices: remainingSlices } };
    }
    return { ...slot, plate: { ...slot.plate, slices: [...slot.plate.slices, ...Array.from({ length: transfer.sliceCount }, () => ({ cakeTypeId: transfer.cakeTypeId }))] } };
  });
  return { ...state, slots };
}
