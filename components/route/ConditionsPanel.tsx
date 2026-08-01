import type { WeatherSegment } from "@/types";
import { summarizeConditions, weatherEmoji } from "@/lib/weather-display";
import { WindBreakdownBar } from "./WindBreakdownBar";

function precipSummary(wetSegmentPct: number): string {
  if (wetSegmentPct === 0) return "Dry the whole way";
  if (wetSegmentPct < 20) return "Mostly dry — a brief spell of rain or snow possible";
  if (wetSegmentPct < 60) return `Rain or snow expected along ~${wetSegmentPct}% of the route`;
  return "Wet for most of the route";
}

// Content-only — no chrome/backdrop of its own, rendered inside
// MobileControlBar's shared bottom-sheet shell.
export function ConditionsPanel({ segments }: { segments: WeatherSegment[] }) {
  const summary = summarizeConditions(segments);

  if (!summary) {
    return (
      <div className="flex items-center justify-center h-24 text-gray-400 text-sm px-4 text-center">
        No weather data yet for this route.
      </div>
    );
  }

  return (
    <div className="px-4 py-3 space-y-4">
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Wind</p>
        {summary.wind ? (
          <WindBreakdownBar segments={segments} />
        ) : (
          <p className="text-sm text-gray-400">No wind data</p>
        )}
      </div>

      <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
        <span className="text-3xl leading-none">{weatherEmoji(summary.dominantSymbolCode)}</span>
        <div>
          <p className="text-lg font-bold text-gray-900 tabular-nums">{Math.round(summary.avgTempC)}°C average</p>
          <p className="text-sm text-gray-500">{precipSummary(summary.wetSegmentPct)}</p>
        </div>
      </div>
    </div>
  );
}
