import type { ResolveStep } from "../game/types";

export const STEP_TIMING = {
  transferMs: 560,
  clearMs: 680,
} as const;

export function getStepDurationMs(step: ResolveStep | undefined): number {
  if (step === undefined) return 0;
  return step.events.some((event) => event.type === "clear")
    ? STEP_TIMING.clearMs
    : STEP_TIMING.transferMs;
}
