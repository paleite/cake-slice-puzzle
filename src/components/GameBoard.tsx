import type { CSSProperties } from "react";
import { useGameStore } from "../store/game-store";
import { SLOT_LAYOUT } from "../game/geometry";
import type { SlotId } from "../game/types";
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
  const recentEvents = useGameStore((state) => state.recentEvents);
  const activeSlotIds = new Set(recentEvents.flatMap((event) => event.type === "clear"
    ? [event.slotId]
    : [event.sourceSlotId, event.targetSlotId]));
  const transferEvents = recentEvents.filter((event) => event.type === "transfer");

  return (
    <section className="board" aria-label="Cake board">
      {slots.map((slot) => (
        <button
          key={slot.id}
          type="button"
          className={`board-slot board-slot--${slot.id}${slot.plate === null && selectedPlateId !== null ? " board-slot--available" : ""}${activeSlotIds.has(slot.id) ? " board-slot--active" : ""}`}
          disabled={slot.plate !== null || selectedPlateId === null}
          onClick={() => placeSelectedPlate(slot.id)}
          aria-label={slot.plate === null ? `Place selected plate in ${slot.id}` : `Occupied slot ${slot.id}`}
        >
          {slot.plate !== null ? <Plate plate={slot.plate} /> : <span className="board-slot__empty">+</span>}
        </button>
      ))}
      <div className="board__animations" aria-hidden="true">
        {transferEvents.map((event, index) => (
          <svg
            className="slice-flight"
            key={`${event.sourceSlotId}-${event.targetSlotId}-${index}`}
            viewBox="0 0 100 100"
            style={{
              "--from-x": positionPercent(event.sourceSlotId, "x"),
              "--from-y": positionPercent(event.sourceSlotId, "y"),
              "--to-x": positionPercent(event.targetSlotId, "x"),
              "--to-y": positionPercent(event.targetSlotId, "y"),
              "--flight-delay": `${index * 320}ms`,
            } as CSSProperties}
          >
            <path d="M 50 50 L 50 7 A 43 43 0 0 1 87 71 Z" className={`slice-flight__wedge slice-flight__wedge--${event.cakeTypeId}`} />
          </svg>
        ))}
        {recentEvents.map((event, index) => event.type === "clear" ? (
          <div
            className="plate-clear"
            key={`clear-${event.slotId}-${index}`}
            style={{
              left: positionPercent(event.slotId, "x"),
              top: positionPercent(event.slotId, "y"),
              "--clear-delay": `${index * 320}ms`,
            } as CSSProperties}
          >
            <Plate
              plate={{
                id: `clearing-${event.slotId}-${index}`,
                slices: Array.from({ length: 6 }, () => ({ cakeTypeId: event.cakeTypeId })),
              }}
            />
          </div>
        ) : null)}
      </div>
    </section>
  );
}
