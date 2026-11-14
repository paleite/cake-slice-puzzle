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

/** Aligns the flat cake top with the isometric plate's ellipse. */
export const CAKE_CENTER_Y = 50.5;
export const CAKE_Y_SCALE = 0.62;
export const CAKE_PERSPECTIVE_TRANSFORM =
  `translate(${PLATE_CENTER.x} ${CAKE_CENTER_Y}) scale(1 ${CAKE_Y_SCALE}) translate(${-PLATE_CENTER.x} ${-PLATE_CENTER.y})`;
