import { beforeEach, describe, expect, it, vi } from "vitest";

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
});
