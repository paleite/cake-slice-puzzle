import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptySlots } from "../game/geometry";
import type { GameState } from "../game/types";

const STORAGE_KEY = "cake-slice-puzzle:v1";
let stored = new Map<string, string>();

beforeEach(() => {
  stored = new Map();
  vi.resetModules();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => {
      stored.set(key, value);
    },
  });
});

describe("game store", () => {
  it("persists only domain state after a placement", async () => {
    // The store snapshots the persisted game at module load, so import it after stubbing storage.
    const { useGameStore } = await import("./game-store");
    const emptySlot = useGameStore.getState().game.slots.find((slot) => slot.plate === null);
    expect(emptySlot).toBeDefined();

    useGameStore.getState().placeSelectedPlate(emptySlot!.id);

    const saved = JSON.parse(stored.get(STORAGE_KEY) ?? "null");

    expect(Object.keys(saved).sort()).toEqual([
      "cakesCleared",
      "randomSeed",
      "score",
      "slots",
      "status",
      "tray",
    ]);
    expect(saved).not.toHaveProperty("presentation");
    expect(saved).not.toHaveProperty("selectedPlateId");
  });

  it("undoes placements in reverse order and restores the prior selections", async () => {
    const { useGameStore } = await import("./game-store");
    const initial: GameState = {
      slots: createEmptySlots(),
      tray: [
        { id: "p1", slices: [{ cakeTypeId: "strawberry" }] },
        { id: "p2", slices: [{ cakeTypeId: "lemon" }] },
      ],
      score: 0,
      cakesCleared: 0,
      status: "playing",
      randomSeed: 1,
    };
    useGameStore.setState({
      game: initial,
      selectedPlateId: "p1",
      lastEvents: [],
      presentation: null,
      nextPresentationId: 1,
    });

    useGameStore.getState().placeSelectedPlate("a0");
    const afterFirst = useGameStore.getState().game;
    useGameStore.getState().placeSelectedPlate("a3");
    expect(useGameStore.getState().game).not.toEqual(afterFirst);

    useGameStore.getState().undo();
    expect(useGameStore.getState().game).toEqual(afterFirst);
    expect(useGameStore.getState().selectedPlateId).toBe("p2");

    useGameStore.getState().undo();
    expect(useGameStore.getState().game).toEqual(initial);
    expect(useGameStore.getState().selectedPlateId).toBe("p1");
    expect(useGameStore.getState().lastEvents).toEqual([]);
    expect(JSON.parse(stored.get(STORAGE_KEY) ?? "null")).toEqual(initial);
  });
});
