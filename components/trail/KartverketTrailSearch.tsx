"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { KartverketTrail, SportType, UploadResponse } from "@/types";
import type { Bbox } from "@/lib/kartverket";
import { Modal } from "@/components/Modal";
import clsx from "clsx";

const KartverketAreaMap = dynamic(
  () => import("./KartverketAreaMap").then((m) => m.KartverketAreaMap),
  { ssr: false, loading: () => <div className="w-full h-64 rounded-xl bg-gray-100 animate-pulse" /> }
);

const SPORT_EMOJI: Record<SportType, string> = {
  running: "🥾",
  cycling: "🚴",
  skiing: "⛷️",
};

type Mode = "name" | "map";

interface Props {
  onSuccess?: (routeId: string) => void;
}

export function KartverketTrailSearch({ onSuccess }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("name");
  const [query, setQuery] = useState("");
  const [trails, setTrails] = useState<KartverketTrail[]>([]);
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(async (url: string, emptyMessage: string) => {
    setSearching(true);
    setError(null);
    try {
      const res = await fetch(url);
      const data = await res.json();
      setTrails(data.trails ?? []);
      if ((data.trails ?? []).length === 0) setError(emptyMessage);
    } catch {
      setError("Search failed. Check your network connection.");
    } finally {
      setSearching(false);
    }
  }, []);

  const searchByName = useCallback(
    (q: string) => {
      if (q.length < 2) { setTrails([]); setError(null); return; }
      runSearch(
        `/api/trails/kartverket/search?q=${encodeURIComponent(q)}`,
        "No trails found there. Try a place name, e.g. «Nordmarka» or «Sognefjellet»."
      );
    },
    [runSearch]
  );

  const searchByBbox = useCallback(
    (bbox: Bbox) => {
      runSearch(
        `/api/trails/kartverket/search?bbox=${bbox.south},${bbox.west},${bbox.north},${bbox.east}`,
        "No named trails found in this area. Try zooming out slightly or panning elsewhere."
      );
    },
    [runSearch]
  );

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const q = e.target.value;
      setQuery(q);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => searchByName(q), 600);
    },
    [searchByName]
  );

  const importTrail = useCallback(
    async (trail: KartverketTrail) => {
      setImporting(trail.id);
      setError(null);
      try {
        const res = await fetch("/api/trails/kartverket/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(trail),
        });
        if (!res.ok) throw new Error("Import failed");
        const { route } = (await res.json()) as UploadResponse;
        if (onSuccess) onSuccess(route.id);
        else router.push(`/route/${route.id}`);
      } catch {
        setError("Could not import that trail.");
        setImporting(null);
      }
    },
    [router, onSuccess]
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-xl text-xs font-medium transition-colors shadow-sm text-center
                   bg-blue-900 hover:bg-blue-800 text-white"
      >
        <span className="text-lg leading-none">🗺️</span>
        Norway trails
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="🗺️ Norway's national trail database">
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Hiking, cross-country ski, and cycling routes are imported straight in, no file needed.
          </p>

          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 text-sm border border-gray-200">
            {([
              { id: "name", label: "🔍 By name" },
              { id: "map", label: "🗺️ By map" },
            ] as { id: Mode; label: string }[]).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={clsx(
                  "flex-1 py-2 px-2 rounded-lg font-medium transition-all text-xs sm:text-sm",
                  mode === m.id
                    ? "bg-white text-blue-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                {m.label}
              </button>
            ))}
          </div>

          {mode === "name" ? (
            <input
              type="text"
              value={query}
              onChange={handleInput}
              autoFocus
              placeholder="Search by place, e.g. «Nordmarka»…"
              className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-sm
                         text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          ) : (
            <KartverketAreaMap onSearch={searchByBbox} searching={searching} />
          )}

          {searching && <p className="text-xs text-gray-400 text-center">Searching…</p>}
          {error && <p className="text-xs text-gray-400 text-center">{error}</p>}

          {trails.length > 0 && (
            <ul className="space-y-1.5 max-h-72 overflow-y-auto">
              {trails.map((trail) => (
                <li key={trail.id}>
                  <button
                    onClick={() => importTrail(trail)}
                    disabled={importing !== null}
                    className={clsx(
                      "w-full text-left p-2.5 rounded-xl bg-white hover:bg-gray-50",
                      "border border-gray-200 hover:border-blue-300 transition-all",
                      "flex items-center justify-between gap-2",
                      importing === trail.id && "opacity-60 animate-pulse"
                    )}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="text-base shrink-0">{SPORT_EMOJI[trail.sport]}</span>
                      <span className="min-w-0">
                        <span className="block font-medium text-gray-800 text-sm truncate">{trail.name}</span>
                        <span className="block text-xs text-gray-400">{trail.distanceKm.toFixed(1)} km</span>
                      </span>
                    </span>
                    <span className="text-gray-400 text-xs shrink-0">
                      {importing === trail.id ? "Loading…" : "Select →"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>
    </>
  );
}
