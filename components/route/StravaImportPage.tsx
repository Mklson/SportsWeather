"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import type { StravaRoute, UploadResponse } from "@/types";
import clsx from "clsx";

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

const ROUTE_TYPE: Record<number, string> = { 1: "Sykkel", 2: "Løping", 3: "Gange" };

export function StravaImportPage({ activities: initial, routes: initialRoutes }: Props) {
  const router = useRouter();

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
      setError(err instanceof Error ? err.message : "Feil ved import");
      setImporting(null);
    }
  };

  // ── Import saved route ───────────────────────────────────────────────────
  const importRoute = async (id: number) => {
    setImporting(`rt-${id}`);
    setError(null);
    try {
      const res = await fetch("/api/strava/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routeId: id }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
      const { route } = (await res.json()) as UploadResponse;
      router.push(`/route/${route.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Feil ved import");
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
      setError(err instanceof Error ? err.message : "Kunne ikke laste flere");
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
      setError(err instanceof Error ? err.message : "Kunne ikke laste flere");
    } finally {
      setRtLoadingMore(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-red-400 text-sm p-3 bg-red-900/20 rounded-lg">{error}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ── Seneste aktiviteter ─────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Seneste aktiviteter
          </h2>
          <div className="space-y-2">
            {activities.map((a) => (
              <button
                key={a.id}
                onClick={() => importActivity(a.id)}
                disabled={importing !== null}
                className={clsx(
                  "w-full text-left p-3 rounded-xl bg-gray-800 hover:bg-gray-700",
                  "border border-gray-700 hover:border-orange-500/50",
                  "transition-all flex items-center justify-between gap-3",
                  importing === `act-${a.id}` && "opacity-60 animate-pulse"
                )}
              >
                <div className="min-w-0">
                  <p className="font-medium text-white text-sm truncate">{a.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {format(new Date(a.startDate), "d. MMM yyyy", { locale: nb })}
                    {" · "}{a.distanceKm.toFixed(1)} km
                    {" · "}{a.type}
                  </p>
                </div>
                <span className="text-gray-500 text-xs shrink-0">
                  {importing === `act-${a.id}` ? "Importerer…" : "Velg →"}
                </span>
              </button>
            ))}
            {actHasMore && (
              <button
                onClick={loadMoreActivities}
                disabled={actLoadingMore || importing !== null}
                className={clsx(
                  "w-full p-3 rounded-xl border border-gray-700 text-gray-400",
                  "hover:border-gray-500 hover:text-gray-200 transition-colors text-sm",
                  actLoadingMore && "opacity-60 animate-pulse"
                )}
              >
                {actLoadingMore ? "Laster…" : "Last inn flere"}
              </button>
            )}
          </div>
        </section>

        {/* ── Gemte ruter ─────────────────────────────────────────── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Gemte ruter
          </h2>
          {routes.length === 0 ? (
            <p className="text-gray-500 text-sm p-4 bg-gray-800/50 rounded-xl border border-gray-700">
              Ingen gemte ruter funnet. Opprett ruter i Strava-appen for å se dem her.
            </p>
          ) : (
            <div className="space-y-2">
              {routes.map((r) => (
                <button
                  key={r.id}
                  onClick={() => importRoute(r.id)}
                  disabled={importing !== null || !r.hasSummaryPolyline}
                  className={clsx(
                    "w-full text-left p-3 rounded-xl bg-gray-800",
                    "border border-gray-700 transition-all flex items-center justify-between gap-3",
                    r.hasSummaryPolyline
                      ? "hover:bg-gray-700 hover:border-blue-500/50"
                      : "opacity-50 cursor-not-allowed",
                    importing === `rt-${r.id}` && "opacity-60 animate-pulse"
                  )}
                >
                  <div className="min-w-0">
                    <p className="font-medium text-white text-sm truncate">{r.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {(r.distanceM / 1000).toFixed(1)} km
                      {r.elevationGain > 0 && ` · +${Math.round(r.elevationGain)} m`}
                      {" · "}{ROUTE_TYPE[r.type] ?? "Ukjent"}
                    </p>
                  </div>
                  <span className="text-gray-500 text-xs shrink-0">
                    {importing === `rt-${r.id}`
                      ? "Importerer…"
                      : r.hasSummaryPolyline
                        ? "Velg →"
                        : "Ingen data"}
                  </span>
                </button>
              ))}
              {rtHasMore && (
                <button
                  onClick={loadMoreRoutes}
                  disabled={rtLoadingMore || importing !== null}
                  className={clsx(
                    "w-full p-3 rounded-xl border border-gray-700 text-gray-400",
                    "hover:border-gray-500 hover:text-gray-200 transition-colors text-sm",
                    rtLoadingMore && "opacity-60 animate-pulse"
                  )}
                >
                  {rtLoadingMore ? "Laster…" : "Last inn flere"}
                </button>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
