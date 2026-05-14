"use client";

import { useState, useCallback, useTransition, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import useSWR from "swr";
import type { Route, SportType, StravaSegment } from "@/types";
import { TimeSlider } from "./TimeSlider";
import { useWeather } from "@/hooks/useWeather";
import clsx from "clsx";

const RouteMap = dynamic(
  () => import("./map/RouteMap").then((m) => m.RouteMap),
  { ssr: false, loading: () => <MapSkeleton /> }
);

interface Props {
  route: Route;
  initialSport?: SportType;
  stravaConnected?: boolean;
}

export function RouteView({ route, initialSport = "cycling", stravaConnected = false }: Props) {
  const [startTime, setStartTime] = useState<Date>(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    return d;
  });
  const [sport] = useState<SportType>(initialSport);
  const [reversed, setReversed] = useState(false);
  const [activeStravaId, setActiveStravaId] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  const reversedCoords = useMemo(
    () => [...route.coordinates].reverse(),
    [route.coordinates]
  );

  const { segments } = useWeather(
    route.id,
    startTime,
    reversed ? reversedCoords : undefined
  );

  const stravaSegKey = stravaConnected
    ? `/api/strava/segments?routeId=${route.id}&sport=${sport}&rev=${reversed}`
    : null;
  const { data: stravaSegData, isLoading: stravaLoading, error: stravaError } = useSWR<{ segments: StravaSegment[] }>(
    stravaSegKey,
    (url: string) => fetch(url).then((r) => r.json()),
    { revalidateOnFocus: false }
  );
  const stravaSegments = stravaSegData?.segments ?? [];

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
            activeSegmentIndex={null}
            onSegmentClick={() => {}}
            sport={sport}
            stravaSegments={stravaSegments}
            activeStravaSegmentId={activeStravaId}
            onStravaSegmentClick={setActiveStravaId}
            reversed={reversed}
          />
        </div>
        <MobileBottomSheet
          route={route}
          isSkiing={isSkiing}
          startTime={startTime}
          onTimeChange={handleTimeChange}
          reversed={reversed}
          onToggleReverse={() => setReversed((v) => !v)}
          stravaConnected={stravaConnected}
          stravaSegments={stravaSegments}
          stravaLoading={stravaLoading}
          stravaError={(stravaError as { error?: string } | null)?.error ?? (stravaError instanceof Error ? stravaError.message : null)}
          activeStravaId={activeStravaId}
          onStravaSegmentClick={setActiveStravaId}
        />
      </div>

      {/* ── Desktop layout ─────────────────────────────────────────────── */}
      <div className="hidden md:flex flex-row h-screen overflow-hidden bg-white">
        <div className="flex-1 min-h-0">
          <RouteMap
            route={route}
            segments={segments}
            activeSegmentIndex={null}
            onSegmentClick={() => {}}
            sport={sport}
            stravaSegments={stravaSegments}
            activeStravaSegmentId={activeStravaId}
            onStravaSegmentClick={setActiveStravaId}
            reversed={reversed}
          />
        </div>
        <aside className="w-80 overflow-y-auto flex flex-col bg-gray-50 border-l border-gray-200 shadow-[-4px_0_16px_rgba(0,0,0,0.06)]">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 bg-white">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h1 className="font-bold text-gray-900 truncate text-base">{route.name}</h1>
                <p className="text-gray-500 text-sm mt-0.5">
                  {route.distanceKm.toFixed(1)} km
                  {route.elevationGainM ? ` · ${Math.round(route.elevationGainM)} m stigning` : ""}
                </p>
                <SourceBadge source={route.source} />
              </div>
              <ReverseButton reversed={reversed} onToggle={() => setReversed((v) => !v)} />
            </div>
          </div>

          {/* Time picker */}
          <div className="p-4 border-b border-gray-200 bg-white">
            <TimeSlider value={startTime} onChange={handleTimeChange} />
          </div>

          {/* Legend */}
          <div className="px-4 py-2.5 border-b border-gray-200 bg-white flex items-center gap-3 text-xs flex-wrap">
            {isSkiing ? (
              <><LegendItem color="#10b981" label="Perfekt" /><LegendItem color="#f59e0b" label="Overgang" /><LegendItem color="#ef4444" label="Dårlig" /></>
            ) : (
              <><LegendItem color="#10b981" label="Medvind" /><LegendItem color="#f59e0b" label="Sidevind" /><LegendItem color="#ef4444" label="Motvind" /></>
            )}
          </div>

          {/* Strava segments */}
          {stravaConnected && (
            <>
              <div className="px-4 py-2 border-b border-gray-200 bg-white">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Strava-segmenter</p>
              </div>
              {stravaLoading && (
                <div className="flex items-center justify-center gap-2 p-4 text-sm text-orange-500 animate-pulse">
                  Henter segmenter…
                </div>
              )}
              {stravaError && (
                <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                  {String(stravaError)}
                </div>
              )}
              {!stravaLoading && (
                <StravaSegmentList segments={stravaSegments} activeId={activeStravaId} onSelect={setActiveStravaId} />
              )}
            </>
          )}
        </aside>
      </div>
    </>
  );
}

// ─── Mobile bottom sheet ──────────────────────────────────────────────────────

type SheetState = "hidden" | "peek" | "expanded";

const HIDDEN_HEIGHT = 32;
const PEEK_HEIGHT   = 170;

interface SheetProps {
  route: Route;
  isSkiing: boolean;
  startTime: Date;
  onTimeChange: (d: Date) => void;
  reversed: boolean;
  onToggleReverse: () => void;
  stravaConnected: boolean;
  stravaSegments: StravaSegment[];
  stravaLoading: boolean;
  stravaError: string | null;
  activeStravaId: number | null;
  onStravaSegmentClick: (id: number) => void;
}

function MobileBottomSheet({
  route,
  isSkiing,
  startTime,
  onTimeChange,
  reversed,
  onToggleReverse,
  stravaConnected,
  stravaSegments,
  stravaLoading,
  stravaError,
  activeStravaId,
  onStravaSegmentClick,
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
          <div className="px-4 pb-1.5 flex items-center justify-between gap-2">
            <span className="font-semibold text-gray-900 text-sm truncate">{route.name}</span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-gray-400 text-xs">
                {route.distanceKm.toFixed(1)} km
                {route.elevationGainM ? ` · ${Math.round(route.elevationGainM)} m` : ""}
              </span>
              <ReverseButton reversed={reversed} onToggle={onToggleReverse} />
            </div>
          </div>
        )}
      </div>

      {/* Time slider */}
      {visible && (
        <div className="flex-shrink-0 px-4 pb-2 border-b border-gray-100">
          <TimeSlider value={startTime} onChange={onTimeChange} />
        </div>
      )}

      {/* Legend */}
      {visible && (
        <div className="flex-shrink-0 px-4 py-2 flex items-center gap-3 text-xs border-b border-gray-100">
          {isSkiing ? (
            <><LegendItem color="#10b981" label="Perfekt" /><LegendItem color="#f59e0b" label="Overgang" /><LegendItem color="#ef4444" label="Dårlig" /></>
          ) : (
            <><LegendItem color="#10b981" label="Medvind" /><LegendItem color="#f59e0b" label="Sidevind" /><LegendItem color="#ef4444" label="Motvind" /></>
          )}
        </div>
      )}

      {/* Strava segments — only when expanded */}
      {state === "expanded" && stravaConnected && (
        <>
          {stravaLoading && (
            <div className="flex-shrink-0 flex items-center justify-center gap-2 p-3 text-sm text-orange-500 animate-pulse">
              Henter Strava-segmenter…
            </div>
          )}
          {stravaError && (
            <div className="mx-4 my-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex-shrink-0">
              {stravaError}
            </div>
          )}
          {!stravaLoading && (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <StravaSegmentList segments={stravaSegments} activeId={activeStravaId} onSelect={onStravaSegmentClick} />
            </div>
          )}
        </>
      )}

      {state === "expanded" && !stravaConnected && (
        <div className="flex items-center justify-center h-24 text-gray-400 text-sm px-6 text-center">
          Koble til Strava fra forsiden for å se segmenter langs ruten
        </div>
      )}
    </div>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function StravaSegmentList({
  segments,
  activeId,
  onSelect,
}: {
  segments: StravaSegment[];
  activeId: number | null;
  onSelect: (id: number) => void;
}) {
  if (!segments.length) {
    return (
      <div className="flex items-center justify-center h-24 text-gray-400 text-sm px-4 text-center">
        Ingen Strava-segmenter funnet langs denne ruten
      </div>
    );
  }
  return (
    <div className="space-y-2 px-3 py-3">
      {segments.map((seg) => (
        <button
          key={seg.id}
          onClick={() => onSelect(seg.id)}
          className={clsx(
            "w-full text-left p-3 rounded-xl border transition-all",
            activeId === seg.id
              ? "border-orange-400 bg-orange-50 ring-1 ring-orange-400"
              : "border-gray-200 bg-white hover:border-orange-300"
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <span className="font-medium text-gray-900 text-sm leading-tight">{seg.name}</span>
            {seg.climbCategory > 0 && (
              <span className="shrink-0 text-xs font-bold text-purple-600 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded">
                {seg.climbCategory === 5 ? "HC" : `Cat ${seg.climbCategory}`}
              </span>
            )}
          </div>
          <div className="mt-1 flex gap-3 text-xs text-gray-500">
            <span>{(seg.distanceM / 1000).toFixed(1)} km</span>
            {seg.avgGrade !== 0 && <span>{seg.avgGrade.toFixed(1)}% snitt</span>}
            {seg.elevDifference > 0 && <span>+{Math.round(seg.elevDifference)} m</span>}
          </div>
        </button>
      ))}
    </div>
  );
}

function ReverseButton({ reversed, onToggle }: { reversed: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      title={reversed ? "Vis original retning" : "Snu ruten"}
      className={clsx(
        "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border transition-colors",
        reversed
          ? "bg-blue-600 text-white border-blue-600"
          : "bg-white text-gray-500 border-gray-200 hover:border-blue-400 hover:text-blue-600"
      )}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 1l4 4-4 4" />
        <path d="M3 11V9a4 4 0 014-4h14" />
        <path d="M7 23l-4-4 4-4" />
        <path d="M21 13v2a4 4 0 01-4 4H3" />
      </svg>
      {reversed ? "Snudd" : "Snu"}
    </button>
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
  return <div className="w-full h-full bg-gray-100 animate-pulse" />;
}
