"use client";

import { useState, useRef, useLayoutEffect, useMemo } from "react";
import { motion, type PanInfo } from "framer-motion";
import { format } from "date-fns";
import { enUS, nb } from "date-fns/locale";
import clsx from "clsx";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { Route, SportType, StravaSegment, WeatherSegment } from "@/types";
import {
  getBaseHour, dateToHourOffset, hourOffsetToDate, DEFAULT_RANGE_HOURS,
} from "../TimeSlider";
import {
  SPORT_CONFIG, kmhToPace, formatPace, speedToSliderValue, sliderValueToSpeed,
  estimateDurationHours, formatDuration,
} from "../SpeedSlider";
import { VerticalDragSlider } from "./VerticalDragSlider";
import { ConditionsPanel } from "./ConditionsPanel";
import { SegmentsPanel } from "./SegmentsPanel";
import { SkiWaxBar } from "./SkiWaxBar";
import { RouteOverviewChart } from "./RouteOverviewChart";
import { summarizeConditions, weatherEmoji } from "@/lib/weather-display";

type OpenPanel = "time" | "pace" | "conditions" | "segments" | "overview" | null;

const HANDLE_HEIGHT = 30;
const SWIPE_DISTANCE = 32;
const SWIPE_VELOCITY = 300;

interface Props {
  route: Route;
  sport: SportType;
  startTime: Date;
  onTimeChange: (d: Date) => void;
  speedKmh: number;
  onSpeedChange: (s: number) => void;
  stravaConnected: boolean;
  stravaSegments: StravaSegment[];
  weatherSegments: WeatherSegment[];
  stravaLoading: boolean;
  stravaError: string | null;
  activeStravaId: number | null;
  onStravaSegmentClick: (id: number) => void;
  starredOnly: boolean;
  onToggleStarredOnly: () => void;
  starredCount: number;
  totalCount: number;
  onOverviewPointerChange?: (segment: WeatherSegment | null) => void;
}

export function MobileControlBar({
  route,
  sport,
  startTime,
  onTimeChange,
  speedKmh,
  onSpeedChange,
  stravaConnected,
  stravaSegments,
  weatherSegments,
  stravaLoading,
  stravaError,
  activeStravaId,
  onStravaSegmentClick,
  starredOnly,
  onToggleStarredOnly,
  starredCount,
  totalCount,
  onOverviewPointerChange,
}: Props) {
  const { t, lang } = useLanguage();
  const dateLocale = lang === "no" ? nb : enUS;
  const [barVisible, setBarVisible] = useState(true);
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [barHeight, setBarHeight] = useState(barVisible ? 84 : HANDLE_HEIGHT);

  useLayoutEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const measure = () => setBarHeight(el.getBoundingClientRect().height);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [barVisible]);

  function togglePanel(name: OpenPanel) {
    setOpenPanel((p) => (p === name ? null : name));
  }

  function handleSwipeEnd(_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) {
    if (info.offset.y > SWIPE_DISTANCE || info.velocity.y > SWIPE_VELOCITY) {
      setBarVisible(false);
      setOpenPanel(null);
    } else if (info.offset.y < -SWIPE_DISTANCE || info.velocity.y < -SWIPE_VELOCITY) {
      setBarVisible(true);
    }
  }

  const cfg = SPORT_CONFIG[sport];
  const paceGlance = cfg.pace ? `${kmhToPace(speedKmh)}/km` : `${speedKmh} ${cfg.unit}`;
  const timeGlance = format(startTime, "EEE HH:mm", { locale: dateLocale });
  const conditionsSummary = useMemo(() => summarizeConditions(weatherSegments), [weatherSegments]);
  const conditionsGlance = conditionsSummary
    ? `${weatherEmoji(conditionsSummary.dominantSymbolCode)} ${Math.round(conditionsSummary.avgTempC)}°`
    : "—";
  const segmentsGlance = stravaConnected ? String(totalCount) : "—";
  const distanceGlance = `${route.distanceKm.toFixed(1)} km`;
  const elevationGlance = route.elevationGainM ? `↑${Math.round(route.elevationGainM)} m` : undefined;

  const base = useMemo(() => getBaseHour(), []);
  const timeOffset = Math.max(0, Math.min(DEFAULT_RANGE_HOURS, dateToHourOffset(startTime, base)));
  const paceSliderValue = speedToSliderValue(speedKmh, cfg);
  const estimatedHours = useMemo(
    () => estimateDurationHours(route.coordinates, speedKmh, sport),
    [route.coordinates, speedKmh, sport]
  );
  const totalDurationLabel = formatDuration(estimatedHours, lang);

  const isDock = openPanel === "time" || openPanel === "pace";
  const isSheet = openPanel === "conditions" || openPanel === "segments" || openPanel === "overview";

  return (
    <>
      {/* Ski wax recommendation — pinned above the bar, cross-country only */}
      {sport === "skiing" && (
        <div
          className="absolute left-0 right-0 z-20 rounded-t-2xl overflow-hidden"
          style={{ bottom: barHeight, transition: "bottom 0.2s ease-out" }}
        >
          <SkiWaxBar segments={weatherSegments} />
        </div>
      )}

      {/* Shared backdrop — dismisses whatever panel/dock is open. Stops at the
          bar's top edge (not `fixed`, not covering the top nav) so Back/Save/Clear
          and the bar's own buttons stay usable as an escape hatch. */}
      {openPanel !== null && (
        <div
          className="absolute left-0 right-0 top-0 z-10"
          style={{ bottom: barHeight }}
          onClick={() => setOpenPanel(null)}
        />
      )}

      {/* Left-edge docked vertical slider — time/pace. Left (not right) and offset
          below the top-2/left-2 basemap/3D toggle so the two never overlap; fully
          opaque so nothing (e.g. a map control) can bleed through it. */}
      {isDock && (
        <div
          className="absolute left-0 z-20 w-14 bg-white border-r border-gray-200 shadow-xl"
          style={{ top: 48, bottom: barHeight }}
        >
          {openPanel === "time" ? (
            <VerticalDragSlider
              value={timeOffset}
              min={0}
              max={DEFAULT_RANGE_HOURS}
              step={0.5}
              tickStep={1}
              onChange={(offset) => onTimeChange(hourOffsetToDate(offset, base))}
              formatValue={(offset) => format(hourOffsetToDate(offset, base), "HH:mm", { locale: dateLocale })}
              label={t.mobileBar.start}
              footer={
                <input
                  type="datetime-local"
                  value={format(startTime, "yyyy-MM-dd'T'HH:mm")}
                  onChange={(e) => {
                    const d = new Date(e.target.value);
                    if (!isNaN(d.getTime())) onTimeChange(d);
                  }}
                  className="w-11 bg-white border border-gray-200 rounded-lg px-0.5 py-1 text-[9px] text-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-green"
                />
              }
            />
          ) : (
            <VerticalDragSlider
              value={paceSliderValue}
              min={cfg.min}
              max={cfg.max}
              step={cfg.step}
              tickStep={1}
              onChange={(v) => onSpeedChange(sliderValueToSpeed(v, cfg))}
              formatValue={(v) => (cfg.pace ? formatPace(v) : v.toFixed(1))}
              label={t.mobileBar.pace}
              footer={
                <div className="w-11 text-center bg-gray-50 border border-gray-200 rounded-lg px-0.5 py-1 text-[9px] text-gray-600 leading-tight">
                  {totalDurationLabel}
                </div>
              }
            />
          )}
        </div>
      )}

      {/* Bottom slide-up shell — Conditions/Segments */}
      {isSheet && (
        <div
          className="absolute left-0 right-0 z-20 bg-white rounded-t-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ bottom: barHeight, maxHeight: "45dvh" }}
        >
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
            <span className="font-semibold text-gray-900 text-sm">
              {openPanel === "conditions"
                ? t.mobileBar.conditions
                : openPanel === "overview"
                ? t.mobileBar.overview
                : t.mobileBar.segments}
            </span>
            <button
              onClick={() => setOpenPanel(null)}
              className="p-1 rounded-lg bg-gray-100 active:bg-gray-200 text-gray-500 text-xs font-semibold px-2"
            >
              {t.mobileBar.close}
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            {openPanel === "conditions" ? (
              <ConditionsPanel segments={weatherSegments} />
            ) : openPanel === "overview" ? (
              <RouteOverviewChart segments={weatherSegments} onPointerChange={onOverviewPointerChange} />
            ) : (
              <SegmentsPanel
                stravaConnected={stravaConnected}
                segments={stravaSegments}
                weatherSegments={weatherSegments}
                loading={stravaLoading}
                error={stravaError}
                activeId={activeStravaId}
                onSelect={onStravaSegmentClick}
                starredOnly={starredOnly}
                onToggleStarredOnly={onToggleStarredOnly}
                starredCount={starredCount}
                totalCount={totalCount}
              />
            )}
          </div>
        </div>
      )}

      {/* Sticky bar / collapsed handle — floats as a translucent rounded pill,
          inset from the screen edges, so the map stays visible behind it. */}
      <div
        ref={barRef}
        className="absolute bottom-0 left-0 right-0 z-20 px-3"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 10px)" }}
      >
        <div className="bg-white/75 backdrop-blur-xl rounded-[28px] shadow-2xl ring-1 ring-black/5 overflow-hidden">
          {barVisible ? (
            <>
              <motion.div
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.3}
                onDragEnd={handleSwipeEnd}
                onClick={() => setBarVisible(false)}
                style={{ touchAction: "none" }}
                className="flex justify-center py-1.5 cursor-grab active:cursor-grabbing"
              >
                <div className="w-10 h-1 rounded-full bg-gray-300" />
              </motion.div>
              <div className="grid grid-cols-5 gap-1 px-2 pb-2">
                <BarButton icon="🕐" label={t.mobileBar.start} value={timeGlance} active={openPanel === "time"} onClick={() => togglePanel("time")} />
                <BarButton icon="⏱️" label={t.mobileBar.duration} value={paceGlance} subValue={totalDurationLabel} active={openPanel === "pace"} onClick={() => togglePanel("pace")} />
                <BarButton icon="📊" label={t.mobileBar.overview} value={distanceGlance} subValue={elevationGlance} active={openPanel === "overview"} onClick={() => togglePanel("overview")} />
                <BarButton icon="🌤️" label={t.mobileBar.conditions} value={conditionsGlance} active={openPanel === "conditions"} onClick={() => togglePanel("conditions")} />
                <BarButton icon="🚩" label={t.mobileBar.segments} value={segmentsGlance} active={openPanel === "segments"} onClick={() => togglePanel("segments")} />
              </div>
            </>
          ) : (
            <motion.div
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.3}
              onDragEnd={handleSwipeEnd}
              onClick={() => setBarVisible(true)}
              style={{ touchAction: "none" }}
              className="flex flex-col items-center gap-0.5 py-1.5 px-4 cursor-grab active:cursor-grabbing"
            >
              <div className="w-10 h-1 rounded-full bg-gray-300" />
              <span className="text-[11px] font-medium text-gray-500 truncate max-w-[70vw]">{route.name}</span>
            </motion.div>
          )}
        </div>
      </div>
    </>
  );
}

function BarButton({
  icon, label, value, subValue, active, onClick,
}: {
  icon: string;
  label: string;
  value: string;
  subValue?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{ touchAction: "manipulation" }}
      className={clsx(
        "flex flex-col items-center justify-start gap-0.5 py-1.5 rounded-xl text-center transition-colors min-w-0",
        active ? "bg-brand-green-soft text-brand-green-dark" : "active:bg-gray-100 text-gray-600"
      )}
    >
      <span className="text-[9px] font-medium uppercase tracking-wide text-gray-400 truncate w-full">{label}</span>
      <span className="text-base leading-none">{icon}</span>
      <span className="text-xs font-bold tabular-nums truncate w-full">{value}</span>
      {subValue && (
        <span className="text-[10px] font-semibold tabular-nums truncate w-full leading-tight opacity-80">{subValue}</span>
      )}
    </button>
  );
}
