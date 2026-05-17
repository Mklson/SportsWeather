"use client";

import { useId } from "react";
import type { SportType } from "@/types";
import { estimateTotalDuration } from "@/lib/route-sampler";
import type { Coordinate } from "@/types";

const SPORT_CONFIG: Record<SportType, { min: number; max: number; default: number; unit: string; pace?: boolean }> = {
  cycling: { min: 15, max: 50, default: 28, unit: "km/h" },
  running: { min: 6,  max: 18, default: 10, unit: "km/h", pace: true },
  skiing:  { min: 8,  max: 40, default: 15, unit: "km/h" },
};

function formatDuration(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} t`;
  return `${h} t ${m} min`;
}

function kmhToPace(kmh: number): string {
  const totalSec = (60 / kmh) * 60;
  const minutes = Math.floor(totalSec / 60);
  const seconds = Math.round(totalSec % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

interface Props {
  sport: SportType;
  speedKmh: number;
  onChange: (speed: number) => void;
  coords: Coordinate[];
}

export function SpeedSlider({ sport, speedKmh, onChange, coords }: Props) {
  const id = useId();
  const cfg = SPORT_CONFIG[sport];

  const estimatedHours = estimateTotalDuration(coords, speedKmh, sport);
  const durationLabel  = formatDuration(estimatedHours);

  const speedLabel = cfg.pace
    ? `${kmhToPace(speedKmh)} /km`
    : `${speedKmh} ${cfg.unit}`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Duration</span>
        <span className="text-xs text-blue-600 font-semibold tabular-nums">
          {speedLabel} · {durationLabel}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={cfg.min}
        max={cfg.max}
        step={1}
        value={speedKmh}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-gray-200 accent-blue-600"
        aria-label="Select pace"
      />
      <div className="flex justify-between text-xs text-gray-400">
        {cfg.pace ? (
          <>
            <span>{kmhToPace(cfg.min)} /km</span>
            <span>{kmhToPace(cfg.max)} /km</span>
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
