"use client";

import { useRef, useState } from "react";
import { formatCount } from "@/lib/format";
import type { DailyPoint, RankedRow } from "@/lib/vercel-analytics";

// Validated pair (dataviz skill, scripts/validate_palette.js) — CVD ΔE 23.1,
// normal-vision ΔE 24.0 on a white surface. "Pageviews" reuses this aqua
// everywhere the metric appears (trend line, ranked bars) so color stays
// tied to the entity, not its position in a given chart.
const COLOR_PAGEVIEWS = "#1baf7a";
const COLOR_VISITORS = "#2a78d6";

const VIEW_W = 600;
const VIEW_H = 200;
const PLOT_LEFT = 40;
const PLOT_RIGHT = VIEW_W - 12;
const PLOT_TOP = 14;
const PLOT_BOTTOM = VIEW_H - 26;

function niceMax(v: number): number {
  if (v <= 0) return 10;
  const exp = Math.floor(Math.log10(v));
  const base = Math.pow(10, exp);
  const norm = v / base;
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return step * base;
}

function formatDayLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function TrendChart({ data }: { data: DailyPoint[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (data.length === 0) {
    return <EmptyState label="No traffic data for this range yet." />;
  }

  const maxValue = niceMax(Math.max(...data.map((d) => Math.max(d.pageviews, d.visitors))));
  const yTicks = [0, maxValue / 2, maxValue];

  const xFor = (i: number) =>
    data.length === 1
      ? (PLOT_LEFT + PLOT_RIGHT) / 2
      : PLOT_LEFT + (i / (data.length - 1)) * (PLOT_RIGHT - PLOT_LEFT);
  const yFor = (v: number) => PLOT_BOTTOM - (v / maxValue) * (PLOT_BOTTOM - PLOT_TOP);

  const pageviewsPath = data.map((d, i) => `${i === 0 ? "M" : "L"}${xFor(i)},${yFor(d.pageviews)}`).join(" ");
  const visitorsPath = data.map((d, i) => `${i === 0 ? "M" : "L"}${xFor(i)},${yFor(d.visitors)}`).join(" ");

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const relX = ((e.clientX - rect.left) / rect.width) * VIEW_W;
    const fraction = (relX - PLOT_LEFT) / (PLOT_RIGHT - PLOT_LEFT);
    const idx = Math.round(fraction * (data.length - 1));
    setHoverIndex(Math.min(data.length - 1, Math.max(0, idx)));
  }

  const hovered = hoverIndex !== null ? data[hoverIndex] : null;
  const tooltipLeftPct = hoverIndex !== null ? (xFor(hoverIndex) / VIEW_W) * 100 : 0;
  const tooltipAlign = tooltipLeftPct > 70 ? "right" : tooltipLeftPct < 15 ? "left" : "center";

  return (
    <div>
      {/* Legend — always present for 2+ series, per dataviz skill */}
      <div className="flex items-center gap-4 mb-2 text-xs font-medium text-gray-600">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLOR_PAGEVIEWS }} />
          Pageviews
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLOR_VISITORS }} />
          Visitors
        </span>
      </div>

      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="w-full h-auto touch-none"
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverIndex(null)}
        >
          {/* Gridlines */}
          {yTicks.map((t) => (
            <g key={t}>
              <line x1={PLOT_LEFT} x2={PLOT_RIGHT} y1={yFor(t)} y2={yFor(t)} stroke="#e5e7eb" strokeWidth={1} />
              <text x={PLOT_LEFT - 6} y={yFor(t)} textAnchor="end" dominantBaseline="middle" fontSize={9} fill="#9ca3af">
                {formatCount(Math.round(t))}
              </text>
            </g>
          ))}

          {/* X-axis: first / middle / last date only, to avoid label clutter */}
          {[0, Math.floor((data.length - 1) / 2), data.length - 1]
            .filter((v, i, arr) => arr.indexOf(v) === i)
            .map((i) => (
              <text key={i} x={xFor(i)} y={VIEW_H - 8} textAnchor="middle" fontSize={9} fill="#9ca3af">
                {formatDayLabel(data[i].date)}
              </text>
            ))}

          {/* Crosshair */}
          {hoverIndex !== null && (
            <line
              x1={xFor(hoverIndex)}
              x2={xFor(hoverIndex)}
              y1={PLOT_TOP}
              y2={PLOT_BOTTOM}
              stroke="#c3c2b7"
              strokeWidth={1}
            />
          )}

          <path d={pageviewsPath} fill="none" stroke={COLOR_PAGEVIEWS} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          <path d={visitorsPath} fill="none" stroke={COLOR_VISITORS} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {hovered && hoverIndex !== null && (
            <>
              <circle cx={xFor(hoverIndex)} cy={yFor(hovered.pageviews)} r={4} fill={COLOR_PAGEVIEWS} stroke="#fff" strokeWidth={2} />
              <circle cx={xFor(hoverIndex)} cy={yFor(hovered.visitors)} r={4} fill={COLOR_VISITORS} stroke="#fff" strokeWidth={2} />
            </>
          )}
        </svg>

        {hovered && (
          <div
            className="absolute top-0 bg-white border border-gray-200 rounded-lg shadow-lg px-2.5 py-1.5 text-xs pointer-events-none"
            style={{
              left: `${tooltipLeftPct}%`,
              transform:
                tooltipAlign === "center" ? "translateX(-50%)" : tooltipAlign === "right" ? "translateX(-100%)" : "translateX(0)",
            }}
          >
            <div className="font-semibold text-gray-900 mb-0.5">{formatDayLabel(hovered.date)}</div>
            <div className="flex items-center gap-1.5 text-gray-700">
              <span className="inline-block w-2 h-0.5 rounded-full" style={{ backgroundColor: COLOR_PAGEVIEWS }} />
              <span className="font-semibold tabular-nums">{hovered.pageviews.toLocaleString("en-US")}</span> pageviews
            </div>
            <div className="flex items-center gap-1.5 text-gray-700">
              <span className="inline-block w-2 h-0.5 rounded-full" style={{ backgroundColor: COLOR_VISITORS }} />
              <span className="font-semibold tabular-nums">{hovered.visitors.toLocaleString("en-US")}</span> visitors
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function RankedBarList({ rows, metric = "pageviews" }: { rows: RankedRow[]; metric?: "pageviews" | "visitors" }) {
  if (rows.length === 0) {
    return <EmptyState label="No data for this range yet." />;
  }
  const max = Math.max(...rows.map((r) => r[metric]), 1);

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-3 rounded-lg px-1.5 py-1 hover:bg-gray-50 transition-colors">
          <span className="w-28 sm:w-36 shrink-0 text-xs text-gray-700 truncate" title={row.label}>
            {row.label}
          </span>
          <div className="flex-1 h-2 rounded-full bg-gray-100 relative overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ width: `${(row[metric] / max) * 100}%`, backgroundColor: COLOR_PAGEVIEWS }}
            />
          </div>
          <span className="w-12 shrink-0 text-right text-xs font-semibold text-gray-900 tabular-nums">
            {formatCount(row[metric])}
          </span>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <p className="text-sm text-gray-400 py-6 text-center">{label}</p>;
}
