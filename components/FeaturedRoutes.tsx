import Link from "next/link";
import type { DbRoute } from "@/types";

const SPORT_LABELS: Record<string, { label: string; icon: string }> = {
  cycling: { label: "Cycling", icon: "🚴" },
  running: { label: "Running", icon: "🏃" },
  skiing:  { label: "Skiing",  icon: "⛷️" },
};

function RouteCard({ route }: { route: DbRoute }) {
  const sport = route.sport ? SPORT_LABELS[route.sport] : null;

  return (
    <Link
      href={`/route/${route.id}`}
      className="flex flex-col gap-2 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold text-blue-900 leading-snug line-clamp-2">
          {route.name}
        </span>
        {sport && (
          <span className="shrink-0 text-xl" title={sport.label}>
            {sport.icon}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-3 text-sm text-gray-500">
        <span>{route.distance_km.toFixed(1)} km</span>
        {route.elevation_gain_m != null && route.elevation_gain_m > 0 && (
          <span>↑ {Math.round(route.elevation_gain_m)} m</span>
        )}
      </div>
      <span className="mt-auto pt-1 text-sm font-medium text-blue-600">
        View route →
      </span>
    </Link>
  );
}

export function FeaturedRoutes({ routes }: { routes: DbRoute[] }) {
  if (routes.length === 0) return null;

  return (
    <div className="w-full max-w-md">
      <p className="mb-3 text-center text-sm font-medium text-gray-400 uppercase tracking-wide">
        Try a sample route
      </p>
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(routes.length, 2)}, 1fr)` }}>
        {routes.map((route) => (
          <RouteCard key={route.id} route={route} />
        ))}
      </div>
    </div>
  );
}
