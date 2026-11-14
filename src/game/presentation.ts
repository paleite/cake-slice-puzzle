import type { BoardSlot, GameState, ResolveStep, SlotId } from "./types";

export type Presentation = {
  startState: GameState;
  steps: ResolveStep[];
  index: number;
};

export const TRANSFER_STEP_MS = 560;
export const CLEAR_STEP_MS = 680;

export function getPresentationFrame(presentation: Presentation): GameState {
  return presentation.index === 0
    ? presentation.startState
    : presentation.steps[presentation.index - 1].state;
}

export function getStepDuration(step: ResolveStep | undefined): number {
  if (step === undefined) return 0;
  return step.events.some((event) => event.type === "clear") ? CLEAR_STEP_MS : TRANSFER_STEP_MS;
}

export function getPresentationSlots(presentation: Presentation): BoardSlot[] {
  const frameSlots = getPresentationFrame(presentation).slots;
  const step = presentation.steps[presentation.index];
  if (step === undefined) return frameSlots;

  const sourceSlotIds = new Set<SlotId>();
  for (const event of step.events) {
    if (event.type === "transfer") sourceSlotIds.add(event.sourceSlotId);
  }
  if (sourceSlotIds.size === 0) return frameSlots;

  // Sources empty as their slices take flight; the target only fills once the step ends.
  const postStepSlots = new Map(step.state.slots.map((slot) => [slot.id, slot]));
  return frameSlots.map((slot) => sourceSlotIds.has(slot.id) ? postStepSlots.get(slot.id) ?? slot : slot);
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

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined"
    && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}
