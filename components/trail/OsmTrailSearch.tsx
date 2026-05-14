"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import type { OsmTrail, UploadResponse } from "@/types";
import clsx from "clsx";

export function OsmTrailSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [trails, setTrails] = useState<OsmTrail[]>([]);
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setTrails([]); return; }
    setSearching(true);
    setError(null);
    try {
      const res = await fetch(`/api/trails/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setTrails(data.trails ?? []);
      if ((data.trails ?? []).length === 0) setError("Ingen merkede løyper funnet her. Prøv et stedsnavn, f.eks. «Nordmarka», «Sjusjøen» eller «Bymarka».");
    } catch {
      setError("Søket feilet. Sjekk nettverkstilkoblingen.");
    } finally {
      setSearching(false);
    }
  }, []);

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const q = e.target.value;
      setQuery(q);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => search(q), 600);
    },
    [search]
  );

  const importTrail = useCallback(
    async (trail: OsmTrail) => {
      setImporting(trail.id);
      try {
        const res = await fetch("/api/trails/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(trail),
        });
        if (!res.ok) throw new Error("Import feilet");
        const { route } = (await res.json()) as UploadResponse;
        router.push(`/route/${route.id}`);
      } catch {
        setError("Kunne ikke importere løypen.");
        setImporting(null);
      }
    },
    [router]
  );

  return (
    <div className="space-y-3">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInput}
          placeholder="Søk etter skiløype, f.eks. «Nordmarka»..."
          className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3
                     text-white placeholder-gray-500 focus:outline-none
                     focus:ring-2 focus:ring-blue-500 pr-10"
        />
        {searching && (
          <div className="absolute right-3 top-3.5 w-4 h-4 border-2 border-blue-400
                          border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {error && <p className="text-sm text-gray-400">{error}</p>}

      {trails.length > 0 && (
        <ul className="space-y-2 max-h-64 overflow-y-auto">
          {trails.map((trail) => (
            <li key={trail.id}>
              <button
                onClick={() => importTrail(trail)}
                disabled={importing !== null}
                className={clsx(
                  "w-full text-left p-3 rounded-xl bg-gray-800 hover:bg-gray-700",
                  "border border-gray-700 hover:border-gray-500 transition-all",
                  "flex items-center justify-between gap-2",
                  importing === trail.id && "opacity-60 animate-pulse"
                )}
              >
                <div>
                  <p className="font-medium text-white text-sm">{trail.name}</p>
                  <p className="text-xs text-gray-400">
                    {trail.distanceKm.toFixed(1)} km
                    {trail.difficulty ? ` · ${trail.difficulty}` : ""}
                    {trail.area ? ` · ${trail.area}` : ""}
                  </p>
                </div>
                <span className="text-gray-500 text-xs shrink-0">
                  {importing === trail.id ? "Laster…" : "Velg →"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
