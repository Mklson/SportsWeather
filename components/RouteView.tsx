"use client";

import { useState, useCallback, useTransition, useMemo } from "react";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import Link from "next/link";
import dynamic from "next/dynamic";
import useSWR from "swr";
import type { Route, SportType, StravaSegment, WeatherSegment } from "@/types";
import { TimeSlider } from "./TimeSlider";
import { SpeedSlider } from "./SpeedSlider";
import { useWeather } from "@/hooks/useWeather";
import { DEFAULT_SPEED_KMH } from "@/lib/route-sampler";
import clsx from "clsx";

const RouteMap = dynamic(
  () => import("./map/RouteMap").then((m) => m.RouteMap),
  { ssr: false, loading: () => <MapSkeleton /> }
);

interface Props {
  route: Route;
  initialSport?: SportType;
  stravaConnected?: boolean;
  backHref?: string;
}

export function RouteView({ route, initialSport = "cycling", stravaConnected = false, backHref = "/" }: Props) {
  const [startTime, setStartTime] = useState<Date>(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    return d;
  });
  const [sport] = useState<SportType>(initialSport);
  const [reversed, setReversed] = useState(false);
  const [activeStravaId, setActiveStravaId] = useState<number | null>(null);
  const handleStravaSegmentClick = useCallback((id: number) => {
    setActiveStravaId((prev) => (prev === id ? null : id));
  }, []);
  const [speedKmh, setSpeedKmh] = useState(() => DEFAULT_SPEED_KMH[initialSport]);
  const [mapBounds, setMapBounds] = useState<{ west: number; south: number; east: number; north: number } | null>(null);
  const [cleared, setCleared] = useState(false);
  const [, startTransition] = useTransition();

  const resetMap = useCallback(() => setCleared(true), []);

  const handleBoundsChange = useCallback((b: { west: number; south: number; east: number; north: number }) => {
    setMapBounds(b);
  }, []);

  const reversedCoords = useMemo(
    () => [...route.coordinates].reverse(),
    [route.coordinates]
  );

  const { segments } = useWeather(
    route.id,
    startTime,
    reversed ? reversedCoords : undefined,
    speedKmh,
    sport
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
    setCleared(false);
    startTransition(() => setStartTime(date));
  }, []);

  const handleSpeedChange = useCallback((s: number) => {
    setCleared(false);
    startTransition(() => setSpeedKmh(s));
  }, []);

  const handleToggleReverse = useCallback(() => {
    setCleared(false);
    setReversed((v) => !v);
  }, []);


  const visibleStravaSegments = mapBounds
    ? stravaSegments.filter((seg) =>
        seg.coordinates.some(
          (c) =>
            c.lat >= mapBounds.south && c.lat <= mapBounds.north &&
            c.lon >= mapBounds.west  && c.lon <= mapBounds.east
        )
      )
    : stravaSegments;

  return (
    <>
      {/* ── Mobile layout ─────────────────────────────────────────────── */}
      <div className="md:hidden relative overflow-hidden bg-white" style={{ height: "100dvh" }}>
        {/* Back nav — floats above map */}
        <div className="absolute top-2 right-2 z-20 flex gap-1.5">
          <Link href={backHref} className="flex items-center gap-1 bg-white/90 backdrop-blur-sm text-gray-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow border border-gray-200 hover:bg-white transition-colors">
            ← {backHref === "/dashboard" ? "Dashboard" : "Home"}
          </Link>
          {stravaConnected && (
            <Link href="/strava/activities" prefetch={false} className="flex items-center gap-1 bg-white/90 backdrop-blur-sm text-orange-600 text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow border border-orange-200 hover:bg-white transition-colors">
              ← Strava
            </Link>
          )}
          <button
            onClick={resetMap}
            title="Clear map"
            className="flex items-center gap-1 bg-white/90 backdrop-blur-sm text-gray-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow border border-gray-200 hover:bg-white transition-colors"
          >
            <ResetIcon /> Clear
          </button>
        </div>
        <div className="absolute inset-0">
          <RouteMap
            key={route.id}
            route={route}
            segments={cleared ? [] : segments}
            showRoute={!cleared}
            activeSegmentIndex={null}
            onSegmentClick={() => {}}
            sport={sport}
            stravaSegments={cleared ? [] : stravaSegments}
            activeStravaSegmentId={activeStravaId}
            onStravaSegmentClick={handleStravaSegmentClick}
            onBoundsChange={handleBoundsChange}
            reversed={reversed}
          />
        </div>
        <MobileBottomSheet
          route={route}
          sport={sport}
          startTime={startTime}
          onTimeChange={handleTimeChange}
          speedKmh={speedKmh}
          onSpeedChange={handleSpeedChange}
          reversed={reversed}
          onToggleReverse={handleToggleReverse}
          stravaConnected={stravaConnected}
          stravaSegments={visibleStravaSegments}
          weatherSegments={segments}
          stravaLoading={stravaLoading}
          stravaError={(stravaError as { error?: string } | null)?.error ?? (stravaError instanceof Error ? stravaError.message : null)}
          activeStravaId={activeStravaId}
          onStravaSegmentClick={handleStravaSegmentClick}
        />
      </div>

      {/* ── Desktop layout ─────────────────────────────────────────────── */}
      <div className="hidden md:flex flex-row h-screen overflow-hidden bg-white">
        <div className="flex-1 min-h-0">
          <RouteMap
            key={route.id}
            route={route}
            segments={cleared ? [] : segments}
            showRoute={!cleared}
            activeSegmentIndex={null}
            onSegmentClick={() => {}}
            sport={sport}
            stravaSegments={cleared ? [] : stravaSegments}
            activeStravaSegmentId={activeStravaId}
            onStravaSegmentClick={handleStravaSegmentClick}
            onBoundsChange={handleBoundsChange}
            reversed={reversed}
          />
        </div>
        <aside className="w-80 overflow-y-auto flex flex-col bg-gray-50 border-l border-gray-200 shadow-[-4px_0_16px_rgba(0,0,0,0.06)]">
          {/* Back navigation */}
          <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-gray-200 bg-white">
            <div className="flex items-center gap-2">
              <Link href={backHref} className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors">
                ← {backHref === "/dashboard" ? "Dashboard" : "Home"}
              </Link>
              {stravaConnected && (
                <>
                  <span className="text-gray-300">|</span>
                  <Link href="/strava/activities" prefetch={false} className="flex items-center gap-1 text-xs font-medium text-orange-500 hover:text-orange-700 transition-colors">
                    ← Strava
                  </Link>
                </>
              )}
            </div>
            <button
              onClick={resetMap}
              title="Clear map"
              className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-gray-700 transition-colors"
            >
              <ResetIcon /> Reset map
            </button>
          </div>
          {/* Header */}
          <div className="p-4 border-b border-gray-200 bg-white">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h1 className="font-bold text-gray-900 truncate text-base">{route.name}</h1>
                <p className="text-gray-500 text-sm mt-0.5">
                  {route.distanceKm.toFixed(1)} km
                  {route.elevationGainM ? ` · ${Math.round(route.elevationGainM)} m elevation` : ""}
                </p>
                <SourceBadge source={route.source} />
              </div>
              <ReverseButton reversed={reversed} onToggle={handleToggleReverse} />
            </div>
          </div>

          {/* Time + speed */}
          <div className="p-4 border-b border-gray-200 bg-white space-y-4">
            <TimeSlider value={startTime} onChange={handleTimeChange} />
            <SpeedSlider
              sport={sport}
              speedKmh={speedKmh}
              onChange={handleSpeedChange}
              coords={route.coordinates}
            />
          </div>

          {/* Legend */}
          <div className="px-4 py-2.5 border-b border-gray-200 bg-white flex items-center gap-3 text-xs flex-wrap">
            <LegendItem color="#10b981" label="Tailwind" />
            <LegendItem color="#f59e0b" label="Crosswind" />
            <LegendItem color="#ef4444" label="Headwind" />
          </div>

          {/* Strava segments */}
          {stravaConnected && (
            <>
              <div className="px-4 py-2 border-b border-gray-200 bg-white">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Strava segments</p>
              </div>
              {stravaLoading && (
                <div className="flex items-center justify-center gap-2 p-4 text-sm text-orange-500 animate-pulse">
                  Loading segments…
                </div>
              )}
              {stravaError && (
                <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                  {String(stravaError)}
                </div>
              )}
              {!stravaLoading && (
                <StravaSegmentList segments={visibleStravaSegments} weatherSegments={segments} activeId={activeStravaId} onSelect={handleStravaSegmentClick} />
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

const HIDDEN_HEIGHT = 52;
const PEEK_HEIGHT   = 210;

interface SheetProps {
  route: Route;
  sport: SportType;
  startTime: Date;
  onTimeChange: (d: Date) => void;
  speedKmh: number;
  onSpeedChange: (s: number) => void;
  reversed: boolean;
  onToggleReverse: () => void;
  stravaConnected: boolean;
  stravaSegments: StravaSegment[];
  weatherSegments: WeatherSegment[];
  stravaLoading: boolean;
  stravaError: string | null;
  activeStravaId: number | null;
  onStravaSegmentClick: (id: number) => void;
}

function MobileBottomSheet({
  route,
  sport,
  startTime,
  onTimeChange,
  speedKmh,
  onSpeedChange,
  reversed,
  onToggleReverse,
  stravaConnected,
  stravaSegments,
  weatherSegments,
  stravaLoading,
  stravaError,
  activeStravaId,
  onStravaSegmentClick,
}: SheetProps) {
  const [state, setState] = useState<SheetState>("peek");
  const [controlsOpen, setControlsOpen] = useState(true);

  const sheetHeight =
    state === "hidden" ? HIDDEN_HEIGHT :
    state === "peek"   ? PEEK_HEIGHT :
    "72dvh";

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-20 bg-white rounded-t-2xl shadow-2xl flex flex-col overflow-hidden"
      style={{ height: sheetHeight, transition: "height 0.3s cubic-bezier(0.32, 0.72, 0, 1)" }}
    >
      {/* Header — always visible */}
      <div className="flex-shrink-0 flex items-center justify-between gap-2 px-4 py-2.5 border-b border-gray-100">
        <div className="min-w-0 flex-1">
          <span className="font-semibold text-gray-900 text-sm truncate block">{route.name}</span>
          {state !== "hidden" && (
            <span className="text-gray-400 text-xs">
              {route.distanceKm.toFixed(1)} km
              {route.elevationGainM ? ` · ${Math.round(route.elevationGainM)} m` : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {state !== "hidden" && <ReverseButton reversed={reversed} onToggle={onToggleReverse} />}
          {/* Collapse: expanded→peek or peek→hidden */}
          {state !== "hidden" && (
            <button
              onClick={() => setState((s) => s === "expanded" ? "peek" : "hidden")}
              className="p-1.5 rounded-lg bg-gray-100 active:bg-gray-200 transition-colors text-gray-600"
              aria-label="Collapse"
            >
              <ChevronDownIcon />
            </button>
          )}
          {/* Expand: hidden→peek or peek→expanded */}
          {state !== "expanded" && (
            <button
              onClick={() => setState((s) => s === "hidden" ? "peek" : "expanded")}
              className="p-1.5 rounded-lg bg-gray-100 active:bg-gray-200 transition-colors text-gray-600"
              aria-label="Show more"
            >
              <ChevronUpIcon />
            </button>
          )}
        </div>
      </div>

      {/* Time + speed (collapsible) */}
      {state !== "hidden" && (
        <div className="flex-shrink-0 border-b border-gray-100">
          <button
            onClick={() => setControlsOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2 text-xs text-gray-500 hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            <span>
              {format(startTime, "EEE d MMM · HH:mm", { locale: enUS })}
              {" · "}{speedKmh} km/h
            </span>
            {controlsOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
          </button>
          {controlsOpen && (
            <div className="px-4 pb-3 space-y-3">
              <TimeSlider value={startTime} onChange={onTimeChange} />
              <SpeedSlider
                sport={sport}
                speedKmh={speedKmh}
                onChange={onSpeedChange}
                coords={route.coordinates}
              />
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      {state !== "hidden" && (
        <div className="flex-shrink-0 px-4 py-2 flex items-center gap-3 text-xs border-b border-gray-100">
          <LegendItem color="#10b981" label="Tailwind" />
          <LegendItem color="#f59e0b" label="Crosswind" />
          <LegendItem color="#ef4444" label="Headwind" />
        </div>
      )}

      {/* Strava segments — only when expanded */}
      {state === "expanded" && stravaConnected && (
        <>
          {stravaLoading && (
            <div className="flex-shrink-0 flex items-center justify-center gap-2 p-3 text-sm text-orange-500 animate-pulse">
              Loading Strava segments…
            </div>
          )}
          {stravaError && (
            <div className="mx-4 my-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex-shrink-0">
              {stravaError}
            </div>
          )}
          {!stravaLoading && (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <StravaSegmentList segments={stravaSegments} weatherSegments={weatherSegments} activeId={activeStravaId} onSelect={onStravaSegmentClick} />
            </div>
          )}
        </>
      )}

      {state === "expanded" && !stravaConnected && (
        <div className="flex items-center justify-center h-24 text-gray-400 text-sm px-6 text-center">
          Connect to Strava from your dashboard to see segments along the route
        </div>
      )}
    </div>
  );
}

function ChevronUpIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 .49-3.5" />
    </svg>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function nearestWeatherSegment(
  latLng: [number, number],
  weatherSegments: WeatherSegment[]
): WeatherSegment | null {
  if (!weatherSegments.length) return null;
  let nearest = weatherSegments[0];
  let minDist = Infinity;
  for (const ws of weatherSegments) {
    const dlat = latLng[0] - ws.coordinate.lat;
    const dlon = latLng[1] - ws.coordinate.lon;
    const d = dlat * dlat + dlon * dlon;
    if (d < minDist) { minDist = d; nearest = ws; }
  }
  return nearest;
}

function nearestWindClass(
  startLatLng: [number, number],
  weatherSegments: WeatherSegment[]
): WeatherSegment["windClass"] | null {
  return nearestWeatherSegment(startLatLng, weatherSegments)?.windClass ?? null;
}


function weatherEmoji(code: string, t: number): string {
  const c = code.toLowerCase();
  if (c.includes("thunder"))      return "⛈️";
  if (c.includes("heavyrain"))    return "⛈️";
  if (c.includes("rain"))         return "🌧️";
  if (c.includes("snow"))         return "❄️";
  if (c.includes("sleet"))        return "🌨️";
  if (c.includes("fog"))          return "🌫️";
  if (c.includes("clearsky"))     return t < 0 ? "🌙" : "☀️";
  if (c.includes("fair"))         return "🌤️";
  if (c.includes("partlycloudy")) return "⛅";
  return "☁️";
}

function windClassBorderColor(wc: WeatherSegment["windClass"] | null): string {
  if (wc === "tailwind")  return "#10b981";
  if (wc === "crosswind") return "#f59e0b";
  if (wc === "headwind")  return "#ef4444";
  return "#e5e7eb";
}

function StravaSegmentList({
  segments,
  weatherSegments,
  activeId,
  onSelect,
}: {
  segments: StravaSegment[];
  weatherSegments: WeatherSegment[];
  activeId: number | null;
  onSelect: (id: number) => void;
}) {
  if (!segments.length) {
    return (
      <div className="flex items-center justify-center h-24 text-gray-400 text-sm px-4 text-center">
        No Strava segments found along this route
      </div>
    );
  }
  return (
    <div className="space-y-2 px-3 py-3">
      {segments.map((seg) => {
        const midCoord = seg.coordinates[Math.floor(seg.coordinates.length / 2)];
        const midLatLng: [number, number] = midCoord
          ? [midCoord.lat, midCoord.lon]
          : seg.startLatLng;
        const wx = nearestWeatherSegment(midLatLng, weatherSegments);
        const wc = wx?.windClass ?? null;
        const borderColor = activeId === seg.id ? "#f97316" : windClassBorderColor(wc);

        return (
          <button
            key={seg.id}
            onClick={() => onSelect(seg.id)}
            className="w-full text-left p-3 rounded-xl bg-white transition-all"
            style={{
              border: `2px solid ${borderColor}`,
              borderLeft: `4px solid ${borderColor}`,
              boxShadow: activeId === seg.id ? `0 0 0 1px ${borderColor}` : undefined,
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium text-gray-900 text-sm leading-tight flex items-center gap-1">
                {seg.starred && <span className="text-amber-400" title="Starred segment">★</span>}
                {seg.name}
              </span>
              {seg.climbCategory > 0 && (
                <span className="shrink-0 text-xs font-bold text-white bg-blue-900 px-1.5 py-0.5 rounded">
                  {seg.climbCategory === 5 ? "HC" : `Cat ${seg.climbCategory}`}
                </span>
              )}
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <div className="flex gap-3 text-xs text-gray-500">
                <span>{(seg.distanceM / 1000).toFixed(1)} km</span>
                {seg.avgGrade !== 0 && <span>{seg.avgGrade.toFixed(1)}% snitt</span>}
                {seg.elevDifference > 0 && <span>+{Math.round(seg.elevDifference)} m</span>}
              </div>
              {wx && (
                <span className="shrink-0 flex items-center gap-1 text-sm font-semibold text-gray-700">
                  <span className="text-base">{weatherEmoji(wx.weather.symbolCode, wx.weather.temperature)}</span>
                  <span>{Math.round(wx.weather.temperature)}°</span>
                  {wx.weather.precipitation > 0.1 && (
                    <span className="text-blue-500 font-medium">{wx.weather.precipitation.toFixed(1)}mm</span>
                  )}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function ReverseButton({ reversed, onToggle }: { reversed: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      title={reversed ? "Show original direction" : "Reverse route"}
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
      {reversed ? "Reversed" : "Reverse"}
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
