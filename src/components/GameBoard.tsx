import type { CSSProperties } from "react";
import {
  CAKE_PLATE_ASSET,
  CAKE_SLICE_ASSETS,
  PLATE_CENTER,
  SLICE_IMAGE_SIZE,
  SLICE_IMAGE_X,
  SLICE_IMAGE_Y,
} from "../presentation/cake-assets";
import { buildBoardView } from "../presentation/board-view";
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
        "--rotate-ms": `${STEP_TIMING.rotateMs}ms`,
        "--flight-ms": `${STEP_TIMING.transferMs}ms`,
        "--clear-ms": `${STEP_TIMING.clearMs}ms`,
      } as CSSProperties}
    >
      {view.slots.map((slot) => {
        const classNames = ["board-slot", `board-slot--${slot.id}`];
        if (slot.plate === null) classNames.push("board-slot--empty");
        if (!view.isAnimating && slot.plate === null && selectedPlateId !== null) classNames.push("board-slot--available");
        if (view.clearingSlotIds.has(slot.id)) classNames.push("board-slot--clearing");
        if (view.arrivedSlotIds.has(slot.id)) classNames.push("board-slot--arrived");
        if (view.placedSlotId === slot.id) classNames.push("board-slot--placed");
        if (view.plateRotations.has(slot.id)) classNames.push("board-slot--rotating");

        const slotName = `row ${slot.row + 1}, column ${slot.column + 1}`;
        const hiddenSliceIndexes = view.hiddenSliceIndexes.get(slot.id);
        const visibleSliceCount = slot.plate === null
          ? 0
          : slot.plate.slices.length - (hiddenSliceIndexes?.size ?? 0);
        const label = slot.plate === null
          ? `Empty slot, ${slotName}`
          : `Slot, ${slotName}: ${visibleSliceCount} cake slices`;

        return (
          <button
            key={slot.id}
            type="button"
            className={classNames.join(" ")}
            disabled={slot.plate !== null || selectedPlateId === null || view.isAnimating}
            onClick={() => placeSelectedPlate(slot.id)}
            aria-label={label}
          >
            {slot.plate !== null
              ? (
                <Plate
                  plate={slot.plate}
                  rotationDegrees={view.plateRotations.get(slot.id) ?? 0}
                  hiddenSliceIndexes={hiddenSliceIndexes}
                />
              )
              : (
                <>
                  <img src={CAKE_PLATE_ASSET} className="board-slot__ghost" alt="" aria-hidden="true" draggable={false} />
                  <span className="board-slot__empty" aria-hidden="true">+</span>
                </>
              )}
          </button>
        );
      })}

      <div className="board__animations" aria-hidden="true">
        {view.flights.map(({ event, from, to, spinFrom, spinTo }, index) => (
          <svg
            className="slice-flight"
            key={`${presentation?.id ?? 0}-${presentation?.phase ?? "idle"}-${view.stepIndex}-${index}`}
            viewBox="0 0 100 100"
            style={{
              "--from-x": `${from.x}%`,
              "--from-y": `${from.y}%`,
              "--to-x": `${to.x}%`,
              "--to-y": `${to.y}%`,
              "--spin-from": `${spinFrom}deg`,
              "--spin-to": `${spinTo}deg`,
            } as CSSProperties}
          >
            <g className="slice-flight__spin">
              <image
                href={CAKE_SLICE_ASSETS[event.cakeTypeId]}
                x={SLICE_IMAGE_X}
                y={SLICE_IMAGE_Y}
                width={SLICE_IMAGE_SIZE}
                height={SLICE_IMAGE_SIZE}
              />
            </g>
          </svg>
        ))}
      </div>
    </section>
  );
}
