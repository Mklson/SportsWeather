"use client";

import type { WeatherSegment } from "@/types";
import { summarizeConditions, weatherEmoji } from "@/lib/weather-display";
import { WindBreakdownBar } from "./WindBreakdownBar";
import { getDictionary, interpolate } from "@/lib/i18n/dictionary";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

function precipSummary(wetSegmentPct: number, t: ReturnType<typeof getDictionary>): string {
  if (wetSegmentPct === 0) return t.conditions.dryWholeWay;
  if (wetSegmentPct < 20) return t.conditions.mostlyDry;
  if (wetSegmentPct < 60) return interpolate(t.conditions.wetPercent, { pct: wetSegmentPct });
  return t.conditions.wetMost;
}

// Content-only — no chrome/backdrop of its own, rendered inside
// MobileControlBar's shared bottom-sheet shell.
export function ConditionsPanel({ segments }: { segments: WeatherSegment[] }) {
  const { t } = useLanguage();
  const summary = summarizeConditions(segments);

  if (!summary) {
    return (
      <div className="flex items-center justify-center h-24 text-gray-400 text-sm px-4 text-center">
        {t.conditions.noData}
      </div>
    );
  }

  return (
    <div className="px-4 py-3 space-y-4">
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{t.conditions.wind}</p>
        {summary.wind ? (
          <WindBreakdownBar segments={segments} />
        ) : (
          <p className="text-sm text-gray-400">{t.conditions.noWindData}</p>
        )}
      </div>

      <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
        <span className="text-3xl leading-none">{weatherEmoji(summary.dominantSymbolCode)}</span>
        <div>
          <p className="text-lg font-bold text-gray-900 tabular-nums">{Math.round(summary.avgTempC)}°C {t.conditions.average}</p>
          <p className="text-sm text-gray-500">{precipSummary(summary.wetSegmentPct, t)}</p>
        </div>
      </div>
    </div>
  );
}
