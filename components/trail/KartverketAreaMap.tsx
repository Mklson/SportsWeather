"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Bbox } from "@/lib/kartverket";
import type { KartverketTrail, SportType } from "@/types";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

// Below this zoom the visible area covers a large chunk of Norway — too broad
// for a useful/fast trail search, so auto-search stays off until zoomed in further.
// Also gates drawing results on the map — roughly matches a ~100km-wide view.
const MIN_SEARCH_ZOOM = 8;
// Debounce after the map settles (moveend already only fires once per gesture,
// but flyTo/programmatic moves can still chain a few in quick succession).
const AUTO_SEARCH_DELAY_MS = 500;

const SPORT_LINE_COLOR: Record<SportType, string> = {
  running: "#f97316", // hiking — orange, stands out against the outdoors basemap's green
  cycling: "#2563eb", // blue
  skiing: "#06b6d4",  // cyan
};

function trailsToGeoJSON(trails: KartverketTrail[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: trails
      .filter((t) => t.coordinates.length >= 2)
      .map((t) => ({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: t.coordinates.map((c) => [c.lon, c.lat]),
        },
        properties: { id: t.id, sport: t.sport },
      })),
  };
}

interface Props {
  onSearch: (bbox: Bbox) => void;
  searching: boolean;
  expanded?: boolean;
  trails: KartverketTrail[];
}

export function KartverketAreaMap({ onSearch, searching, expanded = false, trails }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [zoom, setZoom] = useState(4.5);
  const [styleReady, setStyleReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: [10.5, 62],
      zoom: 4.5,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
        showUserHeading: false,
      }),
      "top-right"
    );
    map.on("zoom", () => setZoom(map.getZoom()));
    map.on("moveend", () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (map.getZoom() < MIN_SEARCH_ZOOM) return;
        const b = map.getBounds();
        if (!b) return;
        onSearch({ south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() });
      }, AUTO_SEARCH_DELAY_MS);
    });
    map.on("load", () => {
      map.addSource("kartverket-trails", { type: "geojson", data: trailsToGeoJSON([]) });
      map.addLayer({
        id: "kartverket-trails-bg", type: "line", source: "kartverket-trails",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#fff", "line-width": 5, "line-opacity": 0.6 },
      });
      map.addLayer({
        id: "kartverket-trails-line", type: "line", source: "kartverket-trails",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": ["match", ["get", "sport"], "running", SPORT_LINE_COLOR.running, "cycling", SPORT_LINE_COLOR.cycling, "skiing", SPORT_LINE_COLOR.skiing, "#6b7280"],
          "line-width": 3,
          "line-opacity": 0.9,
        },
      });
      setStyleReady(true);
    });
    mapRef.current = map;

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Draw (or clear) the current results as lines once zoomed in enough to have
  // searched at all — keeps stale wide-area lines from lingering if a zoom-out
  // clears the search gate.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady) return;
    const src = map.getSource("kartverket-trails") as mapboxgl.GeoJSONSource | undefined;
    src?.setData(trailsToGeoJSON(zoom >= MIN_SEARCH_ZOOM ? trails : []));
  }, [trails, zoom, styleReady]);

  // Mapbox needs an explicit nudge after its container's size changes via CSS
  // (e.g. the expand toggle) — it doesn't observe that on its own.
  useEffect(() => {
    const id = setTimeout(() => mapRef.current?.resize(), 210);
    return () => clearTimeout(id);
  }, [expanded]);

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className={`w-full rounded-xl overflow-hidden border border-gray-200 transition-[height] duration-200 ${
          expanded ? "h-[65vh]" : "h-64"
        }`}
      />
      <p className="text-xs text-gray-400 text-center">
        {searching
          ? "Searching…"
          : zoom < MIN_SEARCH_ZOOM
            ? "Zoom in further to search this area"
            : "Pan or zoom to search automatically"}
      </p>
    </div>
  );
}
