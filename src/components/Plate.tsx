import type { CakeTypeId, Plate as PlateType } from "../game/types";

const cakeColors: Record<CakeTypeId, string> = {
  strawberry: "#ef6a72",
  lemon: "#f5c84c",
  mint: "#74c58a",
  blueberry: "#7788da",
  chocolate: "#9a6957",
  orange: "#f29b52",
};

function polarPoint(angleDegrees: number, radius: number) {
  const angle = (angleDegrees - 90) * (Math.PI / 180);
  return { x: 50 + radius * Math.cos(angle), y: 50 + radius * Math.sin(angle) };
}

function wedgePath(startAngle: number, endAngle: number) {
  const start = polarPoint(startAngle, 43);
  const end = polarPoint(endAngle, 43);
  return `M 50 50 L ${start.x} ${start.y} A 43 43 0 0 1 ${end.x} ${end.y} Z`;
}

export function Plate({ plate, compact = false }: { plate: PlateType; compact?: boolean }) {
  const groupedSlices = [...plate.slices].sort((left, right) => left.cakeTypeId.localeCompare(right.cakeTypeId));

  return (
    <div className={compact ? "plate plate--compact" : "plate"} aria-label={`${plate.slices.length} cake slices`}>
      <svg viewBox="0 0 100 100" role="img">
        <circle cx="50" cy="50" r="47" className="plate__dish" />
        {groupedSlices.map((slice, index) => {
          const startAngle = index * 60;
          return (
            <path
              key={`${slice.cakeTypeId}-${index}`}
              d={wedgePath(startAngle, startAngle + 60)}
              fill={cakeColors[slice.cakeTypeId]}
              className="plate__slice"
            />
          );
        })}
        <circle cx="50" cy="50" r="5" className="plate__center" />
      </svg>
    </div>
  );
}
