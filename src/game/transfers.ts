import { GAME_CONFIG } from "./config";
import { getAdjacentSlotIds } from "./geometry";
import type { CakeTypeId, GameState, SlotId, TransferEvent } from "./types";

export type MergeCandidate = {
  cakeTypeId: CakeTypeId;
  targetSlotId: SlotId;
  transfers: TransferEvent[];
  completesCake: boolean;
  targetExistingCount: number;
};

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

export function getMatchingComponentSlotIds(state: GameState, originSlotId: SlotId, cakeTypeId: CakeTypeId): SlotId[] {
  if (countType(state, originSlotId, cakeTypeId) === 0) return [];
  const visited = new Set<SlotId>();
  const pending: SlotId[] = [originSlotId];

  while (pending.length > 0) {
    const current = pending.shift();
    if (current === undefined || visited.has(current)) continue;
    visited.add(current);
    for (const adjacent of getAdjacentSlotIds(current)) {
      if (!visited.has(adjacent) && countType(state, adjacent, cakeTypeId) > 0) pending.push(adjacent);
    }
  }
  return [...visited];
}

function selectMergeTargetSlotId(state: GameState, component: readonly SlotId[], cakeTypeId: CakeTypeId, slotOrder: ReadonlyMap<SlotId, number>): SlotId | null {
  const eligible = component.filter((slotId) => getFreeCapacity(state, slotId) > 0);
  eligible.sort((left, right) => {
    const countDifference = countType(state, right, cakeTypeId) - countType(state, left, cakeTypeId);
    return countDifference || ((slotOrder.get(left) ?? Number.MAX_SAFE_INTEGER) - (slotOrder.get(right) ?? Number.MAX_SAFE_INTEGER));
  });
  return eligible[0] ?? null;
}

function buildMergeCandidate(state: GameState, originSlotId: SlotId, cakeTypeId: CakeTypeId, slotOrder: ReadonlyMap<SlotId, number>): MergeCandidate | null {
  const component = getMatchingComponentSlotIds(state, originSlotId, cakeTypeId);
  if (component.length < 2) return null;
  const targetSlotId = selectMergeTargetSlotId(state, component, cakeTypeId, slotOrder);
  if (targetSlotId === null) return null;
  const targetPlate = getPlate(state, targetSlotId);
  if (targetPlate === null) return null;

  const targetExistingCount = countType(state, targetSlotId, cakeTypeId);
  let remainingCapacity = getFreeCapacity(state, targetSlotId);
  const transfers: TransferEvent[] = [];
  const sources = component.filter((slotId) => slotId !== targetSlotId).sort(
    (left, right) => (slotOrder.get(left) ?? Number.MAX_SAFE_INTEGER) - (slotOrder.get(right) ?? Number.MAX_SAFE_INTEGER),
  );

  for (const sourceSlotId of sources) {
    if (remainingCapacity <= 0) break;
    const sliceCount = Math.min(countType(state, sourceSlotId, cakeTypeId), remainingCapacity);
    if (sliceCount > 0) {
      transfers.push({ type: "transfer", sourceSlotId, targetSlotId, cakeTypeId, sliceCount });
      remainingCapacity -= sliceCount;
    }
  }
  if (transfers.length === 0) return null;
  const transferred = transfers.reduce((total, transfer) => total + transfer.sliceCount, 0);
  return {
    cakeTypeId,
    targetSlotId,
    transfers,
    completesCake: targetPlate.slices.length + transferred === GAME_CONFIG.plateCapacity
      && targetExistingCount + transferred === GAME_CONFIG.plateCapacity,
    targetExistingCount,
  };
}

export function findMergeCandidate(state: GameState, originSlotId: SlotId, excludedCakeTypeIds: ReadonlySet<CakeTypeId>): MergeCandidate | null {
  if (getPlate(state, originSlotId) === null) return null;
  const slotOrder = new Map<SlotId, number>(state.slots.map((slot, index) => [slot.id, index]));
  const candidates = getCakeTypes(state, originSlotId)
    .filter((cakeTypeId) => !excludedCakeTypeIds.has(cakeTypeId))
    .map((cakeTypeId) => buildMergeCandidate(state, originSlotId, cakeTypeId, slotOrder))
    .filter((candidate): candidate is MergeCandidate => candidate !== null);

  candidates.sort((left, right) => {
    if (left.completesCake !== right.completesCake) return left.completesCake ? -1 : 1;
    if (left.targetExistingCount !== right.targetExistingCount) return right.targetExistingCount - left.targetExistingCount;
    const targetDifference = (slotOrder.get(left.targetSlotId) ?? 0) - (slotOrder.get(right.targetSlotId) ?? 0);
    if (targetDifference !== 0) return targetDifference;
    return (slotOrder.get(left.transfers[0]?.sourceSlotId ?? left.targetSlotId) ?? 0)
      - (slotOrder.get(right.transfers[0]?.sourceSlotId ?? right.targetSlotId) ?? 0);
  });
  return candidates[0] ?? null;
}

export function applyTransfer(state: GameState, transfer: TransferEvent): GameState {
  const slots = state.slots.map((slot) => {
    if (slot.id !== transfer.sourceSlotId && slot.id !== transfer.targetSlotId) return slot;
    if (slot.plate === null) return slot;
    if (slot.id === transfer.sourceSlotId) {
      let remaining = transfer.sliceCount;
      const slices = slot.plate.slices.filter((slice) => {
        if (slice.cakeTypeId === transfer.cakeTypeId && remaining > 0) { remaining -= 1; return false; }
        return true;
      });
      return { ...slot, plate: slices.length === 0 ? null : { ...slot.plate, slices } };
    }
    return { ...slot, plate: { ...slot.plate, slices: [...slot.plate.slices, ...Array.from({ length: transfer.sliceCount }, () => ({ cakeTypeId: transfer.cakeTypeId }))] } };
  });
  return { ...state, slots };
}

export function applyMergeCandidate(state: GameState, candidate: MergeCandidate): GameState {
  return candidate.transfers.reduce((current, transfer) => applyTransfer(current, transfer), state);
}
