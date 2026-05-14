"use client";

import { useId } from "react";
import type { SportType } from "@/types";
import { estimateTotalDuration } from "@/lib/route-sampler";
import type { Coordinate } from "@/types";

const SPORT_CONFIG: Record<SportType, { min: number; max: number; default: number; unit: string }> = {
  cycling: { min: 5,  max: 45, default: 20, unit: "km/t" },
  running: { min: 3,  max: 20, default: 10, unit: "km/t" },
  skiing:  { min: 3,  max: 30, default: 12, unit: "km/t" },
};

function formatDuration(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} t`;
  return `${h} t ${m} min`;
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

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tidsbruk</span>
        <span className="text-xs text-blue-600 font-semibold tabular-nums">
          {speedKmh} {cfg.unit} · {durationLabel}
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
        aria-label="Velg hastighet"
      />
      <div className="flex justify-between text-xs text-gray-400">
        <span>{cfg.min} {cfg.unit}</span>
        <span>{cfg.max} {cfg.unit}</span>
      </div>
    </div>
  );
}
