import type { WeatherSegment } from "@/types";
import { windBreakdown } from "@/lib/weather-display";

export function WindBreakdownBar({ segments }: { segments: WeatherSegment[] }) {
  const breakdown = windBreakdown(segments);
  if (!breakdown) return null;
  const { tailPct, crossPct, headPct } = breakdown;

  return (
    <div className="space-y-1.5">
      <div className="flex overflow-hidden rounded-full h-2.5">
        {tailPct  > 0 && <div style={{ width: `${tailPct}%`,  backgroundColor: "#22c55e" }} />}
        {crossPct > 0 && <div style={{ width: `${crossPct}%`, backgroundColor: "#f59e0b" }} />}
        {headPct  > 0 && <div style={{ width: `${headPct}%`,  backgroundColor: "#ef4444" }} />}
      </div>
      <div className="flex justify-between text-xs font-medium">
        <span style={{ color: "#22c55e" }}>{tailPct}% tail</span>
        <span style={{ color: "#f59e0b" }}>{crossPct}% cross</span>
        <span style={{ color: "#ef4444" }}>{headPct}% head</span>
      </div>
    </div>
  );
}
