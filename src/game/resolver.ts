import { GAME_CONFIG } from "./config";
import { isCompletePlate } from "./completion";
import { applyMergeCandidate, findMergeCandidate } from "./transfers";
import type { CakeTypeId, ClearEvent, GameState, ResolveResult, SlotId } from "./types";

export function resolveBoard(initialState: GameState, resolutionOriginSlotId: SlotId): ResolveResult {
  let state: GameState = { ...initialState, status: "resolving" };
  const events: ResolveResult["events"] = [];
  const resolvedCakeTypeIds = new Set<CakeTypeId>();

  for (let operationIndex = 0; operationIndex < GAME_CONFIG.maximumResolutionOperations; operationIndex += 1) {
    const completedSlot = state.slots.find((slot) => slot.plate !== null && isCompletePlate(slot.plate));

    if (completedSlot?.plate !== null && completedSlot?.plate !== undefined) {
      const cakeTypeId = completedSlot.plate.slices[0].cakeTypeId;
      const clearScore = GAME_CONFIG.baseClearScore * (1 + Math.floor(events.filter((event) => event.type === "clear").length / 2));
      const event: ClearEvent = { type: "clear", slotId: completedSlot.id, cakeTypeId, score: clearScore };

      state = {
        ...state,
        slots: state.slots.map((slot) => slot.id === completedSlot.id ? { ...slot, plate: null } : slot),
        score: state.score + clearScore,
        cakesCleared: state.cakesCleared + 1,
      };
      events.push(event);
      continue;
    }

    const mergeCandidate = findMergeCandidate(state, resolutionOriginSlotId, resolvedCakeTypeIds);
    if (mergeCandidate !== null) {
      state = applyMergeCandidate(state, mergeCandidate);
      events.push(...mergeCandidate.transfers);
      resolvedCakeTypeIds.add(mergeCandidate.cakeTypeId);
      continue;
    }

    return { state: { ...state, status: "playing" }, events };
  }

  throw new Error(`Resolution exceeded ${GAME_CONFIG.maximumResolutionOperations} operations.`);
}
