"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import clsx from "clsx";
import { Modal } from "@/components/Modal";
import { SPORT_CONFIGS } from "@/types";
import type { Coordinate, SportType, SurfacePreference, UploadResponse } from "@/types";

const RoutePreviewMap = dynamic(
  () => import("./RoutePreviewMap").then((m) => m.RoutePreviewMap),
  { ssr: false, loading: () => <div className="w-full h-64 rounded-xl bg-gray-100 animate-pulse" /> }
);

interface Candidate {
  id: string;
  name: string;
  distanceKm: number;
  elevationGainM?: number;
  coordinates: Coordinate[];
}

interface Props {
  onSuccess?: (routeId: string) => void;
}

export function GenerateRouteForm({ onSuccess }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState<Coordinate | null>(null);
  const [distanceKm, setDistanceKm] = useState(8);
  const [sport, setSport] = useState<SportType>("running");
  const [surfacePreference, setSurfacePreference] = useState<SurfacePreference>("trail");
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    if (!start) {
      setError("Click the map to set a start point first.");
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/routes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start, distanceKm, sport, surfacePreference }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not generate a route.");
      const { route } = data as UploadResponse;
      setCandidate({
        id: route.id,
        name: route.name,
        distanceKm: route.distanceKm,
        elevationGainM: route.elevationGainM,
        coordinates: route.coordinates,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate a route.");
      setCandidate(null);
    } finally {
      setGenerating(false);
    }
  }, [start, distanceKm, sport, surfacePreference]);

  const viewRoute = useCallback(() => {
    if (!candidate) return;
    if (onSuccess) onSuccess(candidate.id);
    else router.push(`/route/${candidate.id}`);
  }, [candidate, onSuccess, router]);

  const reset = useCallback(() => {
    setStart(null);
    setCandidate(null);
    setError(null);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-xl text-xs font-medium transition-colors shadow-sm text-center
                   bg-blue-900 hover:bg-blue-800 text-white"
      >
        <span className="text-lg leading-none">✨</span>
        Generate route
      </button>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          reset();
        }}
        title="✨ Generate a round-trip route"
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Pick a start point and a distance — a loop is generated from OpenStreetMap trail data.
          </p>

          <RoutePreviewMap
            start={start}
            onStartChange={(c) => {
              setStart(c);
              setCandidate(null);
            }}
            previewCoordinates={candidate?.coordinates}
          />

          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-gray-500 space-y-1">
              Distance (km)
              <input
                type="number"
                min={1}
                max={60}
                step={0.5}
                value={distanceKm}
                onChange={(e) => setDistanceKm(Number(e.target.value))}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-sm
                           text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </label>

            <label className="text-xs text-gray-500 space-y-1">
              Sport
              <select
                value={sport}
                onChange={(e) => setSport(e.target.value as SportType)}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-sm
                           text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {SPORT_CONFIGS.map((s) => (
                  <option key={s.type} value={s.type}>
                    {s.emoji} {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 text-sm border border-gray-200">
            {(
              [
                { id: "trail", label: "🥾 Favor trails" },
                { id: "road", label: "🛣️ Favor roads" },
              ] as { id: SurfacePreference; label: string }[]
            ).map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setSurfacePreference(o.id)}
                className={clsx(
                  "flex-1 py-2 px-2 rounded-lg font-medium transition-all text-xs sm:text-sm",
                  surfacePreference === o.id
                    ? "bg-white text-blue-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                {o.label}
              </button>
            ))}
          </div>

          {error && <p className="text-xs text-gray-400 text-center">{error}</p>}

          {candidate && (
            <p className="text-xs text-gray-500 text-center">
              {candidate.distanceKm.toFixed(1)} km
              {candidate.elevationGainM ? ` · ${Math.round(candidate.elevationGainM)} m elevation` : ""}
            </p>
          )}

          {!candidate ? (
            <button
              type="button"
              onClick={generate}
              disabled={generating || !start}
              className="w-full py-2 rounded-xl text-sm font-medium transition-colors
                         bg-blue-900 hover:bg-blue-800 text-white disabled:bg-gray-200 disabled:text-gray-400"
            >
              {generating ? "Generating…" : "Generate"}
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={generate}
                disabled={generating}
                className="py-2 rounded-xl text-sm font-medium transition-colors
                           bg-gray-100 hover:bg-gray-200 text-gray-700"
              >
                {generating ? "Generating…" : "Regenerate"}
              </button>
              <button
                type="button"
                onClick={viewRoute}
                className="py-2 rounded-xl text-sm font-medium transition-colors
                           bg-blue-900 hover:bg-blue-800 text-white"
              >
                View route →
              </button>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
