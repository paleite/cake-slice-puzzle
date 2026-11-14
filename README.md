# Cake Slice Puzzle

Greenfield PWA prototype for a deterministic cake-slice plate-merging puzzle.

## Run

```bash
pnpm install
pnpm dev
```

## Production build

```bash
pnpm build
pnpm preview
```

## Layers

- `src/game/` — pure domain: board state, generator, resolver, completion, transfers. No React, no DOM, no timing.
- `src/presentation/` — pure presentation model: phase, step timing, frame projection, board/HUD/tray view builders, palette. No React.
- `src/store/` — wiring: owns domain state plus the ephemeral presentation queue; persists domain state only.
- `src/components/` — rendering: one driver advances presentation beats; components map view builders to markup.

A presentation beat is `rotate` → `resolve` → `settle`. The rotate beat turns the outgoing slice toward the target (and the target's free wedge toward the source); the resolve beat flies merged slices or clears a completed cake; the settle beat returns plates to their base orientation. Rotation angles are derived from board geometry and plate slice order, never persisted.

## Current v1 resolver rule

Matching slices consolidate across connected orthogonal plate components reached from the newly placed plate.

A plate must have free capacity to receive slices. If only one of two matching plates has free capacity, matching slices move toward that plate even when it contains the smaller matching group.

If both plates have free capacity, matching slices move toward the larger existing matching group. If both matching groups have equal size, the current implementation uses stable board-slot order as a deterministic tie-break. This tie-break has not been confirmed against the reference game.

A merge discovers the complete connected component before moving slices. The target is the eligible plate with the largest existing matching group; stable board-slot order breaks ties. All matching sources contribute until target capacity is full. A transfer that completes a six-slice cake has candidate priority. Completed cakes clear immediately. Each cake type consolidates at most once between clears, then resolution repeats for the remaining cake types. A clear re-arms every cake type so a freed plate can chain into further merges.

The resolver is intentionally isolated in `src/game/` so this rule can be replaced after comparing the prototype against the target game's behavior.
