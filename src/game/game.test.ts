import { describe, expect, it } from "vitest";
import { isCompletePlate } from "./completion";
import { createNewGame, placePlate } from "./game";

describe("placePlate resolution invariants", () => {
  it("terminates seeded playthroughs with structurally valid plates", () => {
    for (let seed = 1; seed <= 40; seed += 1) {
      let game = createNewGame(seed);

      for (let move = 0; move < 150 && game.status === "playing"; move += 1) {
        const targetSlot = game.slots.find((slot) => slot.plate === null);
        const plate = game.tray[0];
        if (targetSlot === undefined || plate === undefined) break;

        game = placePlate(game, plate.id, targetSlot.id).state;

        for (const slot of game.slots) {
          if (slot.plate === null) continue;
          expect(slot.plate.slices.length).toBeLessThanOrEqual(6);
          expect(isCompletePlate(slot.plate)).toBe(false);
        }
      }
    }
  });
});
