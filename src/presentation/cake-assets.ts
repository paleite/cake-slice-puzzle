import type { CakeTypeId } from "../game/types";
import blueberry from "../assets/cake/blueberry.svg";
import chocolate from "../assets/cake/chocolate.svg";
import lemon from "../assets/cake/lemon.svg";
import mint from "../assets/cake/mint.svg";
import orange from "../assets/cake/orange.svg";
import plate from "../assets/cake/plate.svg";
import strawberry from "../assets/cake/strawberry.svg";

export const CAKE_SLICE_ASSETS: Record<CakeTypeId, string> = {
  strawberry,
  lemon,
  mint,
  blueberry,
  chocolate,
  orange,
};

export const CAKE_PLATE_ASSET = plate;

/** Plate SVG coordinate space and the point all slice tips meet. */
export const PLATE_CENTER = { x: 50, y: 56 } as const;
export const SLICE_IMAGE_SIZE = 54;
export const SLICE_TIP_RATIO_Y = 0.95;
export const SLICE_IMAGE_X = PLATE_CENTER.x - SLICE_IMAGE_SIZE / 2;
export const SLICE_IMAGE_Y = PLATE_CENTER.y - SLICE_TIP_RATIO_Y * SLICE_IMAGE_SIZE;
