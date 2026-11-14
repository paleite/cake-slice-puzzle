import { useEffect, type CSSProperties } from "react";
import { SLOT_LAYOUT } from "../game/geometry";
import {
  CLEAR_STEP_MS,
  TRANSFER_STEP_MS,
  getPresentationSlots,
  getStepDuration,
} from "../game/presentation";
import type { SlotId, TransferEvent } from "../game/types";
import { useGameStore } from "../store/game-store";
import { Plate } from "./Plate";

const slotPositions = new Map(SLOT_LAYOUT.map((slot) => [slot.id, slot]));

function positionPercent(slotId: SlotId, axis: "x" | "y") {
  const slot = slotPositions.get(slotId);
  if (slot === undefined) return "50%";
  return axis === "x"
    ? `${(slot.column + 0.5) * 25}%`
    : `${(slot.row + 0.5) * 20}%`;
}

export function GameBoard() {
  const slots = useGameStore((state) => state.slots);
  const selectedPlateId = useGameStore((state) => state.selectedPlateId);
  const placeSelectedPlate = useGameStore((state) => state.placeSelectedPlate);
  const eventBatchId = useGameStore((state) => state.eventBatchId);
  const presentation = useGameStore((state) => state.presentation);
  const advancePresentation = useGameStore((state) => state.advancePresentation);

  useEffect(() => {
    if (presentation === null) return;
    const duration = getStepDuration(presentation.steps[presentation.index]);
    if (duration === 0) {
      advancePresentation();
      return;
    }
    const timer = window.setTimeout(advancePresentation, duration);
    return () => window.clearTimeout(timer);
  }, [presentation, advancePresentation]);

  const isAnimating = presentation !== null;
  const step = presentation?.steps[presentation.index];
  const displayedSlots = presentation === null ? slots : getPresentationSlots(presentation);

  const clearingSlotIds = new Set<SlotId>();
  const transferEvents: TransferEvent[] = [];
  for (const event of step?.events ?? []) {
    if (event.type === "clear") clearingSlotIds.add(event.slotId);
    else transferEvents.push(event);
  }

  const arrivedSlotIds = new Set<SlotId>();
  if (presentation !== null && presentation.index > 0) {
    for (const event of presentation.steps[presentation.index - 1].events) {
      if (event.type === "transfer") arrivedSlotIds.add(event.targetSlotId);
    }
  }
  const placedSlotId = presentation?.index === 0 ? presentation.startState.focusedSlotId : null;

  return (
    <section
      className={isAnimating ? "board board--animating" : "board"}
      aria-label="Cake board"
      aria-busy={isAnimating}
      style={{
        "--flight-ms": `${TRANSFER_STEP_MS}ms`,
        "--clear-ms": `${CLEAR_STEP_MS}ms`,
      } as CSSProperties}
    >
      {displayedSlots.map((slot) => {
        const classNames = ["board-slot", `board-slot--${slot.id}`];
        if (!isAnimating && slot.plate === null && selectedPlateId !== null) classNames.push("board-slot--available");
        if (clearingSlotIds.has(slot.id)) classNames.push("board-slot--clearing");
        if (arrivedSlotIds.has(slot.id)) classNames.push("board-slot--arrived");
        if (placedSlotId === slot.id) classNames.push("board-slot--placed");

        const slotName = `row ${slot.row + 1}, column ${slot.column + 1}`;
        const label = slot.plate === null
          ? `Empty slot, ${slotName}`
          : `Slot, ${slotName}: ${slot.plate.slices.length} cake slices`;

        return (
          <button
            key={slot.id}
            type="button"
            className={classNames.join(" ")}
            disabled={slot.plate !== null || selectedPlateId === null || isAnimating}
            onClick={() => placeSelectedPlate(slot.id)}
            aria-label={label}
          >
            {slot.plate !== null ? <Plate plate={slot.plate} /> : <span className="board-slot__empty" aria-hidden="true">+</span>}
          </button>
        );
      })}

      <div className="board__animations" aria-hidden="true">
        {transferEvents.map((event, index) => (
          <svg
            className="slice-flight"
            key={`${eventBatchId}-${presentation?.index ?? 0}-${event.sourceSlotId}-${event.targetSlotId}-${index}`}
            viewBox="0 0 100 100"
            style={{
              "--from-x": positionPercent(event.sourceSlotId, "x"),
              "--from-y": positionPercent(event.sourceSlotId, "y"),
              "--to-x": positionPercent(event.targetSlotId, "x"),
              "--to-y": positionPercent(event.targetSlotId, "y"),
            } as CSSProperties}
          >
            <path d="M 50 50 L 50 7 A 43 43 0 0 1 87 71 Z" className={`slice-flight__wedge slice-flight__wedge--${event.cakeTypeId}`} />
          </svg>
        ))}
      </div>
    </section>
  );
}
