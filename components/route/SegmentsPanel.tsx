"use client";

import type { StravaSegment, WeatherSegment } from "@/types";
import { StravaSegmentList } from "./StravaSegmentList";
import { interpolate } from "@/lib/i18n/dictionary";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

interface Props {
  stravaConnected: boolean;
  segments: StravaSegment[];
  weatherSegments: WeatherSegment[];
  loading: boolean;
  error: string | null;
  activeId: number | null;
  onSelect: (id: number) => void;
  starredOnly: boolean;
  onToggleStarredOnly: () => void;
  starredCount: number;
  totalCount: number;
}

// Content-only — no chrome/backdrop of its own, rendered inside
// MobileControlBar's shared bottom-sheet shell.
export function SegmentsPanel({
  stravaConnected,
  segments,
  weatherSegments,
  loading,
  error,
  activeId,
  onSelect,
  starredOnly,
  onToggleStarredOnly,
  starredCount,
  totalCount,
}: Props) {
  const { t } = useLanguage();

  if (!stravaConnected) {
    return (
      <div className="flex items-center justify-center h-24 text-gray-400 text-sm px-6 text-center">
        {t.segments.connectStrava}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b border-gray-100">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{t.segments.stravaSegments}</span>
        {!loading && totalCount > 0 && (
          <button
            onClick={onToggleStarredOnly}
            className="text-xs font-medium text-amber-500 active:text-amber-700"
          >
            {starredOnly
              ? interpolate(t.segments.showAll, { count: starredCount })
              : interpolate(t.segments.starredOnly, { count: totalCount })}
          </button>
        )}
      </div>
      {loading && (
        <div className="flex-shrink-0 flex items-center justify-center gap-2 p-3 text-sm text-orange-500 animate-pulse">
          {t.segments.loadingStrava}
        </div>
      )}
      {error && (
        <div className="mx-4 my-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex-shrink-0">
          {error}
        </div>
      )}
      {!loading && (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <StravaSegmentList segments={segments} weatherSegments={weatherSegments} activeId={activeId} onSelect={onSelect} starredOnly={starredOnly} />
        </div>
      )}
    </div>
  );
}
