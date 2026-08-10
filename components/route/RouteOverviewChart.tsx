"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { WeatherSegment } from "@/types";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { getDictionary } from "@/lib/i18n/dictionary";

// Internal coordinate system — the <svg> scales uniformly (no preserveAspectRatio
// override) so these proportions hold at any container width without distorting
// the axis text.
const VIEW_W = 600;
const VIEW_H = 220;
const ARROW_ROW_H = 26;
const AXIS_H = 20;
const CHART_TOP = ARROW_ROW_H;
const CHART_BOTTOM = VIEW_H - AXIS_H;
const CHART_H = CHART_BOTTOM - CHART_TOP;
const MAX_ARROWS = 16;
const RAIN_HEIGHT_FRACTION = 0.6; // cap rain bars short of full chart height so temp/elevation stay legible

// Left margin for the temperature axis, right margin for the elevation axis —
// the plot area sits between them. Precipitation doesn't get its own axis: a
// third numeric scale on a chart this narrow would be unreadable, and its
// exact value is already in the pointer readout.
const PLOT_LEFT = 34;
const PLOT_RIGHT = VIEW_W - 58;

const TICK_STEP_CANDIDATES = [0.5, 1, 2, 5, 10, 20, 25, 50, 100, 200];

function niceStep(raw: number): number {
  return TICK_STEP_CANDIDATES.find((c) => c >= raw) ?? TICK_STEP_CANDIDATES[TICK_STEP_CANDIDATES.length - 1];
}

/**
 * Whole-number axis ticks spaced by a "nice" round step (so consecutive ticks
 * are always the same distance apart — e.g. 16/18/20, never 16/17/19/20, which
 * rounding evenly-spaced fractional ticks to integers used to produce).
 *
 * Picks the smallest candidate step that still keeps the tick count at or
 * below targetCount. Deriving the step from (hi-lo)/(targetCount-1) and
 * rounding up to the next candidate looks equivalent but isn't: since ticks
 * are anchored to the first in-range multiple of the step rather than to lo
 * itself, a range that falls awkwardly between two candidate steps can lose
 * most of its span before the first tick, leaving room for only one.
 */
function axisTicks(lo: number, hi: number, targetCount: number): number[] {
  if (hi <= lo) return [Math.round(lo)];
  const step = TICK_STEP_CANDIDATES.find((c) => {
    const count = Math.floor(hi / c) - Math.ceil(lo / c) + 1;
    return count >= 1 && count <= targetCount;
  });
  // Range narrower than even the finest candidate step (e.g. a near-flat
  // temperature) — no step's multiples land inside it, so show the midpoint.
  if (step === undefined) return [Math.round((lo + hi) / 2) || 0];
  const start = Math.ceil(lo / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= hi + 1e-9; v += step) ticks.push(Math.round(v * 10) / 10 || 0);
  return ticks;
}

const COMPASS_DIRS = ["n", "ne", "e", "se", "s", "sw", "w", "nw"] as const;

function compassLabel(deg: number, t: ReturnType<typeof getDictionary>): string {
  const idx = Math.round((((deg % 360) + 360) % 360) / 45) % 8;
  return t.overview.compass[COMPASS_DIRS[idx]];
}

interface Props {
  segments: WeatherSegment[];
  onPointerChange?: (segment: WeatherSegment | null) => void;
}

export function RouteOverviewChart({ segments, onPointerChange }: Props) {
  const { t } = useLanguage();
  const svgRef = useRef<SVGSVGElement>(null);
  const [pointerPct, setPointerPct] = useState<number | null>(null);

  const chart = useMemo(() => {
    if (segments.length === 0) return null;

    const totalKm = segments[segments.length - 1].endKm;
    const xOf = (km: number) =>
      totalKm > 0 ? PLOT_LEFT + (km / totalKm) * (PLOT_RIGHT - PLOT_LEFT) : PLOT_LEFT;

    const temps = segments.map((s) => s.weather.temperature);
    const minTemp = Math.min(...temps);
    const maxTemp = Math.max(...temps);
    const tempPad = Math.max(1, (maxTemp - minTemp) * 0.15);
    const tempLo = minTemp - tempPad;
    const tempHi = maxTemp + tempPad;
    const yTemp = (c: number) => CHART_BOTTOM - ((c - tempLo) / (tempHi - tempLo)) * CHART_H;

    const eles = segments.map((s) => s.coordinate.ele).filter((e): e is number => e !== undefined);
    const hasElevation = eles.length > 1;
    const minEle = hasElevation ? Math.min(...eles) : 0;
    const maxEle = hasElevation ? Math.max(...eles) : 1;
    const eleRange = Math.max(1, maxEle - minEle);
    const yEle = (e: number) => CHART_BOTTOM - ((e - minEle) / eleRange) * CHART_H;

    const maxPrec = Math.max(1, ...segments.map((s) => s.weather.precipitation));
    const yPrec = (p: number) => CHART_BOTTOM - (p / maxPrec) * CHART_H * RAIN_HEIGHT_FRACTION;

    const tempTicks = axisTicks(tempLo, tempHi, 4).map((v) => ({ value: v, y: yTemp(v) }));
    const eleTicks = hasElevation
      ? axisTicks(minEle, maxEle, 3).map((v) => ({ value: v, y: yEle(v) }))
      : [];

    const tempPoints = segments
      .map((s) => `${xOf((s.startKm + s.endKm) / 2)},${yTemp(s.weather.temperature)}`)
      .join(" ");

    let elePath = "";
    if (hasElevation) {
      const withEle = segments.filter((s) => s.coordinate.ele !== undefined);
      const pts = withEle.map((s) => `${xOf((s.startKm + s.endKm) / 2)},${yEle(s.coordinate.ele!)}`);
      elePath = `M ${xOf(0)},${CHART_BOTTOM} L ${pts.join(" L ")} L ${xOf(totalKm)},${CHART_BOTTOM} Z`;
    }

    const rainBars = segments
      .filter((s) => s.weather.precipitation > 0.1)
      .map((s) => ({
        x: xOf(s.startKm),
        width: Math.max(0.5, xOf(s.endKm) - xOf(s.startKm)),
        y: yPrec(s.weather.precipitation),
      }));

    // Thin wind arrows to a manageable count, evenly spaced by index.
    const arrowStep = Math.max(1, Math.ceil(segments.length / MAX_ARROWS));
    const arrows = segments
      .filter((_, i) => i % arrowStep === 0)
      .map((s) => ({
        x: xOf((s.startKm + s.endKm) / 2),
        angle: s.windRelativeAngle,
        color: s.color,
      }));

    const tickStep = niceStep(totalKm / 5);
    const ticks: number[] = [];
    for (let km = 0; km <= totalKm + 0.001; km += tickStep) ticks.push(Math.round(km * 10) / 10);

    return { totalKm, xOf, yTemp, tempPoints, elePath, hasElevation, rainBars, arrows, ticks, tempTicks, eleTicks };
  }, [segments]);

  const pointer = useMemo(() => {
    if (pointerPct === null || !chart || segments.length === 0) return null;
    const km = pointerPct * chart.totalKm;
    let nearest = segments[0];
    let best = Infinity;
    for (const s of segments) {
      const d = Math.abs((s.startKm + s.endKm) / 2 - km);
      if (d < best) {
        best = d;
        nearest = s;
      }
    }
    return { km, segment: nearest };
  }, [pointerPct, chart, segments]);

  // Mirror the pointer up to the parent (so the map can show a matching dot) and
  // clear it on unmount — the mobile sheet unmounts this component when the user
  // switches to a different panel, which should also drop the map marker.
  useEffect(() => {
    onPointerChange?.(pointer?.segment ?? null);
    return () => onPointerChange?.(null);
  }, [pointer, onPointerChange]);

  function updatePointer(clientX: number) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0) return;
    setPointerPct(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)));
  }

  function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    updatePointer(e.clientX);
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (e.buttons === 0) return;
    updatePointer(e.clientX);
  }

  if (!chart) {
    return (
      <div className="flex items-center justify-center h-24 text-gray-400 text-sm px-4 text-center">
        {t.overview.noData}
      </div>
    );
  }

  return (
    <div className="px-3 py-3">
      {pointer ? (
        <div className="flex items-center justify-between flex-wrap gap-x-2 gap-y-1 px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-100 text-[11px] font-semibold text-gray-700">
          <span className="tabular-nums text-gray-400 font-medium shrink-0">
            {pointer.km.toFixed(1)} {t.overview.km}
          </span>
          <span className="tabular-nums">{Math.round(pointer.segment.weather.temperature)}°C</span>
          {pointer.segment.coordinate.ele !== undefined && (
            <span className="tabular-nums">↑{Math.round(pointer.segment.coordinate.ele)} m</span>
          )}
          <span className="tabular-nums">{pointer.segment.weather.precipitation.toFixed(1)} mm/h</span>
          <span className="tabular-nums whitespace-nowrap">
            {pointer.segment.weather.windSpeed.toFixed(1)} m/s {compassLabel(pointer.segment.weather.windDirection, t)}
          </span>
          <button
            onClick={() => setPointerPct(null)}
            aria-label={t.overview.closePointer}
            className="shrink-0 text-gray-400 active:text-gray-600 font-normal"
          >
            ✕
          </button>
        </div>
      ) : (
        <p className="text-center text-[10px] text-gray-300">{t.overview.tapHint}</p>
      )}

      <div className="flex items-center justify-center flex-wrap gap-x-4 gap-y-1 text-[10px] font-medium text-gray-500 mt-1">
        <LegendItem color="#ef4444" label={t.overview.temperature} />
        <LegendItem color="#3b82f6" label={t.overview.rain} />
        {chart.hasElevation && <LegendItem color="#a8a29e" label={t.overview.elevation} />}
        <WindLegendItem label={t.overview.wind} />
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full h-auto block touch-none mt-2"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      >
        {chart.hasElevation && <path d={chart.elePath} fill="#a8a29e" opacity={0.45} />}

        {chart.rainBars.map((b, i) => (
          <rect key={i} x={b.x} y={b.y} width={b.width} height={CHART_BOTTOM - b.y} fill="#3b82f6" opacity={0.45} />
        ))}

        <polyline
          points={chart.tempPoints}
          fill="none"
          stroke="#ef4444"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {chart.arrows.map((a, i) => (
          <g key={i} transform={`translate(${a.x}, ${ARROW_ROW_H / 2}) rotate(${a.angle})`}>
            <path
              d="M -6,0 L 5,0 M 5,0 L 1,-4 M 5,0 L 1,4"
              stroke={a.color}
              strokeWidth={1.6}
              fill="none"
              strokeLinecap="round"
            />
          </g>
        ))}

        <line x1={PLOT_LEFT} y1={CHART_BOTTOM} x2={PLOT_RIGHT} y2={CHART_BOTTOM} stroke="#e5e7eb" strokeWidth={1} />
        {chart.ticks.map((km) => (
          <text key={km} x={chart.xOf(km)} y={VIEW_H - 5} fontSize={9} fill="#9ca3af" textAnchor="middle">
            {km}
          </text>
        ))}

        {/* Left axis: temperature (°C) */}
        {chart.tempTicks.map((tick) => (
          <g key={`t${tick.value}`}>
            <line x1={PLOT_LEFT - 5} x2={PLOT_LEFT} y1={tick.y} y2={tick.y} stroke="#fca5a5" strokeWidth={1} />
            <text x={PLOT_LEFT - 7} y={tick.y + 5} fontSize={15} fill="#ef4444" textAnchor="end">
              {tick.value}°
            </text>
          </g>
        ))}

        {/* Right axis: elevation (m) */}
        {chart.eleTicks.map((tick) => (
          <g key={`e${tick.value}`}>
            <line x1={PLOT_RIGHT} x2={PLOT_RIGHT + 5} y1={tick.y} y2={tick.y} stroke="#c4c0ba" strokeWidth={1} />
            <text x={PLOT_RIGHT + 7} y={tick.y + 5} fontSize={15} fill="#a8a29e" textAnchor="start">
              {tick.value}m
            </text>
          </g>
        ))}

        {pointer && (
          <g pointerEvents="none">
            <line
              x1={chart.xOf(pointer.km)}
              x2={chart.xOf(pointer.km)}
              y1={0}
              y2={CHART_BOTTOM}
              stroke="#111827"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <circle
              cx={chart.xOf(pointer.km)}
              cy={chart.yTemp(pointer.segment.weather.temperature)}
              r={3.5}
              fill="#ef4444"
              stroke="white"
              strokeWidth={1.5}
            />
          </g>
        )}
      </svg>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

// Wind arrows are colored per-segment (tail/cross/head), so its legend entry
// shows all three dots instead of one — a single color wouldn't explain them.
function WindLegendItem({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="flex gap-0.5">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#10b981" }} />
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#f59e0b" }} />
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#ef4444" }} />
      </span>
      {label}
    </span>
  );
}
