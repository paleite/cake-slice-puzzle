import type { GameState, ResolveStep, SlotId } from "../game/types";

export type GamePhase = "idle" | "presenting" | "complete";

export type Presentation = {
  id: number;
  placedSlotId: SlotId;
  startState: GameState;
  steps: readonly ResolveStep[];
  index: number;
};

export function createPresentation(
  id: number,
  placedSlotId: SlotId,
  startState: GameState,
  steps: readonly ResolveStep[],
): Presentation | null {
  if (steps.length === 0) return null;
  return { id, placedSlotId, startState, steps, index: 0 };
}

export function finishPresentationStep(presentation: Presentation): Presentation | null {
  const nextIndex = presentation.index + 1;
  return nextIndex >= presentation.steps.length
    ? null
    : { ...presentation, index: nextIndex };
}

export function getPresentationStep(presentation: Presentation): ResolveStep | undefined {
  return presentation.steps[presentation.index];
}

export function getPresentationFrame(presentation: Presentation): GameState {
  if (presentation.index === 0) return presentation.startState;
  return presentation.steps[presentation.index - 1]?.state ?? presentation.startState;
}

export function getPresentationScore(presentation: Presentation): number {
  return presentation.startState.score + presentation.steps
    .slice(0, presentation.index + 1)
    .reduce((total, step) => total + step.events.reduce(
      (stepTotal, event) => stepTotal + (event.type === "clear" ? event.score : 0),
      0,
    ), 0);
}

export function getPresentationCakesCleared(presentation: Presentation): number {
  return presentation.startState.cakesCleared + presentation.steps
    .slice(0, presentation.index + 1)
    .reduce((total, step) => total + step.events.filter((event) => event.type === "clear").length, 0);
}

export function getGamePhase(
  status: GameState["status"],
  presentation: Presentation | null,
): GamePhase {
  if (presentation !== null) return "presenting";
  return status === "game-over" ? "complete" : "idle";
}
