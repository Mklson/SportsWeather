import type { StravaSegment, WeatherSegment } from "@/types";
import { StravaSegmentList } from "./StravaSegmentList";

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
  if (!stravaConnected) {
    return (
      <div className="flex items-center justify-center h-24 text-gray-400 text-sm px-6 text-center">
        Connect to Strava from your dashboard to see segments along the route
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b border-gray-100">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Strava segments</span>
        {!loading && totalCount > 0 && (
          <button
            onClick={onToggleStarredOnly}
            className="text-xs font-medium text-amber-500 active:text-amber-700"
          >
            {starredOnly ? `★ ${starredCount} · Show all` : `All ${totalCount} · ★ only`}
          </button>
        )}
      </div>
      {loading && (
        <div className="flex-shrink-0 flex items-center justify-center gap-2 p-3 text-sm text-orange-500 animate-pulse">
          Loading Strava segments…
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
