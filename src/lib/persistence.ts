import { z } from "zod";
import { CAKE_TYPES, type GameState } from "../game/types";

const STORAGE_KEY = "cake-slice-puzzle:v1";

const sliceSchema = z.object({ cakeTypeId: z.enum(CAKE_TYPES) });
const plateSchema = z.object({ id: z.string(), slices: z.array(sliceSchema).max(6) });
const slotSchema = z.object({
  id: z.enum(["a0", "a1", "a2", "b0", "b1", "b2", "b3", "c0", "c1", "c2", "c3", "d0", "d1", "d2"]),
  row: z.number().int(),
  column: z.number().int(),
  plate: plateSchema.nullable(),
});
const gameStateSchema = z.object({
  slots: z.array(slotSchema).length(14),
  tray: z.array(plateSchema).max(3),
  score: z.number().int().nonnegative(),
  cakesCleared: z.number().int().nonnegative(),
  status: z.enum(["playing", "resolving", "game-over"]),
  randomSeed: z.number().int().nonnegative(),
  focusedSlotId: slotSchema.shape.id.nullable(),
});

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const result = gameStateSchema.safeParse(JSON.parse(raw));
    if (!result.success) return null;
    return { ...result.data, status: result.data.status === "resolving" ? "playing" : result.data.status };
  } catch {
    return null;
  }
}

export function saveGame(state: GameState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
