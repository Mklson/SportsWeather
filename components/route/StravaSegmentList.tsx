import type { StravaSegment, WeatherSegment } from "@/types";
import { nearestWeatherSegment, windClassBorderColor, weatherEmoji } from "@/lib/weather-display";

export function StravaSegmentList({
  segments,
  weatherSegments,
  activeId,
  onSelect,
  starredOnly = false,
}: {
  segments: StravaSegment[];
  weatherSegments: WeatherSegment[];
  activeId: number | null;
  onSelect: (id: number) => void;
  starredOnly?: boolean;
}) {
  if (!segments.length) {
    return (
      <div className="flex items-center justify-center h-24 text-gray-400 text-sm px-4 text-center">
        {starredOnly
          ? "No starred segments along this route — tap ★ to show all"
          : "No Strava segments found along this route"}
      </div>
    );
  }
  return (
    <div className="space-y-2 px-3 py-3">
      {segments.map((seg) => {
        const midCoord = seg.coordinates[Math.floor(seg.coordinates.length / 2)];
        const midLatLng: [number, number] = midCoord
          ? [midCoord.lat, midCoord.lon]
          : seg.startLatLng;
        const wx = nearestWeatherSegment(midLatLng, weatherSegments);
        const wc = wx?.windClass ?? null;
        const borderColor = activeId === seg.id ? "#f97316" : windClassBorderColor(wc);

        return (
          <button
            key={seg.id}
            onClick={() => onSelect(seg.id)}
            className="w-full text-left p-3 rounded-xl bg-white transition-all"
            style={{
              border: `2px solid ${borderColor}`,
              borderLeft: `4px solid ${borderColor}`,
              boxShadow: activeId === seg.id ? `0 0 0 1px ${borderColor}` : undefined,
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium text-gray-900 text-sm leading-tight flex items-center gap-1">
                {seg.starred && <span className="text-amber-400" title="Starred segment">★</span>}
                {seg.name}
              </span>
              {seg.climbCategory > 0 && (
                <span className="shrink-0 text-xs font-bold text-white bg-blue-900 px-1.5 py-0.5 rounded">
                  {seg.climbCategory === 5 ? "HC" : `Cat ${seg.climbCategory}`}
                </span>
              )}
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <div className="flex gap-3 text-xs text-gray-500">
                <span>{(seg.distanceM / 1000).toFixed(1)} km</span>
                {seg.avgGrade !== 0 && <span>{seg.avgGrade.toFixed(1)}% snitt</span>}
                {seg.elevDifference > 0 && <span>+{Math.round(seg.elevDifference)} m</span>}
              </div>
              {wx && (
                <span className="shrink-0 flex items-center gap-1 text-sm font-semibold text-gray-700">
                  <span className="text-base">{weatherEmoji(wx.weather.symbolCode)}</span>
                  <span>{Math.round(wx.weather.temperature)}°</span>
                  {wx.weather.precipitation > 0.1 && (
                    <span className="text-blue-500 font-medium">{wx.weather.precipitation.toFixed(1)}mm</span>
                  )}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
