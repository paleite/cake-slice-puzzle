import { useEffect, useState } from "react";
import type { Plate as PlateType } from "../game/types";
import {
  CAKE_PERSPECTIVE_TRANSFORM,
  CAKE_PLATE_ASSET,
  CAKE_SLICE_ASSETS,
  PLATE_CENTER,
  SLICE_IMAGE_SIZE,
  SLICE_IMAGE_X,
  SLICE_IMAGE_Y,
} from "../presentation/cake-assets";
import { sortSlicesByType } from "../presentation/plate-geometry";

function Face({ medallion = false }: { medallion?: boolean }) {
  return (
    <>
      {medallion && <ellipse cx="0" cy="0" rx="12" ry="8" fill="#fff4dc" stroke="#5b3a2e" strokeWidth="0.8" />}
      <g fill="#5b3a2e">
        <ellipse cx="-5" cy="-2" rx="1.6" ry="2" />
        <ellipse cx="5" cy="-2" rx="1.6" ry="2" />
      </g>
      <g fill="#fff" opacity=".75">
        <circle cx="-5.5" cy="-3" r="0.5" />
        <circle cx="4.5" cy="-3" r="0.5" />
      </g>
      <path d="M-2 2.2 Q0 4.2 2 2.2" fill="none" stroke="#5b3a2e" strokeWidth="1" strokeLinecap="round" />
      <g fill="#e8848c" opacity=".6">
        <ellipse cx="-9" cy="1.6" rx="2.4" ry="1.2" />
        <ellipse cx="9" cy="1.6" rx="2.4" ry="1.2" />
      </g>
    </>
  );
}

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
        <g transform={CAKE_PERSPECTIVE_TRANSFORM}>
          <g
            className="plate__slices"
            style={{ transform: `rotate(${displayRotation}deg)` }}
          >
            {slices.map((slice, index) => {
              if (hiddenSliceIndexes?.has(index)) return null;
              return (
                <g
                  key={`${slice.cakeTypeId}-${index}`}
                  transform={`rotate(${index * 60} ${PLATE_CENTER.x} ${PLATE_CENTER.y})`}
                >
                  <image
                    href={CAKE_SLICE_ASSETS[slice.cakeTypeId]}
                    x={SLICE_IMAGE_X}
                    y={SLICE_IMAGE_Y}
                    width={SLICE_IMAGE_SIZE}
                    height={SLICE_IMAGE_SIZE}
                    className="plate__slice"
                  />
                  {visibleSliceCount === 1 && (
                    <g transform="translate(50 34.5)">
                      <Face />
                    </g>
                  )}
                </g>
              );
            })}
          </g>
          {visibleSliceCount > 1 && (
            <g className="plate__face" transform={`translate(${PLATE_CENTER.x} ${PLATE_CENTER.y})`}>
              <Face medallion />
            </g>
          )}
        </g>
      </svg>
    </div>
  );
}
