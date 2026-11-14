import { useState } from "react";
import { buildHudView } from "../presentation/hud-view";
import { useGameStore } from "../store/game-store";
import { GameBoard } from "./GameBoard";
import { Tray } from "./Tray";
import { usePresentationDriver } from "./use-presentation-driver";

export function GameScreen() {
  usePresentationDriver();
  const [menuOpen, setMenuOpen] = useState(false);
  const score = useGameStore((state) => state.game.score);
  const cakesCleared = useGameStore((state) => state.game.cakesCleared);
  const status = useGameStore((state) => state.game.status);
  const lastEvents = useGameStore((state) => state.lastEvents);
  const presentation = useGameStore((state) => state.presentation);
  const restart = useGameStore((state) => state.restart);

  const hud = buildHudView({ score, cakesCleared, status }, presentation, lastEvents);

  return (
    <main className="game-shell">
      <header className="hud">
        <div>
          <span className="hud__eyebrow">Score</span>
          <strong className="hud__value" key={`score-${hud.score}`}>
            {hud.score.toLocaleString()}
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
          <strong className="hud__value">{hud.cakesCleared}</strong>
        </div>
      </header>

      <div className="event-banner" aria-live="polite">{hud.message}</div>
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

      {hud.phase === "complete" && (
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
