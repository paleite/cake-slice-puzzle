import type { CSSProperties } from "react";
import { buildBoardView } from "../presentation/board-view";
import { CAKE_COLORS } from "../presentation/palette";
import { STEP_TIMING } from "../presentation/timing";
import { useGameStore } from "../store/game-store";
import { Plate } from "./Plate";

export function GameBoard() {
  const slots = useGameStore((state) => state.game.slots);
  const selectedPlateId = useGameStore((state) => state.selectedPlateId);
  const placeSelectedPlate = useGameStore((state) => state.placeSelectedPlate);
  const presentation = useGameStore((state) => state.presentation);

  const view = buildBoardView({ slots }, presentation);

  return (
    <section
      className={view.isAnimating ? "board board--animating" : "board"}
      aria-label="Cake board"
      aria-busy={view.isAnimating}
      style={{
        "--flight-ms": `${STEP_TIMING.transferMs}ms`,
        "--clear-ms": `${STEP_TIMING.clearMs}ms`,
      } as CSSProperties}
    >
      {view.slots.map((slot) => {
        const classNames = ["board-slot", `board-slot--${slot.id}`];
        if (!view.isAnimating && slot.plate === null && selectedPlateId !== null) classNames.push("board-slot--available");
        if (view.clearingSlotIds.has(slot.id)) classNames.push("board-slot--clearing");
        if (view.arrivedSlotIds.has(slot.id)) classNames.push("board-slot--arrived");
        if (view.placedSlotId === slot.id) classNames.push("board-slot--placed");

        const slotName = `row ${slot.row + 1}, column ${slot.column + 1}`;
        const label = slot.plate === null
          ? `Empty slot, ${slotName}`
          : `Slot, ${slotName}: ${slot.plate.slices.length} cake slices`;

        return (
          <button
            key={slot.id}
            type="button"
            className={classNames.join(" ")}
            disabled={slot.plate !== null || selectedPlateId === null || view.isAnimating}
            onClick={() => placeSelectedPlate(slot.id)}
            aria-label={label}
          >
            {slot.plate !== null ? <Plate plate={slot.plate} /> : <span className="board-slot__empty" aria-hidden="true">+</span>}
          </button>
        );
      })}

      <div className="board__animations" aria-hidden="true">
        {view.flights.map(({ event, from, to }, index) => (
          <svg
            className="slice-flight"
            key={`${presentation?.id ?? 0}-${view.stepIndex}-${index}`}
            viewBox="0 0 100 100"
            style={{
              "--from-x": `${from.x}%`,
              "--from-y": `${from.y}%`,
              "--to-x": `${to.x}%`,
              "--to-y": `${to.y}%`,
            } as CSSProperties}
          >
            <path
              d="M 50 50 L 50 7 A 43 43 0 0 1 87 71 Z"
              className="slice-flight__wedge"
              fill={CAKE_COLORS[event.cakeTypeId]}
            />
          </svg>
        ))}
      </div>
    </section>
  );
}
