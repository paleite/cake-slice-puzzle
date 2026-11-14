import { useState } from "react";
import {
  getPresentationCakesCleared,
  getPresentationScore,
} from "../game/presentation";
import type { ResolveStep } from "../game/types";
import { useGameStore } from "../store/game-store";
import { GameBoard } from "./GameBoard";
import { Tray } from "./Tray";

function describeStep(step: ResolveStep): string {
  const clear = step.events.find((event) => event.type === "clear");
  if (clear !== undefined) return `Cake cleared +${clear.score}`;
  const sliceCount = step.events.reduce(
    (total, event) => total + (event.type === "transfer" ? event.sliceCount : 0),
    0,
  );
  return `${sliceCount} slice${sliceCount === 1 ? "" : "s"} merged`;
}

export function GameScreen() {
  const [menuOpen, setMenuOpen] = useState(false);
  const score = useGameStore((state) => state.score);
  const cakesCleared = useGameStore((state) => state.cakesCleared);
  const status = useGameStore((state) => state.status);
  const recentEvents = useGameStore((state) => state.recentEvents);
  const presentation = useGameStore((state) => state.presentation);
  const restart = useGameStore((state) => state.restart);

  const currentStep = presentation === null ? undefined : presentation.steps[presentation.index];
  const displayedScore = presentation === null ? score : getPresentationScore(presentation);
  const displayedCakesCleared = presentation === null ? cakesCleared : getPresentationCakesCleared(presentation);

  const lastEvent = recentEvents.at(-1);
  const lastEventText = lastEvent?.type === "clear"
    ? `Cake cleared +${lastEvent.score}`
    : lastEvent?.type === "transfer"
      ? `${lastEvent.sliceCount} slice${lastEvent.sliceCount === 1 ? "" : "s"} merged`
      : "Build complete cakes of six matching slices.";
  const eventText = currentStep === undefined ? lastEventText : describeStep(currentStep);

  return (
    <main className="game-shell">
      <header className="hud">
        <div>
          <span className="hud__eyebrow">Score</span>
          <strong className="hud__value" key={`score-${displayedScore}`}>
            {displayedScore.toLocaleString()}
          </strong>
        </div>
        <button
          type="button"
          className="hud__title hud__menu-trigger"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          Cake Slice <span aria-hidden="true">⌄</span>
        </button>
        <div className="hud__right">
          <span className="hud__eyebrow">Cleared</span>
          <strong className="hud__value">{displayedCakesCleared}</strong>
        </div>
      </header>

      <div className="event-banner" aria-live="polite">{eventText}</div>
      <GameBoard />
      <Tray />

      {menuOpen && (
        <div className="game-menu" role="menu" aria-label="Game menu">
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              restart();
              setMenuOpen(false);
            }}
          >
            Restart game
          </button>
          <button type="button" role="menuitem" onClick={() => setMenuOpen(false)}>
            Close
          </button>
        </div>
      )}

      {status === "game-over" && presentation === null && (
        <div className="game-over" role="dialog" aria-modal="true" aria-label="Game over">
          <div className="game-over__card">
            <span className="hud__eyebrow">Game over</span>
            <h1>{score.toLocaleString()}</h1>
            <p>{cakesCleared} complete cakes cleared</p>
            <button type="button" onClick={restart}>Play again</button>
          </div>
        </div>
      )}
    </main>
  );
}
