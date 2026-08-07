"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { enUS, nb } from "date-fns/locale";
import type { StravaRoute, UploadResponse } from "@/types";
import clsx from "clsx";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

interface ActivityItem {
  id: number;
  name: string;
  distanceKm: number;
  startDate: string;
  type: string;
}

interface Props {
  activities: ActivityItem[];
  routes: StravaRoute[];
}

export function StravaImportPage({ activities: initial, routes: initialRoutes }: Props) {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const ROUTE_TYPE: Record<number, string> = {
    1: t.stravaActivity.routeType.cycling,
    2: t.stravaActivity.routeType.running,
    3: t.stravaActivity.routeType.walking,
  };

  // Activities state
  const [activities, setActivities] = useState(initial);
  const [actPage, setActPage] = useState(1);
  const [actHasMore, setActHasMore] = useState(initial.length === 30);
  const [actLoadingMore, setActLoadingMore] = useState(false);

  // Routes state
  const [routes, setRoutes] = useState(initialRoutes);
  const [rtPage, setRtPage] = useState(1);
  const [rtHasMore, setRtHasMore] = useState(initialRoutes.length === 30);
  const [rtLoadingMore, setRtLoadingMore] = useState(false);

  const [importing, setImporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Import activity ──────────────────────────────────────────────────────
  const importActivity = async (id: number) => {
    setImporting(`act-${id}`);
    setError(null);
    try {
      const res = await fetch("/api/strava/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityId: id }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
      const { route } = (await res.json()) as UploadResponse;
      router.push(`/route/${route.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.stravaActivity.importFailed);
      setImporting(null);
    }
  };

  // ── Import saved route ───────────────────────────────────────────────────
  const importRoute = async (r: StravaRoute) => {
    setImporting(`rt-${r.id}`);
    setError(null);
    try {
      const res = await fetch("/api/strava/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routeId: r.id,
          routeName: r.name,
          routeType: r.type,
          summaryPolyline: r.summaryPolyline,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
      const { route } = (await res.json()) as UploadResponse;
      router.push(`/route/${route.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.stravaActivity.importFailed);
      setImporting(null);
    }
  };

  // ── Load more activities ─────────────────────────────────────────────────
  const loadMoreActivities = async () => {
    setActLoadingMore(true);
    try {
      const next = actPage + 1;
      const res = await fetch(`/api/strava/activities?page=${next}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { activities: more } = await res.json() as { activities: ActivityItem[] };
      setActivities((p) => [...p, ...more]);
      setActPage(next);
      setActHasMore(more.length === 30);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.stravaActivity.couldNotLoadMore);
    } finally {
      setActLoadingMore(false);
    }
  };

  // ── Load more routes ─────────────────────────────────────────────────────
  const loadMoreRoutes = async () => {
    setRtLoadingMore(true);
    try {
      const next = rtPage + 1;
      const res = await fetch(`/api/strava/routes?page=${next}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { routes: more } = await res.json() as { routes: StravaRoute[] };
      setRoutes((p) => [...p, ...more]);
      setRtPage(next);
      setRtHasMore(more.length === 30);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.stravaActivity.couldNotLoadMore);
    } finally {
      setRtLoadingMore(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-red-600 text-sm p-3 bg-red-50 rounded-lg border border-red-200">{error}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ── Seneste aktiviteter ─────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            {t.stravaActivity.recentActivities}
          </h2>
          <div className="space-y-2">
            {activities.map((a) => (
              <button
                key={a.id}
                onClick={() => importActivity(a.id)}
                disabled={importing !== null}
                className={clsx(
                  "w-full text-left p-3 rounded-xl bg-white hover:bg-orange-50",
                  "border border-gray-200 hover:border-orange-300",
                  "transition-all flex items-center justify-between gap-3",
                  importing === `act-${a.id}` && "opacity-60 animate-pulse"
                )}
              >
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{a.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {format(new Date(a.startDate), "MMM d, yyyy", { locale: lang === "no" ? nb : enUS })}
                    {" · "}{a.distanceKm.toFixed(1)} km
                    {" · "}{a.type}
                  </p>
                </div>
                <span className="text-gray-400 text-xs shrink-0">
                  {importing === `act-${a.id}` ? t.stravaActivity.importing : t.stravaActivity.select}
                </span>
              </button>
            ))}
            {actHasMore && (
              <button
                onClick={loadMoreActivities}
                disabled={actLoadingMore || importing !== null}
                className={clsx(
                  "w-full p-3 rounded-xl border border-gray-200 text-gray-500",
                  "hover:border-gray-300 hover:text-gray-700 transition-colors text-sm",
                  actLoadingMore && "opacity-60 animate-pulse"
                )}
              >
                {actLoadingMore ? t.stravaActivity.loading : t.stravaActivity.loadMore}
              </button>
            )}
          </div>
        </section>

        {/* ── Gemte ruter ─────────────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            {t.stravaActivity.savedRoutes}
          </h2>
          {routes.length === 0 ? (
            <p className="text-gray-500 text-sm p-4 bg-white rounded-xl border border-gray-200">
              {t.stravaActivity.noSavedRoutes}
            </p>
          ) : (
            <div className="space-y-2">
              {routes.map((r) => (
                <button
                  key={r.id}
                  onClick={() => importRoute(r)}
                  disabled={importing !== null || !r.hasSummaryPolyline}
                  className={clsx(
                    "w-full text-left p-3 rounded-xl bg-white",
                    "border border-gray-200 transition-all flex items-center justify-between gap-3",
                    r.hasSummaryPolyline
                      ? "hover:bg-brand-green-soft hover:border-brand-green-border"
                      : "opacity-50 cursor-not-allowed",
                    importing === `rt-${r.id}` && "opacity-60 animate-pulse"
                  )}
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{r.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {(r.distanceM / 1000).toFixed(1)} km
                      {r.elevationGain > 0 && ` · +${Math.round(r.elevationGain)} m`}
                      {" · "}{ROUTE_TYPE[r.type] ?? t.stravaActivity.unknown}
                    </p>
                  </div>
                  <span className="text-gray-400 text-xs shrink-0">
                    {importing === `rt-${r.id}`
                      ? t.stravaActivity.importing
                      : r.hasSummaryPolyline
                        ? t.stravaActivity.select
                        : t.stravaActivity.noData}
                  </span>
                </button>
              ))}
              {rtHasMore && (
                <button
                  onClick={loadMoreRoutes}
                  disabled={rtLoadingMore || importing !== null}
                  className={clsx(
                    "w-full p-3 rounded-xl border border-gray-200 text-gray-500",
                    "hover:border-gray-300 hover:text-gray-700 transition-colors text-sm",
                    rtLoadingMore && "opacity-60 animate-pulse"
                  )}
                >
                  {rtLoadingMore ? t.stravaActivity.loading : t.stravaActivity.loadMore}
                </button>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
