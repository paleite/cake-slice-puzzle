import { useEffect } from "react";
import { getStepDurationMs } from "../presentation/timing";
import { useGameStore } from "../store/game-store";

/**
 * The only owner of presentation time. Components render the step the store
 * exposes; this driver advances it and the store fires the next phase.
 */
export function usePresentationDriver(): void {
  const presentation = useGameStore((state) => state.presentation);
  const finishPresentationStep = useGameStore((state) => state.finishPresentationStep);

  useEffect(() => {
    if (presentation === null) return;
    const duration = getStepDurationMs(presentation.steps[presentation.index]);
    const timer = window.setTimeout(finishPresentationStep, Math.max(1, duration));
    return () => window.clearTimeout(timer);
  }, [presentation, finishPresentationStep]);
}
