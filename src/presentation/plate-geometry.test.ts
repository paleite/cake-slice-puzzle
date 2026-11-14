import { describe, expect, it } from "vitest";
import type { CakeTypeId, Plate } from "../game/types";
import {
  getDirectionDegrees,
  getFreeWedgeCenterAngle,
  getSliceCenterAngle,
  getSliceStartAngle,
  getSourceRotation,
  getTargetRotation,
  normalizeAngle,
} from "./plate-geometry";

function plate(types: CakeTypeId[]): Plate {
  return { id: "plate", slices: types.map((cakeTypeId) => ({ cakeTypeId })) };
}

function normalize(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

describe("plate geometry", () => {
  it("derives wedge angles from arrival order", () => {
    const mixed = plate(["strawberry", "lemon"]);
    expect(getSliceStartAngle(mixed, "strawberry")).toBe(0);
    expect(getSliceStartAngle(mixed, "lemon")).toBe(60);
    expect(getSliceCenterAngle(mixed, "strawberry")).toBe(30);
    expect(getSliceCenterAngle(mixed, "lemon")).toBe(90);
    expect(getFreeWedgeCenterAngle(plate(Array<CakeTypeId>(5).fill("strawberry")))).toBe(330);
    expect(normalizeAngle(-120)).toBe(240);
    expect(normalizeAngle(420)).toBe(60);
  });

  it("points the outgoing slice at the target and the free wedge back at the source", () => {
    const source = { x: 37.5, y: 10 };
    const target = { x: 12.5, y: 10 };
    const direction = getDirectionDegrees(source, target);
    expect(direction).toBe(-90);

    const sourcePlate = plate(["strawberry"]);
    const sourceRotation = getSourceRotation(sourcePlate, "strawberry", source, target);
    expect(sourceRotation).toBe(-120);
    expect(normalize(getSliceCenterAngle(sourcePlate, "strawberry") + sourceRotation)).toBe(
      normalize(direction),
    );

    const targetPlate = plate(Array<CakeTypeId>(5).fill("strawberry"));
    const targetRotation = getTargetRotation(targetPlate, source, target);
    expect(targetRotation).toBe(120);
    expect(normalize(getFreeWedgeCenterAngle(targetPlate) + targetRotation)).toBe(
      normalize(getDirectionDegrees(target, source)),
    );
  });

  it("maps cardinal directions with zero at the top", () => {
    const center = { x: 50, y: 50 };
    expect(getDirectionDegrees(center, { x: 50, y: 0 })).toBe(0);
    expect(getDirectionDegrees(center, { x: 100, y: 50 })).toBe(90);
    expect(getDirectionDegrees(center, { x: 50, y: 100 })).toBe(180);
    expect(getDirectionDegrees(center, { x: 0, y: 50 })).toBe(-90);
  });
});
