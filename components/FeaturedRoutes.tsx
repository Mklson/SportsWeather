import Link from "next/link";
import type { DbRoute } from "@/types";

const SPORT_LABELS: Record<string, { label: string; icon: string }> = {
  cycling: { label: "Cycling", icon: "🚴" },
  running: { label: "Running", icon: "🏃" },
  skiing:  { label: "Skiing",  icon: "⛷️" },
};

function RouteRow({ route }: { route: DbRoute }) {
  const sport = route.sport ? SPORT_LABELS[route.sport] : null;

  return (
    <Link
      href={`/route/${route.id}`}
      className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-sm transition hover:border-brand-green-border hover:shadow-md"
    >
      {sport && (
        <span className="shrink-0 text-base" title={sport.label}>
          {sport.icon}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-brand-navy">
        {route.name}
      </span>
      <span className="shrink-0 text-xs text-gray-500">
        {route.distance_km.toFixed(1)} km
        {route.elevation_gain_m != null && route.elevation_gain_m > 0 && (
          <> · ↑ {Math.round(route.elevation_gain_m)} m</>
        )}
      </span>
    </Link>
  );
}

export function FeaturedRoutes({ routes }: { routes: DbRoute[] }) {
  if (routes.length === 0) return null;

  return (
    <div className="w-full max-w-md">
      <p className="mb-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">
        Try a sample route
      </p>
      <div className="flex flex-col gap-2">
        {routes.map((route) => (
          <RouteRow key={route.id} route={route} />
        ))}
      </div>
    </div>
  );
}
