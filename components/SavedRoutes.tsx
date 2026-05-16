import Link from "next/link";
import type { DbRoute } from "@/types";
import { format } from "date-fns";

const SPORT_EMOJI: Record<string, string> = {
  ride: "🚴",
  run: "🏃",
  ski: "⛷️",
  hike: "🥾",
};

function sportEmoji(sport: string | null) {
  return sport ? (SPORT_EMOJI[sport.toLowerCase()] ?? "📍") : "📍";
}

function formatDist(km: number | null) {
  if (!km) return null;
  return km >= 1 ? `${km.toFixed(1)} km` : `${Math.round(km * 1000)} m`;
}

function formatElev(m: number | null) {
  if (!m) return null;
  return `↑ ${Math.round(m)} m`;
}

interface Props {
  routes: DbRoute[];
}

export function SavedRoutes({ routes }: Props) {
  if (routes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <span className="text-5xl">📂</span>
        <p className="text-gray-500 text-sm max-w-xs">
          No saved routes yet. Upload a GPX or TCX file to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {routes.map((route) => (
        <Link
          key={route.id}
          href={`/route/${route.id}`}
          className="group flex flex-col gap-2 p-4 bg-white border border-gray-200 rounded-2xl hover:border-blue-300 hover:shadow-md transition-all"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="text-2xl">{sportEmoji(route.sport)}</span>
            <span className="text-xs text-gray-400 mt-0.5 shrink-0">
              {format(new Date(route.created_at), "d MMM yyyy")}
            </span>
          </div>
          <p className="font-semibold text-gray-900 text-sm leading-snug group-hover:text-blue-700 transition-colors line-clamp-2">
            {route.name}
          </p>
          <div className="flex gap-3 text-xs text-gray-500 mt-auto pt-1">
            {formatDist(route.distance_km) && (
              <span>{formatDist(route.distance_km)}</span>
            )}
            {formatElev(route.elevation_gain_m) && (
              <span>{formatElev(route.elevation_gain_m)}</span>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
