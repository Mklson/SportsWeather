"use client";

import { useState, useCallback, useTransition } from "react";
import dynamic from "next/dynamic";
import type { Route, SportType } from "@/types";
import { TimeSlider } from "./TimeSlider";
import { SegmentList } from "./route/SegmentList";
import { SportTypeSelector } from "./SportTypeSelector";
import { useWeather } from "@/hooks/useWeather";
import clsx from "clsx";

const RouteMap = dynamic(
  () => import("./map/RouteMap").then((m) => m.RouteMap),
  { ssr: false, loading: () => <MapSkeleton /> }
);

interface Props {
  route: Route;
  initialSport?: SportType;
}

export function RouteView({ route, initialSport = "cycling" }: Props) {
  const [startTime, setStartTime] = useState<Date>(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    return d;
  });
  const [activeSegment, setActiveSegment] = useState<number | null>(null);
  const [sport, setSport] = useState<SportType>(initialSport);
  const [, startTransition] = useTransition();

  const { segments, isLoading, error } = useWeather(route.id, startTime);

  const handleTimeChange = useCallback((date: Date) => {
    startTransition(() => setStartTime(date));
  }, []);

  const isSkiing = sport === "skiing";

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-white">
      {/* ── Map ─────────────────────────────────────────────────────────── */}
      <div className="w-full md:flex-1 shrink-0">
        <RouteMap
          route={route}
          segments={segments}
          activeSegmentIndex={activeSegment}
          onSegmentClick={setActiveSegment}
          sport={sport}
        />
      </div>

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="w-full md:w-80 md:overflow-y-auto flex flex-col bg-gray-50 border-l border-gray-200 shadow-[-4px_0_16px_rgba(0,0,0,0.06)]">

        {/* Route header */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <h1 className="font-bold text-gray-900 truncate text-base">{route.name}</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {route.distanceKm.toFixed(1)} km
            {route.elevationGainM ? ` · ${Math.round(route.elevationGainM)} m stigning` : ""}
          </p>
          <SourceBadge source={route.source} />
        </div>

        {/* Sport type */}
        <div className="p-3 border-b border-gray-200 bg-white">
          <SportTypeSelector value={sport} onChange={setSport} />
        </div>

        {/* Time slider */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <TimeSlider value={startTime} onChange={handleTimeChange} />
        </div>

        {/* Legend */}
        <div className="px-4 py-2.5 border-b border-gray-200 bg-white flex items-center gap-3 text-xs flex-wrap">
          {isSkiing ? (
            <>
              <LegendItem color="#10b981" label="Perfekte forhold" />
              <LegendItem color="#f59e0b" label="Overgang" />
              <LegendItem color="#ef4444" label="Dårlige forhold" />
            </>
          ) : (
            <>
              <LegendItem color="#10b981" label="Medvind" />
              <LegendItem color="#f59e0b" label="Sidevind" />
              <LegendItem color="#ef4444" label="Motvind" />
            </>
          )}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center gap-2 p-4 text-sm text-blue-500 animate-pulse">
            Henter værdata…
          </div>
        )}
        {error && (
          <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        <SegmentList
          segments={segments}
          activeIndex={activeSegment}
          sport={sport}
          onActiveChange={setActiveSegment}
        />
      </aside>
    </div>
  );
}

function SourceBadge({ source }: { source: Route["source"] }) {
  const labels: Record<Route["source"], string> = {
    strava: "Strava", garmin: "Garmin", gpx: "GPX", tcx: "TCX",
  };
  const colors: Record<Route["source"], string> = {
    strava: "bg-orange-100 text-orange-700 border-orange-200",
    garmin: "bg-blue-100 text-blue-700 border-blue-200",
    gpx:    "bg-green-100 text-green-700 border-green-200",
    tcx:    "bg-purple-100 text-purple-700 border-purple-200",
  };
  return (
    <span className={clsx("inline-block mt-1.5 px-2 py-0.5 rounded-full text-xs font-medium border", colors[source])}>
      {labels[source]}
    </span>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-3 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-gray-500">{label}</span>
    </div>
  );
}

function MapSkeleton() {
  return (
    <div className="w-full h-[var(--map-height-mobile)] md:h-[var(--map-height-desktop)] bg-gray-100 animate-pulse" />
  );
}
