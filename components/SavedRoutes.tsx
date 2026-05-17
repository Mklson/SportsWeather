"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DbRouteSummary } from "@/types";
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
  routes: DbRouteSummary[];
}

export function SavedRoutes({ routes }: Props) {
  const router = useRouter();
  const [localRoutes, setLocalRoutes] = useState(routes);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeletingId(id);
    setLocalRoutes((prev) => prev.filter((r) => r.id !== id));
    setConfirmId(null);
    try {
      await fetch(`/api/routes/${id}`, { method: "DELETE" });
      router.refresh();
    } catch {
      setLocalRoutes(routes);
    } finally {
      setDeletingId(null);
    }
  }

  if (localRoutes.length === 0) {
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
      {localRoutes.map((route) => (
        <div key={route.id} className="flex items-center gap-3 px-3 py-2.5 group">
          {confirmId === route.id ? (
            /* Inline confirm row */
            <>
              <span className="flex-1 text-sm text-gray-500">Delete «{route.name}»?</span>
              <button
                onClick={() => handleDelete(route.id)}
                disabled={deletingId === route.id}
                className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
              >
                Delete
              </button>
              <button
                onClick={() => setConfirmId(null)}
                className="text-xs font-medium text-gray-500 hover:text-gray-800 px-2 py-1 transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            /* Normal row */
            <>
              <span className="text-base shrink-0 w-6 text-center">
                {sportEmoji(route.sport)}
              </span>

              <Link
                href={`/route/${route.id}`}
                className="flex-1 text-sm font-medium text-gray-900 hover:text-blue-700 transition-colors truncate min-w-0"
              >
                {route.name}
              </Link>

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

              <button
                onClick={() => setConfirmId(route.id)}
                title="Delete route"
                className="shrink-0 text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 ml-1"
                aria-label="Delete route"
              >
                <TrashIcon />
              </button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
    </svg>
  );
}
