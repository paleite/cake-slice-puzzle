import { useEffect, useId, useState } from "react";
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
import { getRotationDelta, sortSlicesByType } from "../presentation/plate-geometry";

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

const CAKE_RADIUS = 40.5;
const CAKE_SIDE_HEIGHT = 8.5;
const CAKE_CENTER = PLATE_CENTER;

function cakePoint(angleDegrees: number, radius = CAKE_RADIUS) {
  const radians = (angleDegrees * Math.PI) / 180;
  return {
    x: CAKE_CENTER.x + Math.cos(radians) * radius,
    y: CAKE_CENTER.y + Math.sin(radians) * radius,
  };
}

function cakeSectorPath(index: number, rotationDegrees: number, radius = CAKE_RADIUS): string {
  const center = -90 + index * 60 + rotationDegrees;
  const start = cakePoint(center - 30, radius);
  const end = cakePoint(center + 30, radius);
  return [
    `M ${CAKE_CENTER.x} ${CAKE_CENTER.y}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 0 1 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
}

function cakeSectorArc(index: number, rotationDegrees: number, radius = CAKE_RADIUS): string {
  const center = -90 + index * 60 + rotationDegrees;
  const start = cakePoint(center - 30, radius);
  const end = cakePoint(center + 30, radius);
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 0 1 ${end.x} ${end.y}`;
}

function cakeSidePath(): string {
  const r = CAKE_RADIUS;
  const h = CAKE_SIDE_HEIGHT;
  const k = 0.55228475 * r;
  const { x, y } = CAKE_CENTER;
  return [
    `M ${x - r} ${y}`,
    `C ${x - r} ${y + k} ${x - k} ${y + r} ${x} ${y + r}`,
    `C ${x + k} ${y + r} ${x + r} ${y + k} ${x + r} ${y}`,
    `L ${x + r} ${y + h}`,
    `C ${x + r} ${y + h + k} ${x + k} ${y + h + r} ${x} ${y + h + r}`,
    `C ${x - k} ${y + h + r} ${x - r} ${y + h + k} ${x - r} ${y + h}`,
    "Z",
  ].join(" ");
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
  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9_-]/g, "");
  const topClipId = `cake-top-${uid}`;
  const sideClipId = `cake-side-${uid}`;
  const sideFillId = `cake-fill-${uid}`;
  const presentIndexes = slices
    .map((_, index) => index)
    .filter((index) => !hiddenSliceIndexes?.has(index));

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      // A plate can be a source, target, then source again across consecutive beats.
      // Always animate the shortest visual arc instead of unwinding through 300°.
      setDisplayRotation((current) => current + getRotationDelta(current, rotationDegrees));
    });
    return () => cancelAnimationFrame(frame);
  }, [rotationDegrees]);

  return (
    <div className={compact ? "plate plate--compact" : "plate"} aria-label={`${visibleSliceCount} cake slices`}>
      <svg viewBox="0 0 100 100" role="img">
        <defs>
          <clipPath id={topClipId} clipPathUnits="userSpaceOnUse">
            <circle cx={CAKE_CENTER.x} cy={CAKE_CENTER.y} r={CAKE_RADIUS} />
          </clipPath>
          <clipPath id={sideClipId} clipPathUnits="userSpaceOnUse">
            {presentIndexes.map((index) => (
              <path
                key={index}
                d={cakeSectorPath(index, displayRotation, CAKE_RADIUS + CAKE_SIDE_HEIGHT + 2)}
              />
            ))}
          </clipPath>
          <linearGradient id={sideFillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff3df" />
            <stop offset=".18" stopColor="#fff3df" />
            <stop offset=".24" stopColor="#efc89e" />
            <stop offset=".5" stopColor="#dba172" />
            <stop offset=".62" stopColor="#c9875f" />
            <stop offset="1" stopColor="#a96546" />
          </linearGradient>
        </defs>
        <image
          href={CAKE_PLATE_ASSET}
          x="0"
          y="0"
          width="100"
          height="100"
          className="plate__art"
        />
        <g transform={CAKE_PERSPECTIVE_TRANSFORM}>
          {presentIndexes.length > 0 && (
            <path
              d={cakeSidePath()}
              fill={`url(#${sideFillId})`}
              stroke="#5b3a2e"
              strokeWidth="1.1"
              clipPath={`url(#${sideClipId})`}
            />
          )}
          <g clipPath={`url(#${topClipId})`}>
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
          </g>
          {presentIndexes.map((index) => (
            <g key={`rim-${index}`}>
              <path
                d={cakeSectorArc(index, displayRotation, CAKE_RADIUS - 0.9)}
                fill="none"
                stroke="#fff4dc"
                strokeWidth="2.8"
              />
              <path
                d={cakeSectorArc(index, displayRotation)}
                fill="none"
                stroke="#5b3a2e"
                strokeWidth="1"
              />
            </g>
          ))}
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
