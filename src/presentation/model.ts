import type { GameState, ResolveStep, SlotId } from "../game/types";

export type GamePhase = "idle" | "presenting" | "complete";
export type PresentationPhase = "rotate" | "resolve" | "settle";

export type Presentation = {
  id: number;
  placedSlotId: SlotId;
  startState: GameState;
  steps: readonly ResolveStep[];
  index: number;
  phase: PresentationPhase;
};

export function createPresentation(
  id: number,
  placedSlotId: SlotId,
  startState: GameState,
  steps: readonly ResolveStep[],
): Presentation | null {
  if (steps.length === 0) return null;
  return {
    id,
    placedSlotId,
    startState,
    steps,
    index: 0,
    phase: steps[0].events.some((event) => event.type === "transfer") ? "rotate" : "resolve",
  };
}

export function finishPresentationStep(presentation: Presentation): Presentation | null {
  if (presentation.phase === "rotate") {
    return { ...presentation, phase: "resolve" };
  }
  if (presentation.phase === "settle") return null;

  const nextIndex = presentation.index + 1;
  if (nextIndex >= presentation.steps.length) {
    return { ...presentation, index: presentation.steps.length, phase: "settle" };
  }
  return {
    ...presentation,
    index: nextIndex,
    phase: presentation.steps[nextIndex].events.some((event) => event.type === "transfer")
      ? "rotate"
      : "resolve",
  };
}

export function getPresentationStep(presentation: Presentation): ResolveStep | undefined {
  return presentation.steps[presentation.index];
}

export function getPresentationFrame(presentation: Presentation): GameState {
  if (presentation.phase === "settle") {
    return presentation.steps.at(-1)?.state ?? presentation.startState;
  }
  if (presentation.index === 0) return presentation.startState;
  return presentation.steps[presentation.index - 1]?.state ?? presentation.startState;
}

function getResolvedStepCount(presentation: Presentation): number {
  if (presentation.phase === "resolve") return presentation.index + 1;
  if (presentation.phase === "settle") return presentation.steps.length;
  return presentation.index;
}

export function getPresentationScore(presentation: Presentation): number {
  return presentation.startState.score + presentation.steps
    .slice(0, getResolvedStepCount(presentation))
    .reduce((total, step) => total + step.events.reduce(
      (stepTotal, event) => stepTotal + (event.type === "clear" ? event.score : 0),
      0,
    ), 0);
}

export function getPresentationCakesCleared(presentation: Presentation): number {
  return presentation.startState.cakesCleared + presentation.steps
    .slice(0, getResolvedStepCount(presentation))
    .reduce((total, step) => total + step.events.filter((event) => event.type === "clear").length, 0);
}

export function getGamePhase(
  status: GameState["status"],
  presentation: Presentation | null,
): GamePhase {
  if (presentation !== null) return "presenting";
  return status === "game-over" ? "complete" : "idle";
}
