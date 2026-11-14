import { describe, expect, it } from "vitest";
import { createEmptySlots } from "../game/geometry";
import type { ClearEvent, GameState, ResolveStep, TransferEvent } from "../game/types";
import {
  createPresentation,
  finishPresentationStep,
  getGamePhase,
  getPresentationCakesCleared,
  getPresentationFrame,
  getPresentationScore,
  getPresentationStep,
} from "./model";

function state(score = 0, cakesCleared = 0, status: GameState["status"] = "playing"): GameState {
  return {
    slots: createEmptySlots(),
    tray: [],
    score,
    cakesCleared,
    status,
    randomSeed: 1,
  };
}

const transfer: TransferEvent = {
  type: "transfer",
  sourceSlotId: "b2",
  targetSlotId: "b1",
  cakeTypeId: "strawberry",
  sliceCount: 1,
};
const clear: ClearEvent = {
  type: "clear",
  slotId: "b1",
  cakeTypeId: "strawberry",
  score: 100,
};

function steps(): ResolveStep[] {
  return [
    { state: state(0, 0), events: [transfer] },
    { state: state(100, 1), events: [clear] },
  ];
}

describe("presentation model", () => {
  it("does not create a presentation without steps", () => {
    expect(createPresentation(1, "b2", state(), [])).toBeNull();
  });

  it("advances one step at a time and ends after the last step", () => {
    const presentation = createPresentation(1, "b2", state(), steps());
    expect(presentation).toMatchObject({ id: 1, placedSlotId: "b2", index: 0 });

    const second = finishPresentationStep(presentation!);
    expect(second?.index).toBe(1);
    expect(finishPresentationStep(second!)).toBeNull();
  });

  it("shows the start state before the first step and the previous step state after it", () => {
    const presentation = createPresentation(1, "b2", state(), steps())!;
    expect(getPresentationFrame(presentation)).toBe(presentation.startState);
    const second = finishPresentationStep(presentation)!;
    expect(getPresentationFrame(second)).toBe(presentation.steps[0]?.state);
  });

  it("counts a clear as soon as its step starts", () => {
    const presentation = createPresentation(1, "b2", state(), steps())!;
    expect(getPresentationScore(presentation)).toBe(0);
    expect(getPresentationCakesCleared(presentation)).toBe(0);

    const second = finishPresentationStep(presentation)!;
    expect(getPresentationScore(second)).toBe(100);
    expect(getPresentationCakesCleared(second)).toBe(1);
    expect(getPresentationStep(second)?.events).toEqual([clear]);
  });

  it("derives the game phase from domain status and presentation", () => {
    expect(getGamePhase("playing", null)).toBe("idle");
    expect(getGamePhase("game-over", null)).toBe("complete");
    expect(getGamePhase("game-over", createPresentation(1, "b2", state(), steps()))).toBe("presenting");
  });
});
