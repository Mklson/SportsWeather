"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import useSWR from "swr";
import type { Route, SportType, StravaSegment, WeatherSegment } from "@/types";
import { TimeSlider } from "./TimeSlider";
import { SpeedSlider } from "./SpeedSlider";
import { SkiWaxBar } from "./route/SkiWaxBar";
import { WindBreakdownBar } from "./route/WindBreakdownBar";
import { StravaSegmentList } from "./route/StravaSegmentList";
import { useWeather } from "@/hooks/useWeather";
import { DEFAULT_SPEED_KMH } from "@/lib/route-sampler";
import clsx from "clsx";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { interpolate } from "@/lib/i18n/dictionary";

const RouteMap = dynamic(
  () => import("./map/RouteMap").then((m) => m.RouteMap),
  { ssr: false, loading: () => <MapSkeleton /> }
);

// framer-motion is only needed for the mobile control bar's drag gestures —
// lazy-load it so desktop never pays for parsing/hydrating it.
const MobileControlBar = dynamic(
  () => import("./route/MobileControlBar").then((m) => m.MobileControlBar),
  { ssr: false }
);

const EMPTY_STRAVA_SEGMENTS: StravaSegment[] = [];

interface Props {
  route: Route;
  initialSport?: SportType;
  initialSpeedKmh?: number;
  stravaConnected?: boolean;
  backHref?: string;
  initialSegments?: WeatherSegment[];
  canSave?: boolean;
  initialStartTime?: Date;
}

export function RouteView({ route, initialSport = "cycling", initialSpeedKmh, stravaConnected = false, backHref = "/", initialSegments, canSave = false, initialStartTime }: Props) {
  const { t } = useLanguage();
  const [startTime, setStartTime] = useState<Date>(() => {
    if (initialStartTime) return initialStartTime;
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
  const [speedKmh, setSpeedKmh] = useState(() => initialSpeedKmh ?? DEFAULT_SPEED_KMH[initialSport]);
  const [mapBounds, setMapBounds] = useState<{ west: number; south: number; east: number; north: number } | null>(null);
  const [cleared, setCleared] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  async function handleSave() {
    setSaveState("saving");
    const res = await fetch(`/api/routes/${route.id}`, { method: "PATCH" });
    setSaveState(res.ok ? "saved" : "idle");
  }

  const [shareState, setShareState] = useState<"idle" | "copied">("idle");
  async function handleShare() {
    const shareUrl = new URL(window.location.href);
    shareUrl.searchParams.set("speedKmh", String(speedKmh));
    shareUrl.searchParams.set("startTime", startTime.toISOString());
    const url = shareUrl.toString();
    if (navigator.share) {
      try {
        await navigator.share({ title: route.name, url });
      } catch {
        // User cancelled the native share sheet — nothing to do.
      }
      return;
    }
    await navigator.clipboard.writeText(url);
    setShareState("copied");
    setTimeout(() => setShareState("idle"), 1500);
  }
  const [starredOnly, setStarredOnly] = useState(true);
  const handleToggleStarredOnly = useCallback(() => setStarredOnly((v) => !v), []);
  // Debounced values for weather — sliders update display instantly but the
  // SWR key (and any map re-render) only changes 400ms after the user stops.
  const [weatherSpeed, setWeatherSpeed] = useState(speedKmh);
  const [weatherTime, setWeatherTime] = useState(startTime);
  useEffect(() => {
    const t = setTimeout(() => setWeatherSpeed(speedKmh), 400);
    return () => clearTimeout(t);
  }, [speedKmh]);
  useEffect(() => {
    const t = setTimeout(() => setWeatherTime(startTime), 400);
    return () => clearTimeout(t);
  }, [startTime]);

  // iOS Safari intercepts pinch gestures as page-level zoom unless we prevent
  // gesturestart/gesturechange at the document level on this page.
  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();
    document.addEventListener("gesturestart", prevent, { passive: false });
    document.addEventListener("gesturechange", prevent, { passive: false });
    return () => {
      document.removeEventListener("gesturestart", prevent);
      document.removeEventListener("gesturechange", prevent);
    };
  }, []);

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
    weatherTime,
    reversed ? reversedCoords : undefined,
    weatherSpeed,
    sport,
    initialSegments
  );

  const stravaSegKey = stravaConnected
    ? `/api/strava/segments?routeId=${route.id}&sport=${sport}&rev=${reversed}`
    : null;
  const { data: stravaSegData, isLoading: stravaLoading, error: stravaError } = useSWR<{ segments: StravaSegment[] }>(
    stravaSegKey,
    (url: string) => fetch(url).then((r) => r.json()),
    { revalidateOnFocus: false }
  );
  // Stable reference when not logged in — a fresh [] each render causes the
  // fitBounds effect in RouteMap to re-run on every pan/zoom (moveend → setMapBounds
  // → re-render → new [] reference → effect fires → fitBounds back to route).
  const stravaSegments = stravaSegData?.segments ?? EMPTY_STRAVA_SEGMENTS;

  const handleTimeChange = useCallback((date: Date) => {
    setCleared(false);
    setStartTime(date);
  }, []);

  const handleSpeedChange = useCallback((s: number) => {
    setCleared(false);
    setSpeedKmh(s);
  }, []);

  const handleToggleReverse = useCallback(() => {
    setCleared(false);
    setReversed((v) => !v);
  }, []);


  const starredCount = useMemo(
    () => stravaSegments.filter((s) => s.starred).length,
    [stravaSegments]
  );

  // Star-filtered segments for the map (draws route lines)
  const mapStravaSegments = useMemo(
    () => starredOnly ? stravaSegments.filter((s) => s.starred) : stravaSegments,
    [starredOnly, stravaSegments]
  );

  // Star-filtered + map-bounds filtered segments for the sidebar/sheet list
  const listStravaSegments = useMemo(() => {
    const base = starredOnly ? stravaSegments.filter((s) => s.starred) : stravaSegments;
    return mapBounds
      ? base.filter((seg) =>
          seg.coordinates.some(
            (c) =>
              c.lat >= mapBounds.south && c.lat <= mapBounds.north &&
              c.lon >= mapBounds.west  && c.lon <= mapBounds.east
          )
        )
      : base;
  }, [mapBounds, stravaSegments, starredOnly]);

  return (
    <>
      {/* ── Mobile layout ─────────────────────────────────────────────── */}
      {/*
        The top nav bar sits in a flex column ABOVE the map container.
        Mapbox sets touch-action:none on its canvas via JS; on iOS this absorbs
        all touches in the canvas area regardless of z-index. Keeping the nav bar
        outside the canvas area (non-overlapping) is the only reliable fix.
      */}
      <div className="md:hidden flex flex-col bg-white" style={{ height: "100dvh" }}>
        {/* Top nav bar — above the map, never overlaps the Mapbox canvas.
            relative+z-30: ensures taps here win over the bottom sheet (z-20) and canvas if
            any sub-pixel overflow causes an invisible overlap on iOS.
            Buttons and the route name/stats sit on their own stacked rows — the
            name used to be squeezed two-line into a corner next to Reverse, so it
            now gets the full width as a single truncating line underneath. */}
        <div className="flex-shrink-0 flex flex-col bg-white border-b border-gray-200 relative z-30">
          <div className="flex items-center justify-start gap-1.5 px-3 pt-1.5 pb-1">
            <ReverseButton reversed={reversed} onToggle={handleToggleReverse} t={t} />
            <button
              onClick={() => { window.location.href = backHref; }}
              style={{ touchAction: "manipulation" }}
              className="flex items-center gap-1 text-gray-700 text-xs font-semibold px-2.5 py-1 rounded-lg bg-gray-100 active:bg-gray-200"
            >
              ← {backHref === "/dashboard" ? t.route.dashboard : t.route.home}
            </button>
            {canSave && saveState !== "saved" && (
              <button
                onClick={handleSave}
                disabled={saveState === "saving"}
                style={{ touchAction: "manipulation" }}
                className="text-xs font-medium text-brand-navy active:text-brand-navy-dark disabled:opacity-50"
              >
                {saveState === "saving" ? t.route.saving : t.route.save}
              </button>
            )}
            {saveState === "saved" && (
              <span className="text-xs font-medium text-green-600">{t.route.saved}</span>
            )}
            <button
              onClick={resetMap}
              title={t.route.clearMapTitle}
              style={{ touchAction: "manipulation" }}
              className="flex items-center gap-1 text-gray-500 text-xs font-semibold px-2.5 py-1 rounded-lg bg-gray-100 active:bg-gray-200"
            >
              <ResetIcon /> {t.route.clear}
            </button>
            <button
              onClick={handleShare}
              title={t.route.shareTitle}
              style={{ touchAction: "manipulation" }}
              className="flex items-center gap-1 text-gray-500 text-xs font-semibold px-2.5 py-1 rounded-lg bg-gray-100 active:bg-gray-200"
            >
              {shareState === "copied" ? <>✓ {t.route.copied}</> : <><ShareIcon /> {t.route.share}</>}
            </button>
          </div>
          <div className="px-3 pb-1.5 min-w-0">
            <span className="text-[11px] truncate block leading-tight">
              <span className="font-semibold text-gray-800">{route.name}</span>
              <span className="text-gray-400">
                {" "}· {route.distanceKm.toFixed(1)} km
                {route.elevationGainM ? ` · ${Math.round(route.elevationGainM)} m` : ""}
              </span>
            </span>
          </div>
        </div>
        {/* Map fills remaining height.
            isolation:isolate creates a stacking context so iOS Safari clips the
            MobileBottomSheet's pointer-events hit area to this container — without it,
            iOS extends the absolute z-20 sheet's touch area across the entire map. */}
        <div className="flex-1 min-h-0 relative overflow-hidden" style={{ isolation: "isolate" }}>
        <div className="absolute inset-0">
          <RouteMap
            key={route.id}
            route={route}
            segments={cleared ? [] : segments}
            showRoute={!cleared}
            activeSegmentIndex={null}
            sport={sport}
            stravaSegments={cleared ? [] : mapStravaSegments}
            activeStravaSegmentId={activeStravaId}
            onStravaSegmentClick={handleStravaSegmentClick}
            onBoundsChange={handleBoundsChange}
            reversed={reversed}
          />
        </div>
        <MobileControlBar
          route={route}
          sport={sport}
          startTime={startTime}
          onTimeChange={handleTimeChange}
          speedKmh={speedKmh}
          onSpeedChange={handleSpeedChange}
          stravaConnected={stravaConnected}
          stravaSegments={listStravaSegments}
          weatherSegments={segments}
          stravaLoading={stravaLoading}
          stravaError={(stravaError as { error?: string } | null)?.error ?? (stravaError instanceof Error ? stravaError.message : null)}
          activeStravaId={activeStravaId}
          onStravaSegmentClick={handleStravaSegmentClick}
          starredOnly={starredOnly}
          onToggleStarredOnly={handleToggleStarredOnly}
          starredCount={starredCount}
          totalCount={stravaSegments.length}
        />
        </div>
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
            sport={sport}
            stravaSegments={cleared ? [] : mapStravaSegments}
            activeStravaSegmentId={activeStravaId}
            onStravaSegmentClick={handleStravaSegmentClick}
            onBoundsChange={handleBoundsChange}
            reversed={reversed}
          />
        </div>
        <aside className="w-80 flex flex-col bg-gray-50 border-l border-gray-200 shadow-[-4px_0_16px_rgba(0,0,0,0.06)]">
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
            {/* Back navigation */}
            <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-gray-200 bg-white">
              <div className="flex items-center gap-2">
                <button onClick={() => { window.location.href = backHref; }} className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors">
                  ← {backHref === "/dashboard" ? t.route.dashboard : t.route.home}
                </button>
                {stravaConnected && (
                  <>
                    <span className="text-gray-300">|</span>
                    <Link href="/strava/activities" prefetch={false} className="flex items-center gap-1 text-xs font-medium text-orange-500 hover:text-orange-700 transition-colors">
                      ← {t.route.strava}
                    </Link>
                  </>
                )}
              </div>
              {canSave && saveState !== "saved" && (
                <button
                  onClick={handleSave}
                  disabled={saveState === "saving"}
                  className="text-xs font-medium text-brand-navy hover:text-brand-navy-dark transition-colors disabled:opacity-50"
                >
                  {saveState === "saving" ? t.route.saving : t.route.saveToAccount}
                </button>
              )}
              {saveState === "saved" && (
                <span className="text-xs font-medium text-green-600">{t.route.saved}</span>
              )}
              <button
                onClick={resetMap}
                title={t.route.clearMapTitle}
                className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-gray-700 transition-colors"
              >
                <ResetIcon /> {t.route.resetMap}
              </button>
            </div>
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h1 className="font-bold text-gray-900 truncate text-base">{route.name}</h1>
                  <p className="text-gray-500 text-sm mt-0.5">
                    {route.distanceKm.toFixed(1)} km
                    {route.elevationGainM ? ` · ${Math.round(route.elevationGainM)} m ${t.route.elevation}` : ""}
                  </p>
                  <SourceBadge source={route.source} t={t} />
                </div>
                <ReverseButton reversed={reversed} onToggle={handleToggleReverse} t={t} />
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
              <WindBreakdownBar segments={segments} />
            </div>

            {/* Legend */}
            <div className="px-4 py-2.5 border-b border-gray-200 bg-white flex items-center gap-3 text-xs flex-wrap">
              <LegendItem color="#10b981" label={t.wind.tailwind} />
              <LegendItem color="#f59e0b" label={t.wind.crosswind} />
              <LegendItem color="#ef4444" label={t.wind.headwind} />
            </div>

            {/* Strava segments */}
            {stravaConnected && (
              <>
                <div className="px-4 py-2 border-b border-gray-200 bg-white flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{t.route.stravaSegments}</p>
                  {!stravaLoading && stravaSegments.length > 0 && (
                    <button
                      onClick={handleToggleStarredOnly}
                      className="text-xs font-medium text-amber-500 hover:text-amber-700 transition-colors"
                    >
                      {starredOnly
                        ? interpolate(t.route.showAll, { count: starredCount })
                        : interpolate(t.route.starredOnly, { count: stravaSegments.length })}
                    </button>
                  )}
                </div>
                {stravaLoading && (
                  <div className="flex items-center justify-center gap-2 p-4 text-sm text-orange-500 animate-pulse">
                    {t.route.loadingSegments}
                  </div>
                )}
                {stravaError && (
                  <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                    {String(stravaError)}
                  </div>
                )}
                {!stravaLoading && (
                  <StravaSegmentList segments={listStravaSegments} weatherSegments={segments} activeId={activeStravaId} onSelect={handleStravaSegmentClick} starredOnly={starredOnly} />
                )}
              </>
            )}
          </div>

          {/* Ski wax recommendation — pinned at the bottom, cross-country only */}
          {sport === "skiing" && (
            <div className="flex-shrink-0">
              <SkiWaxBar segments={segments} />
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

function ShareIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
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
// WindBreakdownBar and StravaSegmentList moved to components/route/ so the new
// mobile control bar (ConditionsPanel/SegmentsPanel) can reuse them without
// duplicating this file's logic — see lib/weather-display.ts for the pure helpers.

function ReverseButton({ reversed, onToggle, t }: { reversed: boolean; onToggle: () => void; t: ReturnType<typeof useLanguage>["t"] }) {
  return (
    <button
      onClick={onToggle}
      title={reversed ? t.route.showOriginalDirection : t.route.reverseRoute}
      className={clsx(
        "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border transition-colors",
        reversed
          ? "bg-brand-green text-white border-brand-green"
          : "bg-white text-gray-500 border-gray-200 hover:border-brand-green hover:text-brand-green-dark"
      )}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 1l4 4-4 4" />
        <path d="M3 11V9a4 4 0 014-4h14" />
        <path d="M7 23l-4-4 4-4" />
        <path d="M21 13v2a4 4 0 01-4 4H3" />
      </svg>
      {reversed ? t.route.reversed : t.route.reverse}
    </button>
  );
}

function SourceBadge({ source, t }: { source: Route["source"]; t: ReturnType<typeof useLanguage>["t"] }) {
  const labels: Record<Route["source"], string> = t.route.source;
  const colors: Record<Route["source"], string> = {
    strava: "bg-orange-100 text-orange-700 border-orange-200",
    garmin: "bg-blue-100 text-blue-700 border-blue-200",
    gpx:    "bg-green-100 text-green-700 border-green-200",
    tcx:    "bg-purple-100 text-purple-700 border-purple-200",
    generated: "bg-indigo-100 text-indigo-700 border-indigo-200",
    fit: "bg-cyan-100 text-cyan-700 border-cyan-200",
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
