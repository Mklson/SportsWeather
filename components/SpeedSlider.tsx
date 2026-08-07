"use client";

import { useMemo, useId } from "react";
import type { SportType } from "@/types";
import { haversineMetres, gradeAdjustedSpeed } from "@/lib/route-sampler";
import type { Coordinate } from "@/types";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { Lang } from "@/lib/i18n/dictionary";

// For pace sports, min/max/step are in min/km (pace), not km/h — the slider
// operates natively in pace units so steps stay uniform across the walking-to-running range.
// Exported so the mobile control bar's vertical pace dock reuses the exact same ranges/units.
export const SPORT_CONFIG: Record<SportType, { min: number; max: number; step: number; unit: string; pace?: boolean }> = {
  cycling: { min: 15, max: 50, step: 0.5,  unit: "km/h" },
  running: { min: 2,  max: 40, step: 0.05, unit: "km/h", pace: true },
  skiing:  { min: 8,  max: 40, step: 0.5,  unit: "km/h" },
};

export function formatDuration(hours: number, lang: Lang = "no"): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  const hUnit = lang === "no" ? "t" : "h";
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} ${hUnit}`;
  return `${h} ${hUnit} ${m} min`;
}

export function kmhToPace(kmh: number): string {
  return formatPace(60 / kmh);
}

export function formatPace(paceMinPerKm: number): string {
  const minutes = Math.floor(paceMinPerKm);
  const seconds = Math.round((paceMinPerKm - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// Pace sports store speed as km/h but drive their slider in min/km (pace) —
// this is that same transform, exported so the mobile pace dock stays in sync.
export function speedToSliderValue(speedKmh: number, cfg: { pace?: boolean }): number {
  return cfg.pace ? 60 / speedKmh : speedKmh;
}

export function sliderValueToSpeed(sliderValue: number, cfg: { pace?: boolean }): number {
  return cfg.pace ? 60 / sliderValue : sliderValue;
}

// Haversine is expensive — this precompute is shared with the mobile control bar's
// duration readout so it isn't re-derived (and can't drift) from SpeedSlider's own copy.
export function estimateDurationHours(
  coords: Coordinate[],
  speedKmh: number,
  sport: SportType
): number {
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    const distM = haversineMetres(coords[i - 1], coords[i]);
    const prevEle = coords[i - 1].ele ?? 0;
    const currEle = coords[i].ele ?? 0;
    const grade = distM > 0 ? ((currEle - prevEle) / distM) * 100 : 0;
    total += (distM / 1000) / gradeAdjustedSpeed(speedKmh, grade, sport);
  }
  return total;
}

interface Props {
  sport: SportType;
  speedKmh: number;
  onChange: (speed: number) => void;
  coords: Coordinate[];
}

export function SpeedSlider({ sport, speedKmh, onChange, coords }: Props) {
  const id = useId();
  const { t, lang } = useLanguage();
  const cfg = SPORT_CONFIG[sport];

  // Haversine is expensive — pre-compute per-segment (distM, grade) once per route,
  // then derive duration with cheap arithmetic on every speed change.
  const routeSegments = useMemo(() => {
    const segs: { distM: number; grade: number }[] = [];
    for (let i = 1; i < coords.length; i++) {
      const distM = haversineMetres(coords[i - 1], coords[i]);
      const prevEle = coords[i - 1].ele ?? 0;
      const currEle = coords[i].ele ?? 0;
      segs.push({ distM, grade: distM > 0 ? ((currEle - prevEle) / distM) * 100 : 0 });
    }
    return segs;
  }, [coords]);

  const estimatedHours = useMemo(() => {
    let total = 0;
    for (const { distM, grade } of routeSegments) {
      total += (distM / 1000) / gradeAdjustedSpeed(speedKmh, grade, sport);
    }
    return total;
  }, [routeSegments, speedKmh, sport]);

  const durationLabel  = formatDuration(estimatedHours, lang);

  const speedLabel = cfg.pace
    ? `${kmhToPace(speedKmh)} /km`
    : `${speedKmh} ${cfg.unit}`;

  // Pace sports drive the slider directly in min/km so steps stay uniform
  // across the range (a km/h-linear slider would barely move at walking paces).
  const sliderValue = cfg.pace ? 60 / speedKmh : speedKmh;

  const handleSliderChange = (raw: number) => {
    onChange(cfg.pace ? 60 / raw : raw);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t.slider.duration}</span>
        <span className="text-xs text-brand-green-dark font-semibold tabular-nums">
          {speedLabel} · {durationLabel}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={cfg.min}
        max={cfg.max}
        step={cfg.step}
        value={sliderValue}
        onChange={(e) => handleSliderChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-gray-200 accent-brand-green touch-none"
        aria-label={t.slider.selectPace}
      />
      <div className="flex justify-between text-xs text-gray-400">
        {cfg.pace ? (
          <>
            <span>{formatPace(cfg.min)} /km</span>
            <span>{formatPace(cfg.max)} /km</span>
          </>
        ) : (
          <>
            <span>{cfg.min} {cfg.unit}</span>
            <span>{cfg.max} {cfg.unit}</span>
          </>
        )}
      </div>
    </div>
  );
}
