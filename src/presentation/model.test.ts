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

  it("rotates before a transfer, resolves it, then clears and settles", () => {
    const presentation = createPresentation(1, "b2", state(), steps())!;
    expect(presentation).toMatchObject({ id: 1, placedSlotId: "b2", index: 0, phase: "rotate" });

    const transferBeat = finishPresentationStep(presentation)!;
    expect(transferBeat).toMatchObject({ index: 0, phase: "resolve" });
    expect(getPresentationStep(transferBeat)?.events).toEqual([transfer]);

    const clearBeat = finishPresentationStep(transferBeat)!;
    expect(clearBeat).toMatchObject({ index: 1, phase: "resolve" });
    expect(getPresentationStep(clearBeat)?.events).toEqual([clear]);

    const settleBeat = finishPresentationStep(clearBeat)!;
    expect(settleBeat).toMatchObject({ index: 2, phase: "settle" });
    expect(getPresentationStep(settleBeat)).toBeUndefined();
    expect(finishPresentationStep(settleBeat)).toBeNull();
  });

  it("skips rotation for a clear-only presentation", () => {
    const presentation = createPresentation(1, "b1", state(), [{ state: state(100, 1), events: [clear] }])!;
    expect(presentation.phase).toBe("resolve");
    expect(getPresentationScore(presentation)).toBe(100);
  });

  it("shows the pre-step state during rotation and resolution, then the final state while settling", () => {
    const presentation = createPresentation(1, "b2", state(), steps())!;
    expect(getPresentationFrame(presentation)).toBe(presentation.startState);

    const transferBeat = finishPresentationStep(presentation)!;
    expect(getPresentationFrame(transferBeat)).toBe(presentation.startState);

    const clearBeat = finishPresentationStep(transferBeat)!;
    expect(getPresentationFrame(clearBeat)).toBe(presentation.steps[0].state);

    const settleBeat = finishPresentationStep(clearBeat)!;
    expect(getPresentationFrame(settleBeat)).toBe(presentation.steps[1].state);
  });

  it("counts a clear as soon as its resolve beat starts", () => {
    const presentation = createPresentation(1, "b2", state(), steps())!;
    expect(getPresentationScore(presentation)).toBe(0);
    expect(getPresentationCakesCleared(presentation)).toBe(0);

    const transferBeat = finishPresentationStep(presentation)!;
    expect(getPresentationScore(transferBeat)).toBe(0);

    const clearBeat = finishPresentationStep(transferBeat)!;
    expect(getPresentationScore(clearBeat)).toBe(100);
    expect(getPresentationCakesCleared(clearBeat)).toBe(1);
  });

  it("derives the game phase from domain status and presentation", () => {
    expect(getGamePhase("playing", null)).toBe("idle");
    expect(getGamePhase("game-over", null)).toBe("complete");
    expect(getGamePhase("game-over", createPresentation(1, "b2", state(), steps()))).toBe("presenting");
  });
});
