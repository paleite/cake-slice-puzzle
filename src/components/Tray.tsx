import { buildTrayView } from "../presentation/hud-view";
import { useGameStore } from "../store/game-store";
import { Plate } from "./Plate";

export function Tray() {
  const tray = useGameStore((state) => state.game.tray);
  const selectedPlateId = useGameStore((state) => state.selectedPlateId);
  const selectPlate = useGameStore((state) => state.selectPlate);
  const presentation = useGameStore((state) => state.presentation);
  const view = buildTrayView({ tray }, presentation);

  return (
    <section className="tray" aria-label="Next plates">
      <div className="tray__label">Next plates</div>
      <div className="tray__plates">
        {view.plates.map((plate) => (
          <button
            type="button"
            key={plate.id}
            className={`tray-plate${selectedPlateId === plate.id ? " tray-plate--selected" : ""}`}
            onClick={() => selectPlate(plate.id)}
            aria-pressed={selectedPlateId === plate.id}
            aria-label={`Select plate with ${plate.slices.length} slices`}
          >
            <Plate plate={plate} compact />
          </button>
        ))}
      </div>
      <p className="tray__hint">
        {view.isResolving ? "Merging…" : "Select a plate, then tap an empty slot."}
      </p>
    </section>
  );
}
