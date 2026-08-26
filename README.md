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

## Current v1 resolver rule

Matching slices consolidate across connected orthogonal plate components reached from the newly placed plate.

A plate must have free capacity to receive slices. If only one of two matching plates has free capacity, matching slices move toward that plate even when it contains the smaller matching group.

If both plates have free capacity, matching slices move toward the larger existing matching group. If both matching groups have equal size, the current implementation uses stable board-slot order as a deterministic tie-break. This tie-break has not been confirmed against the reference game.

A merge discovers the complete connected component before moving slices. The target is the eligible plate with the largest existing matching group; stable board-slot order breaks ties. All matching sources contribute until target capacity is full. A transfer that completes a six-slice cake has candidate priority. Completed cakes clear immediately. Resolution repeats for other cake types until the board is stable.

The resolver is intentionally isolated in `src/game/` so this rule can be replaced after comparing the prototype against the target game's behavior.
