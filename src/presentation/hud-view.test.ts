import { describe, expect, it } from "vitest";
import { createEmptySlots } from "../game/geometry";
import type { ClearEvent, GameEvent, GameState, ResolveStep, TransferEvent } from "../game/types";
import { buildHudView, buildTrayView } from "./hud-view";
import type { Presentation, PresentationPhase } from "./model";

function state(score = 0, cakesCleared = 0): GameState {
  return {
    slots: createEmptySlots(),
    tray: [{ id: "tray", slices: [{ cakeTypeId: "lemon" }] }],
    score,
    cakesCleared,
    status: "playing",
    randomSeed: 1,
  };
}

const transfer: TransferEvent = {
  type: "transfer",
  sourceSlotId: "b2",
  targetSlotId: "b1",
  cakeTypeId: "strawberry",
  sliceCount: 3,
};
const clear: ClearEvent = { type: "clear", slotId: "b1", cakeTypeId: "strawberry", score: 100 };

const steps: ResolveStep[] = [
  { state: state(0, 0), events: [transfer] },
  { state: state(100, 1), events: [clear] },
];

function presentation(index: number, phase: PresentationPhase): Presentation {
  return { id: 1, placedSlotId: "b2", startState: state(0, 0), steps, index, phase };
}

describe("hud view", () => {
  it("describes rotation, the merge, the clear, and the settled events", () => {
    const rotating = buildHudView(state(100, 1), presentation(0, "rotate"), [clear]);
    expect(rotating).toMatchObject({
      score: 0,
      cakesCleared: 0,
      message: "Aligning slices…",
      phase: "presenting",
    });

    const merging = buildHudView(state(100, 1), presentation(0, "resolve"), [clear]);
    expect(merging).toMatchObject({
      score: 0,
      cakesCleared: 0,
      message: "3 slices merged",
    });

    const clearing = buildHudView(state(100, 1), presentation(1, "resolve"), [clear]);
    expect(clearing).toMatchObject({
      score: 100,
      cakesCleared: 1,
      message: "Cake cleared +100",
    });

    expect(buildHudView(state(100, 1), presentation(2, "settle"), [clear])).toMatchObject({
      score: 100,
      cakesCleared: 1,
      message: "Cake cleared +100",
    });
  });

  it("falls back to the last settled events", () => {
    const events: GameEvent[] = [clear];
    expect(buildHudView(state(100, 1), null, events)).toMatchObject({
      score: 100,
      cakesCleared: 1,
      message: "Cake cleared +100",
      phase: "idle",
    });
    expect(buildHudView(state(), null, []).message).toBe("Build complete cakes of six matching slices.");
  });

  it("stages the tray while a presentation is running", () => {
    const active = presentation(0, "rotate");
    const staged = buildTrayView({ tray: [] }, active);
    expect(staged.isResolving).toBe(true);
    expect(staged.plates).toBe(active.startState.tray);
    expect(buildTrayView({ tray: [] }, null)).toEqual({ plates: [], isResolving: false });
  });
});
