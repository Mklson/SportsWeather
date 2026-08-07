import Link from "next/link";
import { cookies } from "next/headers";
import type { DbRoute } from "@/types";
import { getDictionary, type Lang } from "@/lib/i18n/dictionary";

function RouteRow({ route, sportLabels }: { route: DbRoute; sportLabels: Record<string, { label: string; icon: string }> }) {
  const sport = route.sport ? sportLabels[route.sport] : null;

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

  const cookieLang = cookies().get("lang")?.value;
  const lang: Lang = cookieLang === "en" ? "en" : "no";
  const t = getDictionary(lang);

  const sportLabels: Record<string, { label: string; icon: string }> = {
    cycling: { label: t.sport.cycling, icon: "🚴" },
    running: { label: t.sport.running, icon: "🏃" },
    skiing: { label: t.sport.skiing, icon: "⛷️" },
  };

  return (
    <div className="w-full max-w-md">
      <p className="mb-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">
        {t.front.sampleRoute}
      </p>
      <div className="flex flex-col gap-2">
        {routes.map((route) => (
          <RouteRow key={route.id} route={route} sportLabels={sportLabels} />
        ))}
      </div>
    </div>
  );
}
