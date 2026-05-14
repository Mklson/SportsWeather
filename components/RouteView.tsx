"use client";

import { useState, useCallback, useTransition, useRef } from "react";
import dynamic from "next/dynamic";
import type { Route, SportType, WeatherSegment } from "@/types";
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
    <>
      {/* ── Mobile layout ─────────────────────────────────────────────── */}
      <div className="md:hidden relative overflow-hidden bg-white" style={{ height: "100dvh" }}>
        <div className="absolute inset-0">
          <RouteMap
            route={route}
            segments={segments}
            activeSegmentIndex={activeSegment}
            onSegmentClick={setActiveSegment}
            sport={sport}
          />
        </div>
        <MobileBottomSheet
          route={route}
          sport={sport}
          onSportChange={setSport}
          startTime={startTime}
          onTimeChange={handleTimeChange}
          segments={segments}
          activeSegment={activeSegment}
          onSegmentChange={setActiveSegment}
          isLoading={isLoading}
          error={error ?? null}
          isSkiing={isSkiing}
        />
      </div>

      {/* ── Desktop layout ─────────────────────────────────────────────── */}
      <div className="hidden md:flex flex-row h-screen overflow-hidden bg-white">
        <div className="flex-1 min-h-0">
          <RouteMap
            route={route}
            segments={segments}
            activeSegmentIndex={activeSegment}
            onSegmentClick={setActiveSegment}
            sport={sport}
          />
        </div>
        <aside className="w-80 overflow-y-auto flex flex-col bg-gray-50 border-l border-gray-200 shadow-[-4px_0_16px_rgba(0,0,0,0.06)]">
          <div className="p-4 border-b border-gray-200 bg-white">
            <h1 className="font-bold text-gray-900 truncate text-base">{route.name}</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {route.distanceKm.toFixed(1)} km
              {route.elevationGainM ? ` · ${Math.round(route.elevationGainM)} m stigning` : ""}
            </p>
            <SourceBadge source={route.source} />
          </div>
          <div className="p-3 border-b border-gray-200 bg-white">
            <SportTypeSelector value={sport} onChange={setSport} />
          </div>
          <div className="p-4 border-b border-gray-200 bg-white">
            <TimeSlider value={startTime} onChange={handleTimeChange} />
          </div>
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
    </>
  );
}

// ─── Mobile bottom sheet ──────────────────────────────────────────────────────

type SheetState = "hidden" | "peek" | "expanded";

const HIDDEN_HEIGHT = 32;
const PEEK_HEIGHT   = 210;

interface SheetProps {
  route: Route;
  sport: SportType;
  onSportChange: (s: SportType) => void;
  startTime: Date;
  onTimeChange: (d: Date) => void;
  segments: WeatherSegment[];
  activeSegment: number | null;
  onSegmentChange: (i: number) => void;
  isLoading: boolean;
  error: string | null;
  isSkiing: boolean;
}

function MobileBottomSheet({
  route,
  sport,
  onSportChange,
  startTime,
  onTimeChange,
  segments,
  activeSegment,
  onSegmentChange,
  isLoading,
  error,
  isSkiing,
}: SheetProps) {
  const [state, setState] = useState<SheetState>("peek");
  const touchStartY = useRef(0);
  const didDrag = useRef(false);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    didDrag.current = false;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const dy = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(dy) > 40) {
      didDrag.current = true;
      setState((s) => {
        if (dy > 0) return s === "hidden" ? "peek" : "expanded";
        return s === "expanded" ? "peek" : "hidden";
      });
    }
  };

  const onHandleClick = () => {
    if (!didDrag.current) {
      setState((s) => (s === "hidden" ? "peek" : s === "peek" ? "hidden" : "peek"));
    }
    didDrag.current = false;
  };

  const sheetHeight =
    state === "hidden" ? HIDDEN_HEIGHT :
    state === "peek"   ? PEEK_HEIGHT :
    "72dvh";

  const visible = state !== "hidden";

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-20 bg-white rounded-t-2xl shadow-2xl flex flex-col overflow-hidden"
      style={{
        height: sheetHeight,
        transition: "height 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
      }}
    >
      {/* Drag handle */}
      <div
        className="flex-shrink-0 touch-none select-none cursor-grab active:cursor-grabbing"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onClick={onHandleClick}
      >
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="w-9 h-1 bg-gray-300 rounded-full" />
        </div>
        {visible && (
          <div className="px-4 pb-1.5 flex items-center justify-between">
            <span className="font-semibold text-gray-900 text-sm truncate">{route.name}</span>
            <span className="text-gray-400 text-xs ml-2 shrink-0">
              {route.distanceKm.toFixed(1)} km
              {route.elevationGainM ? ` · ${Math.round(route.elevationGainM)} m` : ""}
            </span>
          </div>
        )}
      </div>

      {/* Time slider — always visible when not hidden */}
      {visible && (
        <div className="flex-shrink-0 px-4 pb-2 border-b border-gray-100">
          <TimeSlider value={startTime} onChange={onTimeChange} />
        </div>
      )}

      {/* Sport selector — always visible when not hidden */}
      {visible && (
        <div className="flex-shrink-0 px-4 py-2.5 border-b border-gray-100">
          <SportTypeSelector value={sport} onChange={onSportChange} />
        </div>
      )}

      {/* Legend — only when expanded */}
      {state === "expanded" && (
        <div className="flex-shrink-0 px-4 py-2 border-b border-gray-100 flex items-center gap-3 text-xs flex-wrap">
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
      )}

      {state === "expanded" && isLoading && (
        <div className="flex-shrink-0 flex items-center justify-center gap-2 p-3 text-sm text-blue-500 animate-pulse">
          Henter værdata…
        </div>
      )}
      {state === "expanded" && error && (
        <div className="mx-4 my-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex-shrink-0">
          {error}
        </div>
      )}

      {/* Segment list — only when expanded */}
      {state === "expanded" && (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <SegmentList
            segments={segments}
            activeIndex={activeSegment}
            sport={sport}
            onActiveChange={onSegmentChange}
          />
        </div>
      )}
    </div>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

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
  return <div className="w-full h-full bg-gray-100 animate-pulse" />;
}
