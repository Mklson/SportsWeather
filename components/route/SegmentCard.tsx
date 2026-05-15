"use client";

import { useRef, useEffect } from "react";
import type { WeatherSegment, SportType } from "@/types";
import { WeatherIcon } from "@/components/weather/WeatherIcon";
import { windClassLabel, windStrengthLabel, precipitationColor } from "@/lib/wind-classifier";
import { classifySkiConditions, skiFeelsLike, snowCoverageIcon } from "@/lib/ski-conditions";
import clsx from "clsx";

interface Props {
  segment: WeatherSegment;
  isActive: boolean;
  sport: SportType;
  onClick: () => void;
}

export function SegmentCard({ segment: seg, isActive, sport, onClick }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isActive) ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [isActive]);

  const windBorderColor =
    seg.windClass === "tailwind"  ? "#10b981" :
    seg.windClass === "headwind"  ? "#ef4444" : "#f59e0b";

  const skiConditions = sport === "skiing" ? classifySkiConditions(seg.weather) : null;
  const accentColor = skiConditions ? skiConditions.color : windBorderColor;

  return (
    <div
      ref={ref}
      onClick={onClick}
      className={clsx(
        "relative rounded-xl p-3 cursor-pointer transition-all duration-150",
        "bg-white flex flex-col gap-2",
        isActive ? "shadow-md shadow-blue-100" : "hover:shadow-sm"
      )}
      style={{
        border: isActive
          ? "2px solid #60a5fa"
          : `1.5px solid ${accentColor}33`,
        borderLeft: `4px solid ${accentColor}`,
      }}
    >
      {sport === "skiing" ? <SkiCard seg={seg} /> : <DefaultCard seg={seg} />}
    </div>
  );
}

// ─── Cycling / Running ──────────────────────────────────────────────────────

function DefaultCard({ seg }: { seg: WeatherSegment }) {
  const hasRain = seg.weather.precipitation > 0;
  const rainColor = precipitationColor(seg.weather.precipitation);

  return (
    <>
      {hasRain && (
        <div className="absolute left-0 top-2 bottom-2 w-1 rounded-full"
             style={{ backgroundColor: rainColor }} />
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-400">
          {seg.startKm.toFixed(1)}–{seg.endKm.toFixed(1)} km
        </span>
        <WeatherIcon symbolCode={seg.weather.symbolCode} size={17} />
      </div>

      <div className="flex items-center gap-3">
        <span className="text-2xl font-bold text-gray-900 tabular-nums">
          {Math.round(seg.weather.temperature)}°
        </span>
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-xs font-semibold" style={{ color: seg.color }}>
            {windClassLabel(seg.windClass)}
          </span>
          <span className="text-xs text-gray-400">
            {seg.weather.windSpeed.toFixed(1)} m/s · {windStrengthLabel(seg.windStrength)}
          </span>
        </div>
        <WindArrow windFrom={seg.weather.windDirection} color={seg.color} />
      </div>

      {hasRain && (
        <div className="flex items-center gap-1.5 text-xs">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: rainColor }} />
          <span style={{ color: rainColor }}>{seg.weather.precipitation.toFixed(1)} mm/t</span>
        </div>
      )}

      <CloudBar cover={seg.weather.cloudCover} />
    </>
  );
}

// ─── Skiing ─────────────────────────────────────────────────────────────────

function SkiCard({ seg }: { seg: WeatherSegment }) {
  const ski = classifySkiConditions(seg.weather);
  const feelsLike = skiFeelsLike(seg.weather.temperature, seg.weather.windSpeed);
  const snowIcon = snowCoverageIcon(seg.weather.symbolCode, seg.weather.temperature);
  const isSnowing = seg.weather.precipitation > 0 && seg.weather.temperature < 2;

  return (
    <>
      <div className="absolute left-0 top-2 bottom-2 w-1 rounded-full"
           style={{ backgroundColor: ski.color }} />

      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-400">
          {seg.startKm.toFixed(1)}–{seg.endKm.toFixed(1)} km
        </span>
        <span className="text-base">{snowIcon}</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <span className="text-2xl font-bold text-gray-900 tabular-nums">
            {Math.round(seg.weather.temperature)}°
          </span>
          {feelsLike !== seg.weather.temperature && (
            <span className="text-xs text-gray-400">Feels like {feelsLike}°</span>
          )}
        </div>
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-xs font-semibold" style={{ color: ski.color }}>
            {ski.label}
          </span>
          <span className="text-xs text-gray-400">
            💨 {seg.weather.windSpeed.toFixed(1)} m/s
          </span>
        </div>
      </div>

      <div className="text-xs bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5">
        <span className="text-gray-400">Wax: </span>
        <span className="text-gray-700 font-medium">{ski.waxHint}</span>
      </div>

      {seg.weather.precipitation > 0 && (
        <div className="flex items-center gap-1.5 text-xs">
          <span>{isSnowing ? "❄️" : "🌧️"}</span>
          <span className={isSnowing ? "text-blue-500" : "text-blue-400"}>
            {isSnowing ? "Snow" : "Rain"} {seg.weather.precipitation.toFixed(1)} mm/h
          </span>
        </div>
      )}
    </>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function WindArrow({ windFrom, color }: { windFrom: number; color: string }) {
  const rotation = (windFrom + 180) % 360;
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0 ml-auto"
         style={{ transform: `rotate(${rotation}deg)`, color }} fill="currentColor">
      <path d="M12 2L8 10h3v10h2V10h3L12 2z" />
    </svg>
  );
}

function CloudBar({ cover }: { cover: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1.5 w-16 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
        <div className="h-full bg-gray-300 rounded-full transition-all"
             style={{ width: `${cover}%` }} />
      </div>
      <span className="text-xs text-gray-400">{Math.round(cover)}% cloud</span>
    </div>
  );
}
