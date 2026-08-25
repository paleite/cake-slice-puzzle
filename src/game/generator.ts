import { GAME_CONFIG } from "./config";
import { randomInteger } from "./random";
import { CAKE_TYPES, type CakeTypeId, type Plate } from "./types";

function makePlateId(seed: number, index: number): string {
  return `plate-${seed}-${index}`;
}

export function generateTray(seed: number, score: number): { tray: Plate[]; seed: number } {
  let currentSeed = seed;
  const activeTypeCount = score >= 1_500 ? 6 : score >= 600 ? 5 : 4;
  const availableTypes = CAKE_TYPES.slice(0, activeTypeCount);
  const tray: Plate[] = [];

  for (let plateIndex = 0; plateIndex < GAME_CONFIG.traySize; plateIndex += 1) {
    const sliceCountResult = randomInteger(currentSeed, 2, score >= 900 ? 4 : 3);
    currentSeed = sliceCountResult.seed;

    const slices: Plate["slices"] = [];
    let previousType: CakeTypeId | null = null;

    for (let sliceIndex = 0; sliceIndex < sliceCountResult.value; sliceIndex += 1) {
      const typeIndexResult = randomInteger(currentSeed, 0, availableTypes.length - 1);
      currentSeed = typeIndexResult.seed;
      let cakeTypeId = availableTypes[typeIndexResult.value];

      if (previousType !== null && sliceIndex > 0) {
        const repeatResult = randomInteger(currentSeed, 0, 99);
        currentSeed = repeatResult.seed;
        if (repeatResult.value < 45) cakeTypeId = previousType;
      }

      slices.push({ cakeTypeId });
      previousType = cakeTypeId;
    }

    tray.push({
      id: makePlateId(currentSeed, plateIndex),
      slices,
    });
  }

  return { tray, seed: currentSeed };
}
