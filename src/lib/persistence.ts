import { z } from "zod";
import { GAME_CONFIG } from "../game/config";
import { SLOT_LAYOUT } from "../game/geometry";
import { CAKE_TYPES, type GameState, type SlotId } from "../game/types";

const STORAGE_KEY = "cake-slice-puzzle:v1";

const SLOT_IDS = SLOT_LAYOUT.map((slot) => slot.id) as [SlotId, ...SlotId[]];

const sliceSchema = z.object({ cakeTypeId: z.enum(CAKE_TYPES) });
const plateSchema = z.object({ id: z.string(), slices: z.array(sliceSchema).max(GAME_CONFIG.plateCapacity) });
const slotSchema = z.object({
  id: z.enum(SLOT_IDS),
  row: z.number().int(),
  column: z.number().int(),
  plate: plateSchema.nullable(),
});
const gameStateSchema = z.object({
  slots: z.array(slotSchema).length(SLOT_LAYOUT.length),
  tray: z.array(plateSchema).max(GAME_CONFIG.traySize),
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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage can be unavailable (private mode) or full; the game keeps running without persistence.
  }
}
