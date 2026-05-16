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
  return `↑${Math.round(m)} m`;
}

interface Props {
  routes: DbRoute[];
}

export function SavedRoutes({ routes }: Props) {
  if (routes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <span className="text-4xl">📂</span>
        <p className="text-gray-500 text-sm max-w-xs">
          No saved routes yet. Upload a GPX or TCX file to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden divide-y divide-gray-100">
      {routes.map((route) => (
        <Link
          key={route.id}
          href={`/route/${route.id}`}
          className="flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 transition-colors group"
        >
          <span className="text-base shrink-0 w-6 text-center">
            {sportEmoji(route.sport)}
          </span>

          <span className="flex-1 text-sm font-medium text-gray-900 group-hover:text-blue-700 transition-colors truncate min-w-0">
            {route.name}
          </span>

          <div className="flex items-center gap-2.5 text-xs text-gray-400 shrink-0">
            {formatDist(route.distance_km) && (
              <span>{formatDist(route.distance_km)}</span>
            )}
            {formatElev(route.elevation_gain_m) && (
              <span className="hidden sm:block">{formatElev(route.elevation_gain_m)}</span>
            )}
            <span className="hidden sm:block w-16 text-right">
              {format(new Date(route.created_at), "d MMM yyyy")}
            </span>
            <span className="sm:hidden">
              {format(new Date(route.created_at), "d MMM")}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
