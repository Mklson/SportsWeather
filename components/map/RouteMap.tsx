"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import type { Route, WeatherSegment, SportType, StravaSegment } from "@/types";
import { classifySkiConditions } from "@/lib/ski-conditions";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

// ─── Basemap ──────────────────────────────────────────────────────────────────

type Basemap = "outdoors" | "satellite";

function buildStyle(basemap: Basemap): mapboxgl.Style | string {
  if (basemap === "satellite") {
    return {
      version: 8,
      glyphs: "mapbox://fonts/mapbox/{fontstack}/{range}.pbf",
      sources: { sat: { type: "raster", url: "mapbox://mapbox.satellite", tileSize: 256 } },
      layers: [{ id: "bg", type: "raster", source: "sat" }],
    } as mapboxgl.Style;
  }
  return "mapbox://styles/mapbox/outdoors-v12";
}

function addTerrain(map: mapboxgl.Map) {
  try {
    if (!map.getSource("terrain-dem")) {
      map.addSource("terrain-dem", {
        type: "raster-dem",
        url: "mapbox://mapbox.mapbox-terrain-dem-v1",
        tileSize: 512,
        maxzoom: 14,
      });
    }
    map.setTerrain({ source: "terrain-dem", exaggeration: 1.5 });
    if (!map.getLayer("sky")) {
      map.addLayer({
        id: "sky", type: "sky",
        paint: { "sky-type": "atmosphere", "sky-atmosphere-sun": [0, 90], "sky-atmosphere-sun-intensity": 15 },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
    }
  } catch (e) {
    console.warn("[RouteMap] terrain/sky setup failed:", e);
  }
}

interface Props {
  route: Route;
  segments: WeatherSegment[];
  activeSegmentIndex: number | null;
  sport?: SportType;
  onSegmentClick?: (index: number) => void;
  stravaSegments?: StravaSegment[];
  activeStravaSegmentId?: number | null;
  onStravaSegmentClick?: (id: number) => void;
  onBoundsChange?: (bounds: { west: number; south: number; east: number; north: number }) => void;
  reversed?: boolean;
  showRoute?: boolean;
}

export function RouteMap({
  route,
  segments,
  activeSegmentIndex,
  sport = "cycling",
  onSegmentClick,
  stravaSegments,
  activeStravaSegmentId,
  onStravaSegmentClick,
  onBoundsChange,
  reversed = false,
  showRoute = true,
}: Props) {
  const [basemap, setBasemap] = useState<Basemap>("outdoors");
  const [terrain3d, setTerrain3d] = useState(false);

  const containerRef       = useRef<HTMLDivElement>(null);
  const mapRef             = useRef<mapboxgl.Map | null>(null);
  const popupRef           = useRef<mapboxgl.Popup | null>(null);
  const windMarkersRef     = useRef<mapboxgl.Marker[]>([]);
  const wxMarkersRef       = useRef<mapboxgl.Marker[]>([]);
  const stravaMarkersRef   = useRef<mapboxgl.Marker[]>([]);
  const pendingRef         = useRef<(() => void) | null>(null);

  // Latest-value refs so style-reload callbacks see current props without deps
  const latestSegmentsRef         = useRef(segments);
  const latestSportRef            = useRef(sport);
  const latestReversedRef         = useRef(reversed);
  const latestStravaRef           = useRef(stravaSegments);
  const latestActiveStravaIdRef   = useRef(activeStravaSegmentId);
  const latestOnSegmentClickRef   = useRef(onSegmentClick);
  const latestOnStravaClickRef    = useRef(onStravaSegmentClick);
  const latestOnBoundsChangeRef   = useRef(onBoundsChange);
  const latestTerrain3dRef          = useRef(false);
  const latestShowRouteRef          = useRef(showRoute);
  latestSegmentsRef.current         = segments;
  latestSportRef.current            = sport;
  latestReversedRef.current         = reversed;
  latestStravaRef.current           = stravaSegments;
  latestActiveStravaIdRef.current   = activeStravaSegmentId;
  latestOnSegmentClickRef.current   = onSegmentClick;
  latestOnStravaClickRef.current    = onStravaSegmentClick;
  latestOnBoundsChangeRef.current   = onBoundsChange;
  latestTerrain3dRef.current        = terrain3d;
  latestShowRouteRef.current        = showRoute;
  const mapReadyRef    = useRef(false);

  // ── Initialise (or re-initialise) map when route.id changes ──────────
  // useLayoutEffect so cleanup (map.remove) fires synchronously before paint,
  // preventing the old map's canvas from overlapping the new one even briefly.
  useLayoutEffect(() => {
    if (!containerRef.current) return;

    // Destroy any existing map so a new route always gets a clean canvas
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      mapReadyRef.current = false;
      [windMarkersRef, wxMarkersRef, stravaMarkersRef].forEach((r) => {
        r.current.forEach((m) => m.remove());
        r.current = [];
      });
    }
    // Remove any orphaned Mapbox canvas that map.remove() may have missed
    containerRef.current.querySelectorAll(".mapboxgl-canvas-container").forEach((el) => el.remove());

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: buildStyle("outdoors"),
      center: [route.coordinates[0].lon, route.coordinates[0].lat],
      zoom: 11,
      pitch: 0,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-left");
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    map.on("moveend", () => {
      const b = map.getBounds();
      if (b) latestOnBoundsChangeRef.current?.({
        west: b.getWest(), south: b.getSouth(),
        east: b.getEast(), north: b.getNorth(),
      });
    });

    map.on("load", () => {
      if (mapRef.current !== map) return; // Component unmounted before load fired
      mapReadyRef.current = true;
      loadDirectionArrowImage(map, () => {
        if (mapRef.current !== map) return;
        if (latestShowRouteRef.current) addRouteLayers(map, route);
        addStravaSegmentLayers(map);
        if (pendingRef.current) {
          pendingRef.current();
          pendingRef.current = null;
        }
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
      mapReadyRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.id]);

  // ── Update weather overlays when segments / sport changes ──────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const apply = () => {
      updateWindMarkers(map, segments, windMarkersRef, onSegmentClick);
      updateWeatherMarkers(map, segments, wxMarkersRef, sport, onSegmentClick);
    };

    if (!mapReadyRef.current) {
      pendingRef.current = apply;
      return;
    }

    apply();
  }, [segments, sport, onSegmentClick]);

  // ── Show/hide route and apply direction ────────────────────────────────
  // Uses removeLayer/removeSource so the route truly ceases to exist on the map,
  // avoiding any Mapbox visibility-toggle or opacity-caching quirks.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) return;

    if (!showRoute) {
      for (const id of ["route-direction-arrows", "route-base", "route-casing"]) {
        if (map.getLayer(id)) map.removeLayer(id);
      }
      if (map.getSource("route-base")) map.removeSource("route-base");
      return;
    }

    const src = map.getSource("route-base") as mapboxgl.GeoJSONSource | undefined;
    const coords = (reversed ? [...route.coordinates].reverse() : route.coordinates)
      .map((c) => [c.lon, c.lat] as [number, number]);

    if (src) {
      src.setData({ type: "Feature", geometry: { type: "LineString", coordinates: coords }, properties: {} });
    } else {
      // Source was removed (restoring after clear) — re-add without panning
      addRouteLayers(map, route, false);
      if (reversed) {
        const s = map.getSource("route-base") as mapboxgl.GeoJSONSource | undefined;
        if (s) s.setData({ type: "Feature", geometry: { type: "LineString", coordinates: coords }, properties: {} });
      }
    }
  }, [showRoute, reversed, route.coordinates]);

  // ── Swap basemap ────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) return;

    mapReadyRef.current = false;
    // Remove all markers – they are DOM nodes and survive setStyle()
    [windMarkersRef, wxMarkersRef, stravaMarkersRef].forEach((r) => {
      r.current.forEach((m) => m.remove());
      r.current = [];
    });

    map.setStyle(buildStyle(basemap));
    map.once("style.load", () => {
      if (latestTerrain3dRef.current) addTerrain(map);
      mapReadyRef.current = true;
      loadDirectionArrowImage(map, () => {
        if (latestShowRouteRef.current) {
          addRouteLayers(map, route, false); // basemap swap — keep current viewport
          if (latestReversedRef.current) {
            const src = map.getSource("route-base") as mapboxgl.GeoJSONSource | undefined;
            if (src) {
              const coords = [...route.coordinates].reverse().map((c) => [c.lon, c.lat] as [number, number]);
              src.setData({ type: "Feature", geometry: { type: "LineString", coordinates: coords }, properties: {} });
            }
          }
        }
        addStravaSegmentLayers(map);
        updateWindMarkers(map, latestSegmentsRef.current, windMarkersRef, latestOnSegmentClickRef.current);
        updateWeatherMarkers(map, latestSegmentsRef.current, wxMarkersRef, latestSportRef.current, latestOnSegmentClickRef.current);
        updateStravaSegments(map, latestStravaRef.current ?? [], latestActiveStravaIdRef.current ?? null, stravaMarkersRef, latestOnStravaClickRef.current);
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basemap]);

  // ── Toggle 3D terrain ──────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) return;
    if (terrain3d) {
      addTerrain(map);
      map.easeTo({ pitch: 50, duration: 600 });
    } else {
      try { map.setTerrain(null); } catch { /* ok */ }
      map.easeTo({ pitch: 0, duration: 600 });
    }
  }, [terrain3d]);

  // ── Update Strava segments layer ───────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) return;
    updateStravaSegments(map, stravaSegments ?? [], activeStravaSegmentId ?? null, stravaMarkersRef, onStravaSegmentClick);
  }, [stravaSegments, activeStravaSegmentId, onStravaSegmentClick]);

  // ── Fit map to active Strava segment, or zoom back to full route ───────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) return;

    if (activeStravaSegmentId === null) {
      const coords = route.coordinates.map((c) => [c.lon, c.lat] as [number, number]);
      if (!coords.length) return;
      const bounds = coords.reduce((b, c) => b.extend(c), new mapboxgl.LngLatBounds(coords[0], coords[0]));
      map.fitBounds(bounds, { padding: 48, duration: 600 });
      return;
    }

    const seg = (stravaSegments ?? []).find((s) => s.id === activeStravaSegmentId);
    if (!seg || !seg.coordinates.length) return;

    const bounds = seg.coordinates.reduce(
      (b, c) => b.extend([c.lon, c.lat] as [number, number]),
      new mapboxgl.LngLatBounds(
        [seg.coordinates[0].lon, seg.coordinates[0].lat],
        [seg.coordinates[0].lon, seg.coordinates[0].lat]
      )
    );
    map.fitBounds(bounds, { padding: 80, duration: 600, maxZoom: 16 });
  }, [activeStravaSegmentId, stravaSegments, route.coordinates]);

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

  const basemapOptions: { key: Basemap; label: string }[] = [
    { key: "outdoors",  label: "Kart"  },
    { key: "satellite", label: "🛰"    },
  ];

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1">
        <div className="flex rounded-lg overflow-hidden shadow border border-gray-200 text-xs font-semibold">
          {basemapOptions.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setBasemap(key)}
              className={`px-2.5 py-1.5 transition-colors ${
                basemap === key ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
              title={key === "outdoors" ? "Mapbox Outdoors" : "Satellittbilde"}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setTerrain3d((v) => !v)}
          className={`rounded-lg shadow border text-xs font-semibold px-2.5 py-1.5 transition-colors ${
            terrain3d
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
          }`}
          title="3D terreng"
        >
          3D
        </button>
      </div>
    </div>
  );
}

// ─── Strava segment layers ────────────────────────────────────────────────────

function addStravaSegmentLayers(map: mapboxgl.Map) {
  map.addSource("strava-segments", { type: "geojson", data: empty() });
  map.addLayer({
    id: "strava-segments-bg", type: "line", source: "strava-segments",
    layout: { "line-join": "round", "line-cap": "round" },
    paint: { "line-color": "#fff", "line-width": 10, "line-opacity": 0.5 },
  });
  map.addLayer({
    id: "strava-segments-line", type: "line", source: "strava-segments",
    layout: { "line-join": "round", "line-cap": "round" },
    paint: {
      "line-color": ["case", ["get", "active"], "#f97316", "#1e3a8a"],
      "line-width": ["case", ["get", "active"], 6, 4],
      "line-opacity": 0.9,
    },
  });
}

function updateStravaSegments(
  map: mapboxgl.Map,
  segments: StravaSegment[],
  activeId: number | null,
  markersRef: React.MutableRefObject<mapboxgl.Marker[]>,
  _onClick?: (id: number) => void
) {
  const src = map.getSource("strava-segments") as mapboxgl.GeoJSONSource | undefined;
  if (!src) return;

  markersRef.current.forEach((m) => m.remove());
  markersRef.current = [];

  src.setData(segments.length ? {
    type: "FeatureCollection",
    features: segments.map((seg) => ({
      type: "Feature" as const,
      geometry: {
        type: "LineString" as const,
        coordinates: seg.coordinates.map((c) => [c.lon, c.lat]),
      },
      properties: { id: seg.id, active: seg.id === activeId },
    })),
  } : empty());
}

// ─── Direction arrow image ────────────────────────────────────────────────────

function loadDirectionArrowImage(map: mapboxgl.Map, onReady: () => void) {
  // Arrow must point RIGHT — Mapbox aligns the icon's X+ axis with line direction
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <path d="M22 12 L8 19 L11.5 12 L8 5 Z" fill="white" stroke="white" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M22 12 L8 19 L11.5 12 L8 5 Z" fill="#3b82f6"/>
  </svg>`;
  const img = new Image(24, 24);
  img.onload = () => {
    if (!map.hasImage("direction-arrow")) map.addImage("direction-arrow", img);
    onReady();
  };
  img.onerror = onReady;
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// ─── Route layers ─────────────────────────────────────────────────────────────

function setRouteLayerVisibility(map: mapboxgl.Map, visible: boolean) {
  const vis = visible ? "visible" : "none";
  if (map.getLayer("route-casing")) {
    map.setLayoutProperty("route-casing", "visibility", vis);
    map.setPaintProperty("route-casing", "line-opacity", visible ? 0.8 : 0);
  }
  if (map.getLayer("route-base")) {
    map.setLayoutProperty("route-base", "visibility", vis);
    map.setPaintProperty("route-base", "line-opacity", visible ? 0.9 : 0);
  }
  if (map.getLayer("route-direction-arrows")) {
    map.setLayoutProperty("route-direction-arrows", "visibility", vis);
  }
}

function addRouteLayers(map: mapboxgl.Map, route: Route, fitMap = true) {
  const coords = route.coordinates.map((c) => [c.lon, c.lat] as [number, number]);
  const data: GeoJSON.Feature<GeoJSON.LineString> = {
    type: "Feature",
    geometry: { type: "LineString", coordinates: coords },
    properties: {},
  };

  // Defensive cleanup — remove any stale layers/source from a previous render cycle
  for (const id of ["route-direction-arrows", "route-base", "route-casing"]) {
    if (map.getLayer(id)) map.removeLayer(id);
  }
  if (map.getSource("route-base")) map.removeSource("route-base");

  map.addSource("route-base", { type: "geojson", data });

  // White casing — makes the route visible against any basemap background
  map.addLayer({
    id: "route-casing", type: "line", source: "route-base",
    layout: { "line-join": "round", "line-cap": "round" },
    paint: { "line-color": "#ffffff", "line-width": 10, "line-opacity": 0.8 },
  });

  map.addLayer({
    id: "route-base", type: "line", source: "route-base",
    layout: { "line-join": "round", "line-cap": "round" },
    paint: { "line-color": "#3b82f6", "line-width": 6, "line-opacity": 0.9 },
  });

  // Direction arrows along the route line
  map.addLayer({
    id: "route-direction-arrows",
    type: "symbol",
    source: "route-base",
    layout: {
      "symbol-placement": "line",
      "symbol-spacing": 180,
      "icon-image": "direction-arrow",
      "icon-size": 0.9,
      "icon-rotation-alignment": "map",
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
    },
  });

  if (fitMap) {
    const bounds = coords.reduce((b, c) => b.extend(c), new mapboxgl.LngLatBounds(coords[0], coords[0]));
    map.fitBounds(bounds, { padding: 48, duration: 800 });
  }
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

  const spacingKm = sport === "cycling" ? 5 : 2;
  let lastKm = -spacingKm;
  segments.forEach((seg) => {
    if (seg.endKm - lastKm < spacingKm) return;
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

function pillColors(symbolCode: string, precipitation: number, cloudCover: number): { bg: string; text: string; border: string } {
  const c = symbolCode.toLowerCase();
  if (c.includes("thunder"))       return { bg: "#111827", text: "#fef08a", border: "rgba(254,240,138,0.4)" };
  if (precipitation > 7)           return { bg: "#1f2937", text: "#f3f4f6", border: "rgba(255,255,255,0.12)" };
  if (precipitation > 4)           return { bg: "#374151", text: "#f3f4f6", border: "rgba(255,255,255,0.14)" };
  if (precipitation > 2)           return { bg: "#6b7280", text: "#f9fafb", border: "rgba(255,255,255,0.18)" };
  if (precipitation > 0.5)         return { bg: "#9ca3af", text: "#111827", border: "rgba(0,0,0,0.14)" };
  if (precipitation > 0.1)         return { bg: "#d1d5db", text: "#111827", border: "rgba(0,0,0,0.13)" };
  if (cloudCover > 75)             return { bg: "#e5e7eb", text: "#111827", border: "rgba(0,0,0,0.12)" };
  if (cloudCover > 40)             return { bg: "#f3f4f6", text: "#0f172a", border: "rgba(0,0,0,0.12)" };
  return                                  { bg: "#ffffff", text: "#0f172a", border: "rgba(0,0,0,0.15)" };
}

function makeWeatherEl(seg: WeatherSegment, sport: SportType): HTMLElement {
  const wrap = document.createElement("div");
  wrap.style.cssText = "cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:0;pointer-events:auto";

  const { bg, text, border } = pillColors(seg.weather.symbolCode, seg.weather.precipitation, seg.weather.cloudCover);

  const pill = document.createElement("div");
  pill.style.cssText = [
    `background:${bg}`,
    `border:1.5px solid ${border}`,
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

  const icon = weatherEmoji(seg.weather.symbolCode, seg.weather.temperature);
  const temp = `${Math.round(seg.weather.temperature)}°`;
  const rain = seg.weather.precipitation > 0
    ? `<span style="font-size:11px;opacity:0.85"> ${seg.weather.precipitation.toFixed(1)}mm</span>` : "";

  if (sport === "skiing") {
    const ski = classifySkiConditions(seg.weather);
    pill.innerHTML = `<span style="font-size:16px">${icon}</span><span style="color:${text}">${temp}</span><span style="color:${ski.color};font-size:10px;font-weight:600">${ski.label.split(" ")[0]}</span>${rain}`;
  } else {
    pill.innerHTML = `<span style="font-size:16px">${icon}</span><span style="color:${text}">${temp}</span><span style="color:${text}">${rain}</span>`;
  }

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
  const SIZE      = 26;

  // Shaft length scales with wind speed: calm(~1 m/s)=4 units, gale(18+ m/s)=14 units
  const shaftLen  = 4 + Math.min(speed / 18, 1) * 10;
  const baseY     = 17;
  const tipY      = +(baseY - shaftLen).toFixed(1);
  const headSize  = +(Math.max(2.5, shaftLen * 0.32)).toFixed(1);
  const headY     = +(tipY + headSize).toFixed(1);
  const d = `M10,${baseY} L10,${tipY} M${10 - headSize},${headY} L10,${tipY} L${10 + headSize},${headY}`;

  const el = document.createElement("div");
  el.style.width   = `${SIZE}px`;
  el.style.height  = `${SIZE}px`;
  el.style.cursor  = "pointer";
  el.style.opacity = "0.88";
  el.title = `${speed.toFixed(1)} m/s`;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width",   `${SIZE}`);
  svg.setAttribute("height",  `${SIZE}`);
  svg.setAttribute("viewBox", "0 0 20 20");
  svg.style.transform  = `rotate(${direction}deg)`;
  svg.style.overflow   = "visible";

  const halo = document.createElementNS("http://www.w3.org/2000/svg", "path");
  halo.setAttribute("d", d);
  halo.setAttribute("stroke", "rgba(0,0,0,0.5)");
  halo.setAttribute("stroke-width", "4");
  halo.setAttribute("stroke-linecap", "round");
  halo.setAttribute("stroke-linejoin", "round");
  halo.setAttribute("fill", "none");
  svg.appendChild(halo);

  const arrow = document.createElementNS("http://www.w3.org/2000/svg", "path");
  arrow.setAttribute("d", d);
  arrow.setAttribute("stroke", color);
  arrow.setAttribute("stroke-width", "2.2");
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
  const windLabel = seg.windClass === "tailwind" ? "Tailwind" : seg.windClass === "crosswind" ? "Crosswind" : "Headwind";

  return `<div style="font-family:system-ui,sans-serif;font-size:13px;line-height:1.7;color:#1e293b;min-width:155px">
    <div style="font-weight:700;margin-bottom:4px">${seg.startKm.toFixed(1)}–${seg.endKm.toFixed(1)} km</div>
    <div>${icon} <strong>${seg.weather.temperature.toFixed(1)}°C</strong>${seg.weather.feelsLike !== undefined && seg.weather.feelsLike !== seg.weather.temperature ? ` <span style="color:#64748b;font-size:11px">(feels like ${seg.weather.feelsLike}°)</span>` : ""}</div>
    ${ski
      ? `<div style="color:${ski.color};font-weight:600">${ski.label}</div><div style="color:#64748b;font-size:11px">${ski.waxHint}</div>`
      : `<div style="color:${seg.color};font-weight:600">💨 ${windLabel} · ${seg.weather.windSpeed.toFixed(1)} m/s</div>`}
    ${seg.weather.precipitation > 0 ? `<div style="color:#2563eb">🌧️ ${seg.weather.precipitation.toFixed(1)} mm/h</div>` : ""}
    <div style="color:#64748b;font-size:11px">☁️ ${Math.round(seg.weather.cloudCover)}% cloud cover</div>
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
