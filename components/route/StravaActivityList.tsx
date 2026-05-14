"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import type { UploadResponse } from "@/types";
import clsx from "clsx";

interface ActivityItem {
  id: number;
  name: string;
  distanceKm: number;
  startDate: string;
  type: string;
}

export function StravaActivityList({ activities: initial }: { activities: ActivityItem[] }) {
  const router = useRouter();
  const [activities, setActivities] = useState(initial);
  const [importing, setImporting] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initial.length === 30);
  const [error, setError] = useState<string | null>(null);

  const importActivity = async (id: number) => {
    setImporting(id);
    setError(null);
    try {
      const res = await fetch("/api/strava/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityId: id }),
      });
      if (!res.ok) {
        const { error: msg } = await res.json();
        throw new Error(msg ?? `HTTP ${res.status}`);
      }
      const { route } = (await res.json()) as UploadResponse;
      router.push(`/route/${route.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Feil ved import");
      setImporting(null);
    }
  };

  const loadMore = async () => {
    setLoadingMore(true);
    setError(null);
    try {
      const nextPage = page + 1;
      const res = await fetch(`/api/strava/activities?page=${nextPage}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { activities: more } = await res.json() as { activities: ActivityItem[] };
      setActivities((prev) => [...prev, ...more]);
      setPage(nextPage);
      setHasMore(more.length === 30);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke laste flere");
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="space-y-2">
      {error && (
        <p className="text-red-400 text-sm p-3 bg-red-900/20 rounded-lg">{error}</p>
      )}
      {activities.map((a) => (
        <button
          key={a.id}
          onClick={() => importActivity(a.id)}
          disabled={importing !== null}
          className={clsx(
            "w-full text-left p-4 rounded-xl bg-gray-800 hover:bg-gray-700",
            "border border-gray-700 hover:border-gray-500",
            "transition-all flex items-center justify-between gap-3",
            importing === a.id && "opacity-60 animate-pulse"
          )}
        >
          <div>
            <p className="font-medium text-white">{a.name}</p>
            <p className="text-sm text-gray-400">
              {format(new Date(a.startDate), "d. MMM yyyy", { locale: nb })}
              {" · "}
              {a.distanceKm.toFixed(1)} km
              {" · "}
              {a.type}
            </p>
          </div>
          <span className="text-gray-500 text-sm shrink-0">
            {importing === a.id ? "Importerer…" : "Velg →"}
          </span>
        </button>
      ))}

      {hasMore && (
        <button
          onClick={loadMore}
          disabled={loadingMore || importing !== null}
          className={clsx(
            "w-full p-3 rounded-xl border border-gray-700 text-gray-400",
            "hover:border-gray-500 hover:text-gray-200 transition-colors text-sm",
            loadingMore && "opacity-60 animate-pulse"
          )}
        >
          {loadingMore ? "Laster…" : "Last inn flere aktiviteter"}
        </button>
      )}
    </div>
  );
}
