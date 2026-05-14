"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import type { Route, WeatherSegment, SportType } from "@/types";
import { classifySkiConditions } from "@/lib/ski-conditions";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

interface Props {
  route: Route;
  segments: WeatherSegment[];
  activeSegmentIndex: number | null;
  sport?: SportType;
  onSegmentClick?: (index: number) => void;
}

export function RouteMap({
  route,
  segments,
  activeSegmentIndex,
  sport = "cycling",
  onSegmentClick,
}: Props) {
  const containerRef   = useRef<HTMLDivElement>(null);
  const mapRef         = useRef<mapboxgl.Map | null>(null);
  const popupRef       = useRef<mapboxgl.Popup | null>(null);
  const windMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const wxMarkersRef   = useRef<mapboxgl.Marker[]>([]);
  // Store the latest segments/sport so the map-load callback can use them
  const pendingRef     = useRef<(() => void) | null>(null);
  const mapReadyRef    = useRef(false);

  // ── Initialise map once ────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [route.coordinates[0].lon, route.coordinates[0].lat],
      zoom: 11,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-left");
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    map.on("load", () => {
      mapReadyRef.current = true;
      addRouteLayers(map, route);
      // Apply any segments that arrived before the map was ready
      if (pendingRef.current) {
        pendingRef.current();
        pendingRef.current = null;
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
      mapReadyRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Update weather overlays when segments / sport changes ──────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const apply = () => {
      console.log("[RouteMap] applying", segments.length, "segments, mapReady:", mapReadyRef.current);
      updateWeatherLine(map, segments, sport);
      updatePrecipitationLine(map, segments);
      updateWindMarkers(map, segments, windMarkersRef, onSegmentClick);
      updateWeatherMarkers(map, segments, wxMarkersRef, sport, onSegmentClick);
    };

    if (!mapReadyRef.current) {
      console.log("[RouteMap] map not ready, queuing", segments.length, "segments");
      pendingRef.current = apply;
      return;
    }

    apply();
  }, [segments, sport, onSegmentClick]);

  // ── Fly + popup on active segment ──────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current || activeSegmentIndex === null) return;
    const seg = segments[activeSegmentIndex];
    if (!seg) return;

    map.flyTo({ center: [seg.coordinate.lon, seg.coordinate.lat], zoom: Math.max(map.getZoom(), 13), duration: 500 });

    popupRef.current?.remove();
    popupRef.current = new mapboxgl.Popup({ closeButton: false, offset: 14 })
      .setLngLat([seg.coordinate.lon, seg.coordinate.lat])
      .setHTML(buildPopupHtml(seg, sport))
      .addTo(map);
  }, [activeSegmentIndex, segments, sport]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
    />
  );
}

// ─── Route layers ─────────────────────────────────────────────────────────────

function addRouteLayers(map: mapboxgl.Map, route: Route) {
  const coords = route.coordinates.map((c) => [c.lon, c.lat] as [number, number]);

  map.addSource("route-base", {
    type: "geojson",
    data: { type: "Feature", geometry: { type: "LineString", coordinates: coords }, properties: {} },
  });
  map.addLayer({
    id: "route-base", type: "line", source: "route-base",
    layout: { "line-join": "round", "line-cap": "round" },
    paint: { "line-color": "#94a3b8", "line-width": 6, "line-opacity": 0.45 },
  });

  map.addSource("route-weather", { type: "geojson", data: empty() });
  map.addLayer({
    id: "route-weather", type: "line", source: "route-weather",
    layout: { "line-join": "round", "line-cap": "round" },
    paint: {
      "line-color": ["get", "color"],
      "line-width": ["interpolate", ["linear"], ["zoom"], 8, 5, 14, 10],
      "line-opacity": 1,
    },
  });

  map.addSource("route-rain", { type: "geojson", data: empty() });
  map.addLayer({
    id: "route-rain", type: "line", source: "route-rain",
    layout: { "line-join": "round", "line-cap": "round" },
    paint: {
      "line-color": "#3b82f6",
      "line-width": ["interpolate", ["linear"], ["zoom"], 8, 8, 14, 14],
      "line-opacity": ["get", "opacity"],
    },
  });

  const bounds = coords.reduce((b, c) => b.extend(c), new mapboxgl.LngLatBounds(coords[0], coords[0]));
  map.fitBounds(bounds, { padding: 48, duration: 800 });
}

function updateWeatherLine(map: mapboxgl.Map, segments: WeatherSegment[], sport: SportType) {
  const src = map.getSource("route-weather") as mapboxgl.GeoJSONSource | undefined;
  if (!src || !segments.length) return;
  src.setData({
    type: "FeatureCollection",
    features: segments.map((seg, i) => {
      const next = segments[i + 1];
      const end = next ?? seg;
      const color = sport === "skiing" ? classifySkiConditions(seg.weather).color : seg.color;
      return {
        type: "Feature",
        geometry: { type: "LineString", coordinates: [[seg.coordinate.lon, seg.coordinate.lat], [end.coordinate.lon, end.coordinate.lat]] },
        properties: { color },
      };
    }),
  });
}

function updatePrecipitationLine(map: mapboxgl.Map, segments: WeatherSegment[]) {
  const src = map.getSource("route-rain") as mapboxgl.GeoJSONSource | undefined;
  if (!src) return;
  src.setData({
    type: "FeatureCollection",
    features: segments
      .filter((s) => s.weather.precipitation > 0)
      .map((seg, _, arr) => {
        const i = segments.indexOf(seg);
        const next = segments[i + 1] ?? seg;
        const opacity = Math.min(0.15 + seg.weather.precipitation * 0.12, 0.7);
        return {
          type: "Feature" as const,
          geometry: { type: "LineString" as const, coordinates: [[seg.coordinate.lon, seg.coordinate.lat], [next.coordinate.lon, next.coordinate.lat]] },
          properties: { opacity },
        };
      }),
  });
}

// ─── Weather icon markers ─────────────────────────────────────────────────────

function updateWeatherMarkers(
  map: mapboxgl.Map,
  segments: WeatherSegment[],
  ref: React.MutableRefObject<mapboxgl.Marker[]>,
  sport: SportType,
  onSegmentClick?: (i: number) => void
) {
  ref.current.forEach((m) => m.remove());
  ref.current = [];
  if (!segments.length) return;

  // One marker per ~2.5 km
  let lastKm = -2.5;
  segments.forEach((seg) => {
    if (seg.endKm - lastKm < 2.5) return;
    lastKm = seg.endKm;

    const el = makeWeatherEl(seg, sport);
    if (onSegmentClick) el.addEventListener("click", () => onSegmentClick(seg.index));

    ref.current.push(
      new mapboxgl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([seg.coordinate.lon, seg.coordinate.lat])
        .addTo(map)
    );
  });
}

function makeWeatherEl(seg: WeatherSegment, sport: SportType): HTMLElement {
  const wrap = document.createElement("div");
  wrap.style.cssText = "cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:0;pointer-events:auto";

  const pill = document.createElement("div");
  pill.style.cssText = [
    "background:white",
    "border:1.5px solid rgba(0,0,0,0.15)",
    "border-radius:999px",
    "padding:4px 9px",
    "display:flex",
    "align-items:center",
    "gap:4px",
    "font-size:13px",
    "font-weight:700",
    "font-family:system-ui,sans-serif",
    "white-space:nowrap",
    "box-shadow:0 2px 8px rgba(0,0,0,0.18)",
    "line-height:1",
  ].join(";");

  const icon  = weatherEmoji(seg.weather.symbolCode, seg.weather.temperature);
  const temp  = `${Math.round(seg.weather.temperature)}°`;
  const rain  = seg.weather.precipitation > 0
    ? `<span style="color:#2563eb;font-size:11px"> ${seg.weather.precipitation.toFixed(1)}mm</span>` : "";

  if (sport === "skiing") {
    const ski = classifySkiConditions(seg.weather);
    pill.innerHTML = `<span style="font-size:16px">${icon}</span><span style="color:#0f172a">${temp}</span><span style="color:${ski.color};font-size:10px;font-weight:600">${ski.label.split(" ")[0]}</span>${rain}`;
  } else {
    pill.innerHTML = `<span style="font-size:16px">${icon}</span><span style="color:#0f172a">${temp}</span>${rain}`;
  }

  // Connector stem
  const stem = document.createElement("div");
  stem.style.cssText = "width:2px;height:10px;background:rgba(0,0,0,0.25);border-radius:0 0 2px 2px";

  wrap.appendChild(pill);
  wrap.appendChild(stem);
  return wrap;
}

// ─── Wind arrow markers (Windy-inspired) ─────────────────────────────────────

function updateWindMarkers(
  map: mapboxgl.Map,
  segments: WeatherSegment[],
  ref: React.MutableRefObject<mapboxgl.Marker[]>,
  onSegmentClick?: (i: number) => void
) {
  ref.current.forEach((m) => m.remove());
  ref.current = [];
  if (!segments.length) return;

  const field = buildWindField(segments);

  field.forEach(({ lat, lon, seg }) => {
    const el = makeWindyArrowEl(seg);
    if (onSegmentClick) el.addEventListener("click", () => onSegmentClick(seg.index));

    ref.current.push(
      new mapboxgl.Marker({ element: el, anchor: "center" })
        .setLngLat([lon, lat])
        .addTo(map)
    );
  });
}

/** Build a regular grid of wind arrow positions within BUFFER_KM of the route. */
function buildWindField(
  segments: WeatherSegment[]
): Array<{ lat: number; lon: number; seg: WeatherSegment }> {
  const BUFFER_KM = 1.2;
  const STEP_KM   = 0.75;

  const lats  = segments.map((s) => s.coordinate.lat);
  const lons  = segments.map((s) => s.coordinate.lon);
  const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;

  const stepLat = STEP_KM / 111;
  const stepLon = STEP_KM / (111 * Math.cos((midLat * Math.PI) / 180));
  const padLat  = BUFFER_KM / 111;
  const padLon  = BUFFER_KM / (111 * Math.cos((midLat * Math.PI) / 180));

  const minLat = Math.min(...lats) - padLat;
  const maxLat = Math.max(...lats) + padLat;
  const minLon = Math.min(...lons) - padLon;
  const maxLon = Math.max(...lons) + padLon;

  const points: Array<{ lat: number; lon: number; seg: WeatherSegment }> = [];

  for (let lat = minLat; lat <= maxLat; lat += stepLat) {
    for (let lon = minLon; lon <= maxLon; lon += stepLon) {
      // Nearest segment by approx distance
      let nearestSeg = segments[0];
      let minDist    = Infinity;
      for (const seg of segments) {
        const dlat = lat - seg.coordinate.lat;
        const dlon = (lon - seg.coordinate.lon) * Math.cos((lat * Math.PI) / 180);
        const d    = dlat * dlat + dlon * dlon;
        if (d < minDist) { minDist = d; nearestSeg = seg; }
      }

      // Only include if within BUFFER_KM of the nearest route point
      const distKm = Math.sqrt(minDist) * 111;
      if (distKm <= BUFFER_KM) points.push({ lat, lon, seg: nearestSeg });
    }
  }

  return points;
}

function makeWindyArrowEl(seg: WeatherSegment): HTMLElement {
  const speed     = seg.weather.windSpeed;
  const direction = (seg.weather.windDirection + 180) % 360;
  const color     = windClassColor(seg.windClass);
  const SIZE      = 22;

  const el = document.createElement("div");
  el.style.width   = `${SIZE}px`;
  el.style.height  = `${SIZE}px`;
  el.style.cursor  = "pointer";
  el.style.opacity = "0.82";
  el.title = `${speed.toFixed(1)} m/s`;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width",   `${SIZE}`);
  svg.setAttribute("height",  `${SIZE}`);
  svg.setAttribute("viewBox", "0 0 20 20");
  svg.style.transform  = `rotate(${direction}deg)`;
  svg.style.overflow   = "visible";

  // White halo for contrast against map
  const halo = document.createElementNS("http://www.w3.org/2000/svg", "path");
  halo.setAttribute("d", "M10,17 L10,4 M6,8 L10,4 L14,8");
  halo.setAttribute("stroke", "rgba(255,255,255,0.85)");
  halo.setAttribute("stroke-width", "3.5");
  halo.setAttribute("stroke-linecap", "round");
  halo.setAttribute("stroke-linejoin", "round");
  halo.setAttribute("fill", "none");
  svg.appendChild(halo);

  // Colored arrow
  const arrow = document.createElementNS("http://www.w3.org/2000/svg", "path");
  arrow.setAttribute("d", "M10,17 L10,4 M6,8 L10,4 L14,8");
  arrow.setAttribute("stroke", color);
  arrow.setAttribute("stroke-width", "2");
  arrow.setAttribute("stroke-linecap", "round");
  arrow.setAttribute("stroke-linejoin", "round");
  arrow.setAttribute("fill", "none");
  svg.appendChild(arrow);

  el.appendChild(svg);
  return el;
}

/** Arrow colour by wind class (tailwind = green, crosswind = amber, headwind = red). */
function windClassColor(wc: WeatherSegment["windClass"]): string {
  if (wc === "tailwind")  return "#22c55e"; // green
  if (wc === "crosswind") return "#f59e0b"; // amber
  return "#ef4444";                          // red  (headwind)
}

/** Windy speed colour scale (m/s). */
function windSpeedColor(ms: number): string {
  if (ms < 1)  return "#b0e0ff"; // near calm – light blue
  if (ms < 3)  return "#4fc3f7"; // gentle – sky blue
  if (ms < 6)  return "#29b09d"; // light – teal
  if (ms < 9)  return "#a8d830"; // moderate – yellow-green
  if (ms < 12) return "#f5c518"; // fresh – amber
  if (ms < 17) return "#f07800"; // strong – orange
  if (ms < 22) return "#e02020"; // gale – red
  return "#9b1dca";               // storm – purple
}

// ─── Popup ────────────────────────────────────────────────────────────────────

function buildPopupHtml(seg: WeatherSegment, sport: SportType): string {
  const icon = weatherEmoji(seg.weather.symbolCode, seg.weather.temperature);
  const ski  = sport === "skiing" ? classifySkiConditions(seg.weather) : null;
  const windLabel = seg.windClass === "tailwind" ? "Medvind" : seg.windClass === "crosswind" ? "Sidevind" : "Motvind";

  return `<div style="font-family:system-ui,sans-serif;font-size:13px;line-height:1.7;color:#1e293b;min-width:155px">
    <div style="font-weight:700;margin-bottom:4px">${seg.startKm.toFixed(1)}–${seg.endKm.toFixed(1)} km</div>
    <div>${icon} <strong>${seg.weather.temperature.toFixed(1)}°C</strong>${seg.weather.feelsLike !== undefined && seg.weather.feelsLike !== seg.weather.temperature ? ` <span style="color:#64748b;font-size:11px">(føles ${seg.weather.feelsLike}°)</span>` : ""}</div>
    ${ski
      ? `<div style="color:${ski.color};font-weight:600">${ski.label}</div><div style="color:#64748b;font-size:11px">${ski.waxHint}</div>`
      : `<div style="color:${seg.color};font-weight:600">💨 ${windLabel} · ${seg.weather.windSpeed.toFixed(1)} m/s</div>`}
    ${seg.weather.precipitation > 0 ? `<div style="color:#2563eb">🌧️ ${seg.weather.precipitation.toFixed(1)} mm/t</div>` : ""}
    <div style="color:#64748b;font-size:11px">☁️ ${Math.round(seg.weather.cloudCover)}% skydekke</div>
  </div>`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function weatherEmoji(code: string, t: number): string {
  const c = code.toLowerCase();
  if (c.includes("heavyrain"))     return "⛈️";
  if (c.includes("rain"))          return "🌧️";
  if (c.includes("snow"))          return "❄️";
  if (c.includes("sleet"))         return "🌨️";
  if (c.includes("fog"))           return "🌫️";
  if (c.includes("thunder"))       return "⛈️";
  if (c.includes("clearsky"))      return t < 0 ? "🌙" : "☀️";
  if (c.includes("fair"))          return "🌤️";
  if (c.includes("partlycloudy"))  return "⛅";
  return "☁️";
}

function empty(): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features: [] };
}
