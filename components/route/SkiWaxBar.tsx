"use client";

import { recommendWax } from "@/lib/wax-recommendation";
import type { WeatherSegment } from "@/types";

interface Props {
  segments: WeatherSegment[];
}

export function SkiWaxBar({ segments }: Props) {
  const wax = recommendWax(segments);
  if (wax.kind === "no-data") return null;

  if (wax.kind === "no-snow") {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 bg-white border-t-2 border-gray-200 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
        <span className="text-lg shrink-0">🌱</span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-gray-700">No snow in the forecast</div>
          <p className="text-xs text-gray-400">
            Avg {wax.avgTemp.toFixed(1)}°C along the route — likely no snow cover, so no wax pick shown.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 bg-white border-t-2 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]"
      style={{ borderTopColor: wax.colorHex }}
    >
      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: wax.colorHex }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5 text-sm font-semibold text-gray-900 flex-wrap">
          <span>⛷️ Skismøring:</span>
          <span>{wax.product}</span>
        </div>
        <p className="text-xs text-gray-400">
          {wax.tempRangeLabel} · avg {wax.avgTemp.toFixed(1)}°C · {wax.snowState === "new" ? "new snow" : "old/transformed snow"} · estimated — verify before racing
        </p>
      </div>
    </div>
  );
}
