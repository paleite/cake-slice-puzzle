import type { GameEvent, GameState, Plate, ResolveStep } from "../game/types";
import {
  getGamePhase,
  getPresentationCakesCleared,
  getPresentationScore,
  getPresentationStep,
  type GamePhase,
  type Presentation,
} from "./model";

export type HudView = {
  score: number;
  cakesCleared: number;
  message: string;
  phase: GamePhase;
};

export type TrayView = {
  plates: readonly Plate[];
  isResolving: boolean;
};

const DEFAULT_MESSAGE = "Build complete cakes of six matching slices.";

function formatSliceCount(sliceCount: number): string {
  return `${sliceCount} slice${sliceCount === 1 ? "" : "s"} merged`;
}

export function describeResolveStep(step: ResolveStep): string {
  const clear = step.events.find((event) => event.type === "clear");
  if (clear !== undefined) return `Cake cleared +${clear.score}`;
  const sliceCount = step.events.reduce(
    (total, event) => total + (event.type === "transfer" ? event.sliceCount : 0),
    0,
  );
  return formatSliceCount(sliceCount);
}

export function describeEvents(events: readonly GameEvent[]): string {
  const lastEvent = events.at(-1);
  if (lastEvent === undefined) return DEFAULT_MESSAGE;
  return lastEvent.type === "clear"
    ? `Cake cleared +${lastEvent.score}`
    : formatSliceCount(lastEvent.sliceCount);
}

export function buildHudView(
  state: Pick<GameState, "score" | "cakesCleared" | "status">,
  presentation: Presentation | null,
  lastEvents: readonly GameEvent[],
): HudView {
  const step = presentation === null ? undefined : getPresentationStep(presentation);
  return {
    score: presentation === null ? state.score : getPresentationScore(presentation),
    cakesCleared: presentation === null ? state.cakesCleared : getPresentationCakesCleared(presentation),
    message: step === undefined ? describeEvents(lastEvents) : describeResolveStep(step),
    phase: getGamePhase(state.status, presentation),
  };
}

export function buildTrayView(
  state: Pick<GameState, "tray">,
  presentation: Presentation | null,
): TrayView {
  return {
    plates: presentation === null ? state.tray : presentation.startState.tray,
    isResolving: presentation !== null,
  };
}
