import { GAME_CONFIG } from "./config";
import type { Plate } from "./types";

export function isCompletePlate(plate: Plate): boolean {
  if (plate.slices.length !== GAME_CONFIG.plateCapacity) return false;
  const cakeTypeId = plate.slices[0]?.cakeTypeId;
  return cakeTypeId !== undefined && plate.slices.every((slice) => slice.cakeTypeId === cakeTypeId);
}
