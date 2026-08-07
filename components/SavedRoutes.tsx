"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { DbRouteSummary, SportType } from "@/types";
import { format } from "date-fns";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { interpolate, getDictionary } from "@/lib/i18n/dictionary";

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
  const { t } = useLanguage();
  // Groups mirror RouteImporter's UPLOAD_SPORTS — keep labels/emoji in sync with that.
  const SPORT_GROUPS: { id: SportType; label: string; emoji: string }[] = [
    { id: "cycling", label: t.sport.cycling, emoji: "🚴" },
    { id: "running", label: t.sport.hikingRunning, emoji: "🥾" },
    { id: "skiing", label: t.sport.crossCountry, emoji: "⛷️" },
  ];
  const [localRoutes, setLocalRoutes] = useState(routes);
  // `routes` is a fresh array from the server every time the dashboard refreshes
  // (e.g. after adding one) — without this, useState's initial value would go stale
  // and newly added routes would never appear despite the save succeeding.
  useEffect(() => setLocalRoutes(routes), [routes]);
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
          {t.saved.empty}
        </p>
      </div>
    );
  }

  const groups: { id: string; label: string; emoji: string; routes: DbRouteSummary[] }[] =
    SPORT_GROUPS.map((g) => ({ ...g, routes: localRoutes.filter((r) => r.sport === g.id) })).filter(
      (g) => g.routes.length > 0
    );

  const other = localRoutes.filter((r) => !SPORT_GROUPS.some((g) => g.id === r.sport));
  if (other.length > 0) groups.push({ id: "other", label: t.saved.other, emoji: "📍", routes: other });

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <div key={group.id}>
          <h3 className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 px-1">
            <span className="text-sm normal-case">{group.emoji}</span>
            {group.label}
            <span className="font-normal normal-case text-gray-300">{group.routes.length}</span>
          </h3>
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden divide-y divide-gray-100">
            {group.routes.map((route) => (
              <RouteRow
                key={route.id}
                route={route}
                emoji={group.emoji}
                t={t}
                confirming={confirmId === route.id}
                deleting={deletingId === route.id}
                onConfirm={() => setConfirmId(route.id)}
                onCancel={() => setConfirmId(null)}
                onDelete={() => handleDelete(route.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function RouteRow({
  route,
  emoji,
  t,
  confirming,
  deleting,
  onConfirm,
  onCancel,
  onDelete,
}: {
  route: DbRouteSummary;
  emoji: string;
  t: ReturnType<typeof getDictionary>;
  confirming: boolean;
  deleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="relative flex items-center gap-2.5 px-3 py-2 group">
      {confirming ? (
        /* Inline confirm row */
        <>
          <span className="flex-1 text-sm text-gray-500">{interpolate(t.saved.deleteConfirm, { name: route.name })}</span>
          <button
            onClick={onDelete}
            disabled={deleting}
            className="relative z-10 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
          >
            {t.saved.delete}
          </button>
          <button
            onClick={onCancel}
            className="relative z-10 text-xs font-medium text-gray-500 hover:text-gray-800 px-2 py-1 transition-colors"
          >
            {t.saved.cancel}
          </button>
        </>
      ) : (
        /* Normal row — Link covers the whole row so anywhere is tappable on mobile */
        <>
          <a
            href={`/route/${route.id}`}
            className="absolute inset-0"
            style={{ touchAction: "manipulation" }}
            aria-label={route.name}
          />
          <span className="relative text-base shrink-0 w-6 text-center pointer-events-none">
            {emoji}
          </span>

          <span className="relative flex-1 text-sm font-medium text-gray-900 truncate min-w-0 pointer-events-none">
            {route.name}
          </span>

          <div className="relative flex items-center gap-2.5 text-xs text-gray-400 shrink-0 pointer-events-none">
            {formatDist(route.distance_km) && <span>{formatDist(route.distance_km)}</span>}
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
            onClick={onConfirm}
            title={t.saved.deleteRouteTitle}
            className="relative z-10 shrink-0 text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 pointer-events-none group-hover:pointer-events-auto focus:pointer-events-auto ml-1"
            aria-label={t.saved.deleteRouteTitle}
          >
            <TrashIcon />
          </button>
        </>
      )}
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
