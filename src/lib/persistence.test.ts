import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createNewGame } from "../game/game";
import { loadGame, saveGame } from "./persistence";

const STORAGE_KEY = "cake-slice-puzzle:v1";
let stored = new Map<string, string>();

function memoryStorage(onWrite?: () => void) {
  return {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => {
      onWrite?.();
      stored.set(key, value);
    },
  };
}

beforeEach(() => {
  stored = new Map();
  vi.stubGlobal("localStorage", memoryStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("game persistence", () => {
  it("round-trips a saved game", () => {
    const game = createNewGame(42);
    saveGame(game);
    expect(loadGame()).toEqual(game);
  });

  it("rejects an incompatible save without throwing", () => {
    stored.set(STORAGE_KEY, JSON.stringify({ slots: [], tray: [] }));
    expect(loadGame()).toBeNull();
  });

  it("keeps playing when storage rejects writes", () => {
    vi.stubGlobal("localStorage", memoryStorage(() => {
      throw new Error("QuotaExceededError");
    }));
    expect(() => saveGame(createNewGame(1))).not.toThrow();
  });
});
