import type { ResolveStep } from "../game/types";
import type { Presentation } from "./model";

export const STEP_TIMING = {
  rotateMs: 150,
  transferMs: 360,
  clearMs: 660,
  settleMs: 220,
} as const;

export function getStepDurationMs(step: ResolveStep | undefined): number {
  if (step === undefined) return 0;
  return step.events.some((event) => event.type === "clear")
    ? STEP_TIMING.clearMs
    : STEP_TIMING.transferMs;
}

export function getBeatDurationMs(presentation: Presentation): number {
  if (presentation.phase === "rotate") return STEP_TIMING.rotateMs;
  if (presentation.phase === "settle") return STEP_TIMING.settleMs;
  return getStepDurationMs(presentation.steps[presentation.index]);
}
