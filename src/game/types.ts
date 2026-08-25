export const CAKE_TYPES = ["strawberry", "lemon", "mint", "blueberry", "chocolate"] as const;

export type CakeTypeId = (typeof CAKE_TYPES)[number];

export type Slice = {
  cakeTypeId: CakeTypeId;
};

export type Plate = {
  id: string;
  slices: Slice[];
};

export type SlotId =
  | "a0" | "a1" | "a2" | "a3"
  | "b0" | "b1" | "b2" | "b3"
  | "c0" | "c1" | "c2" | "c3"
  | "d0" | "d1" | "d2" | "d3"
  | "e0" | "e1" | "e2" | "e3";

export type BoardSlot = {
  id: SlotId;
  row: number;
  column: number;
  plate: Plate | null;
};

export type GameStatus = "playing" | "resolving" | "game-over";

export type GameState = {
  slots: BoardSlot[];
  tray: Plate[];
  score: number;
  cakesCleared: number;
  status: GameStatus;
  randomSeed: number;
  focusedSlotId: SlotId | null;
};

export type TransferEvent = {
  type: "transfer";
  sourceSlotId: SlotId;
  targetSlotId: SlotId;
  cakeTypeId: CakeTypeId;
  sliceCount: number;
};

export type ClearEvent = {
  type: "clear";
  slotId: SlotId;
  cakeTypeId: CakeTypeId;
  score: number;
};

export type GameEvent = TransferEvent | ClearEvent;

export type ResolveResult = {
  state: GameState;
  events: GameEvent[];
};
