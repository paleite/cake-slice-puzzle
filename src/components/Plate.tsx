import { useEffect, useState } from "react";
import type { Plate as PlateType } from "../game/types";
import { CAKE_COLORS } from "../presentation/palette";
import { sortSlicesByType } from "../presentation/plate-geometry";

function polarPoint(angleDegrees: number, radius: number) {
  const angle = (angleDegrees - 90) * (Math.PI / 180);
  return { x: 50 + radius * Math.cos(angle), y: 50 + radius * Math.sin(angle) };
}

function wedgePath(startAngle: number, endAngle: number) {
  const start = polarPoint(startAngle, 43);
  const end = polarPoint(endAngle, 43);
  return `M 50 50 L ${start.x} ${start.y} A 43 43 0 0 1 ${end.x} ${end.y} Z`;
}

export function Plate({
  plate,
  compact = false,
  rotationDegrees = 0,
}: {
  plate: PlateType;
  compact?: boolean;
  rotationDegrees?: number;
}) {
  const groupedSlices = sortSlicesByType(plate.slices);
  const [displayRotation, setDisplayRotation] = useState(0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setDisplayRotation(rotationDegrees));
    return () => cancelAnimationFrame(frame);
  }, [rotationDegrees]);

  return (
    <div className={compact ? "plate plate--compact" : "plate"} aria-label={`${plate.slices.length} cake slices`}>
      <svg viewBox="0 0 100 100" role="img">
        <circle cx="50" cy="50" r="47" className="plate__dish" />
        <g
          className="plate__slices"
          style={{ transform: `rotate(${displayRotation}deg)` }}
        >
          {groupedSlices.map((slice, index) => {
            const startAngle = index * 60;
            return (
              <path
                key={`${slice.cakeTypeId}-${index}`}
                d={wedgePath(startAngle, startAngle + 60)}
                fill={CAKE_COLORS[slice.cakeTypeId]}
                className="plate__slice"
              />
            );
          })}
        </g>
        <circle cx="50" cy="50" r="5" className="plate__center" />
      </svg>
    </div>
  );
}
