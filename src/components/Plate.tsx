import { useEffect, useState } from "react";
import type { Plate as PlateType } from "../game/types";
import {
  CAKE_PLATE_ASSET,
  CAKE_SLICE_ASSETS,
  PLATE_CENTER,
  SLICE_IMAGE_SIZE,
  SLICE_IMAGE_X,
  SLICE_IMAGE_Y,
} from "../presentation/cake-assets";
import { sortSlicesByType } from "../presentation/plate-geometry";

export function Plate({
  plate,
  compact = false,
  rotationDegrees = 0,
  hiddenSliceIndexes,
}: {
  plate: PlateType;
  compact?: boolean;
  rotationDegrees?: number;
  hiddenSliceIndexes?: ReadonlySet<number>;
}) {
  const slices = sortSlicesByType(plate.slices);
  const visibleSliceCount = slices.length - (hiddenSliceIndexes?.size ?? 0);
  const [displayRotation, setDisplayRotation] = useState(0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setDisplayRotation(rotationDegrees));
    return () => cancelAnimationFrame(frame);
  }, [rotationDegrees]);

  return (
    <div className={compact ? "plate plate--compact" : "plate"} aria-label={`${visibleSliceCount} cake slices`}>
      <svg viewBox="0 0 100 100" role="img">
        <image
          href={CAKE_PLATE_ASSET}
          x="0"
          y="0"
          width="100"
          height="100"
          className="plate__art"
        />
        <g
          className="plate__slices"
          style={{ transform: `rotate(${displayRotation}deg)` }}
        >
          {slices.map((slice, index) => (
            <g
              key={`${slice.cakeTypeId}-${index}`}
              transform={`rotate(${index * 60} ${PLATE_CENTER.x} ${PLATE_CENTER.y})`}
              opacity={hiddenSliceIndexes?.has(index) ? 0 : 1}
            >
              <image
                href={CAKE_SLICE_ASSETS[slice.cakeTypeId]}
                x={SLICE_IMAGE_X}
                y={SLICE_IMAGE_Y}
                width={SLICE_IMAGE_SIZE}
                height={SLICE_IMAGE_SIZE}
                className="plate__slice"
              />
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
