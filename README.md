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

Matching slices consolidate between adjacent plates. The destination is the adjacent plate with the larger existing matching group. Equal groups consolidate toward the earlier stable board-slot order. A transfer that completes a six-slice cake has priority. Completed cakes clear immediately and resolution repeats until stable.

The resolver is intentionally isolated in `src/game/` so this rule can be replaced after comparing the prototype against the target game's behavior.
