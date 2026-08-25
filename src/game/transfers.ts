import { GAME_CONFIG } from "./config";
import { getAdjacentSlotIds } from "./geometry";
import type { CakeTypeId, GameState, SlotId, TransferEvent } from "./types";

export type TransferCandidate = TransferEvent & {
  completesCake: boolean;
  targetExistingCount: number;
};

function countType(state: GameState, slotId: SlotId, cakeTypeId: CakeTypeId): number {
  const plate = state.slots.find((slot) => slot.id === slotId)?.plate;
  return plate?.slices.filter((slice) => slice.cakeTypeId === cakeTypeId).length ?? 0;
}

function getCakeTypes(state: GameState, slotId: SlotId): CakeTypeId[] {
  const plate = state.slots.find((slot) => slot.id === slotId)?.plate;
  return [...new Set(plate?.slices.map((slice) => slice.cakeTypeId) ?? [])];
}

export function findTransfer(state: GameState): TransferCandidate | null {
  const candidates: TransferCandidate[] = [];
  const slotOrder = new Map(state.slots.map((slot, index) => [slot.id, index]));

  for (const sourceSlot of state.slots) {
    const sourcePlate = sourceSlot.plate;
    if (sourcePlate === null) continue;

    for (const targetSlotId of getAdjacentSlotIds(sourceSlot.id)) {
      const targetSlot = state.slots.find((slot) => slot.id === targetSlotId);
      const targetPlate = targetSlot?.plate;
      if (targetPlate === null || targetPlate === undefined) continue;

      const targetCapacity = GAME_CONFIG.plateCapacity - targetPlate.slices.length;
      if (targetCapacity <= 0) continue;

      for (const cakeTypeId of getCakeTypes(state, sourceSlot.id)) {
        const sourceCount = countType(state, sourceSlot.id, cakeTypeId);
        const targetCount = countType(state, targetSlotId, cakeTypeId);
        if (targetCount === 0) continue;

        // Monotonic consolidation rule. Equal groups move toward the lower slot order.
        const sourceOrder = slotOrder.get(sourceSlot.id) ?? Number.MAX_SAFE_INTEGER;
        const targetOrder = slotOrder.get(targetSlotId) ?? Number.MAX_SAFE_INTEGER;
        const movesTowardTarget = targetCount > sourceCount || (targetCount === sourceCount && targetOrder < sourceOrder);
        if (!movesTowardTarget) continue;

        const sliceCount = Math.min(sourceCount, targetCapacity);
        if (sliceCount <= 0) continue;

        candidates.push({
          type: "transfer",
          sourceSlotId: sourceSlot.id,
          targetSlotId,
          cakeTypeId,
          sliceCount,
          completesCake: targetPlate.slices.length + sliceCount === GAME_CONFIG.plateCapacity && targetCount + sliceCount === GAME_CONFIG.plateCapacity,
          targetExistingCount: targetCount,
        });
      }
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
        if (slice.cakeTypeId === transfer.cakeTypeId && slicesToRemove > 0) {
          slicesToRemove -= 1;
          return false;
        }
        return true;
      });

      return {
        ...slot,
        plate: remainingSlices.length === 0 ? null : { ...slot.plate, slices: remainingSlices },
      };
    }

    return {
      ...slot,
      plate: {
        ...slot.plate,
        slices: [
          ...slot.plate.slices,
          ...Array.from({ length: transfer.sliceCount }, () => ({ cakeTypeId: transfer.cakeTypeId })),
        ],
      },
    };
  });

  return { ...state, slots };
}
