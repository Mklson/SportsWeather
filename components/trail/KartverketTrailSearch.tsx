"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Image from "next/image";
import type { KartverketTrail, SportType, UploadResponse } from "@/types";
import type { Bbox } from "@/lib/kartverket";
import { Modal } from "@/components/Modal";
import clsx from "clsx";

const KartverketAreaMap = dynamic(
  () => import("./KartverketAreaMap").then((m) => m.KartverketAreaMap),
  { ssr: false, loading: () => <div className="w-full h-64 rounded-xl bg-gray-100 animate-pulse" /> }
);

// Kartverket's own self-hosted logo (icon + "Kartverket" wordmark), from their site header —
// same self-hosted-asset pattern as the other guides' logos.
const KARTVERKET_LOGO_URL = "https://www.kartverket.no/public/images/logo/kartverket-logo-150px.svg";

const SPORT_EMOJI: Record<SportType, string> = {
  running: "🥾",
  cycling: "🚴",
  skiing: "⛷️",
};

const SPORT_LABEL: Record<SportType, string> = {
  running: "Hike",
  cycling: "Bike",
  skiing: "Cross country",
};

const ALL_SPORTS: SportType[] = ["running", "cycling", "skiing"];

type Mode = "name" | "map";

interface Props {
  onSuccess?: (routeId: string) => void;
}

export function KartverketTrailSearch({ onSuccess }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<Mode>("name");
  const [query, setQuery] = useState("");
  const [lastBbox, setLastBbox] = useState<Bbox | null>(null);
  const [selectedSports, setSelectedSports] = useState<Set<SportType>>(new Set(ALL_SPORTS));
  const [trails, setTrails] = useState<KartverketTrail[]>([]);
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const runSearch = useCallback(async (url: string, emptyMessage: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setSearching(true);
    setError(null);
    try {
      const res = await fetch(url, { signal: controller.signal });
      const data = await res.json();
      setTrails(data.trails ?? []);
      if ((data.trails ?? []).length === 0) setError(emptyMessage);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError("Search failed. Check your network connection.");
    } finally {
      if (abortRef.current === controller) {
        setSearching(false);
        abortRef.current = null;
      }
    }
  }, []);

  const cancelSearch = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const sportsParam =
    selectedSports.size < ALL_SPORTS.length ? `&sports=${Array.from(selectedSports).join(",")}` : "";

  const searchByName = useCallback(
    (q: string) => {
      if (q.length < 2) { setTrails([]); setError(null); return; }
      runSearch(
        `/api/trails/kartverket/search?q=${encodeURIComponent(q)}${sportsParam}`,
        "No trails found there. Try a place name, e.g. «Nordmarka» or «Sognefjellet»."
      );
    },
    [runSearch, sportsParam]
  );

  const searchByBbox = useCallback(
    (bbox: Bbox) => {
      setLastBbox(bbox);
      runSearch(
        `/api/trails/kartverket/search?bbox=${bbox.south},${bbox.west},${bbox.north},${bbox.east}${sportsParam}`,
        "No named trails found in this area. Try zooming out slightly or panning elsewhere."
      );
    },
    [runSearch, sportsParam]
  );

  // Re-run whichever search is active when the sport filter changes, so
  // toggling a chip narrows results immediately instead of needing a new
  // query/pan to take effect.
  const firstRunRef = useRef(true);
  useEffect(() => {
    if (firstRunRef.current) { firstRunRef.current = false; return; }
    if (mode === "name" && query.length >= 2) searchByName(query);
    else if (mode === "map" && lastBbox) searchByBbox(lastBbox);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSports]);

  const toggleSport = useCallback((sport: SportType) => {
    setSelectedSports((prev) => {
      if (prev.size === 1 && prev.has(sport)) return prev; // keep at least one selected
      const next = new Set(prev);
      if (next.has(sport)) next.delete(sport);
      else next.add(sport);
      return next;
    });
  }, []);

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
        className="relative block w-full h-full rounded-xl overflow-hidden shadow-sm bg-white transition-transform hover:scale-[1.03]"
        aria-label="Norway trails (Kartverket)"
      >
        {/* object-contain (not cover, unlike the other guide logos) — this is an
            icon+wordmark lockup, cropping it to fill the box would cut the text off. */}
        <Image src={KARTVERKET_LOGO_URL} alt="" fill sizes="80px" className="object-contain p-1.5" unoptimized />
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="🗺️ Norway's national trail database"
        widthClassName={expanded ? "max-w-4xl" : "max-w-md"}
      >
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
                    ? "bg-white text-brand-navy shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {ALL_SPORTS.map((sport) => (
              <button
                key={sport}
                type="button"
                onClick={() => toggleSport(sport)}
                className={clsx(
                  "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                  selectedSports.has(sport)
                    ? "bg-brand-green-soft border-brand-green-border text-brand-green-dark"
                    : "bg-white border-gray-200 text-gray-400 hover:border-gray-300"
                )}
              >
                <span>{SPORT_EMOJI[sport]}</span>
                {SPORT_LABEL[sport]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {mode === "name" ? (
              <input
                type="text"
                value={query}
                onChange={handleInput}
                autoFocus
                placeholder="Search by place, e.g. «Nordmarka»…"
                className="flex-1 bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-sm
                           text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-navy"
              />
            ) : (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                title={expanded ? "Collapse map" : "Expand map"}
                className="shrink-0 text-xs font-medium text-gray-500 hover:text-gray-800 px-2.5 py-2 rounded-xl border border-gray-200 transition-colors"
              >
                {expanded ? "⤡ Collapse" : "⤢ Expand"}
              </button>
            )}
          </div>

          {mode === "map" && (
            <KartverketAreaMap onSearch={searchByBbox} searching={searching} expanded={expanded} trails={trails} />
          )}

          {searching && (
            <div className="flex items-center justify-center gap-2">
              <p className="text-xs text-gray-400">Searching…</p>
              <button
                type="button"
                onClick={cancelSearch}
                className="text-xs font-medium text-gray-500 hover:text-gray-800 underline"
              >
                Cancel
              </button>
            </div>
          )}
          {!searching && error && <p className="text-xs text-gray-400 text-center">{error}</p>}

          {trails.length > 0 && (
            <ul className={clsx("space-y-1.5 overflow-y-auto", expanded ? "max-h-96" : "max-h-72")}>
              {trails.map((trail) => (
                <li key={trail.id}>
                  <button
                    onClick={() => importTrail(trail)}
                    disabled={importing !== null}
                    className={clsx(
                      "w-full text-left p-2.5 rounded-xl bg-white hover:bg-gray-50",
                      "border border-gray-200 hover:border-brand-green-border transition-all",
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
