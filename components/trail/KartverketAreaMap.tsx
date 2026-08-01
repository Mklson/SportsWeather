"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Bbox } from "@/lib/kartverket";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

// Below this zoom the visible area covers a large chunk of Norway — too broad
// for a useful/fast trail search, so the button is disabled until zoomed in further.
const MIN_SEARCH_ZOOM = 8;

interface Props {
  onSearch: (bbox: Bbox) => void;
  searching: boolean;
}

export function KartverketAreaMap({ onSearch, searching }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [zoom, setZoom] = useState(4.5);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: [10.5, 62],
      zoom: 4.5,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    map.on("zoom", () => setZoom(map.getZoom()));
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const canSearch = zoom >= MIN_SEARCH_ZOOM && !searching;

  return (
    <div className="space-y-2">
      <div ref={containerRef} className="w-full h-64 rounded-xl overflow-hidden border border-gray-200" />
      <button
        type="button"
        disabled={!canSearch}
        onClick={() => {
          const b = mapRef.current?.getBounds();
          if (!b) return;
          onSearch({ south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() });
        }}
        className="w-full py-2 rounded-xl text-sm font-medium transition-colors
                   bg-brand-navy hover:bg-brand-navy-dark text-white disabled:bg-gray-200 disabled:text-gray-400"
      >
        {searching
          ? "Searching…"
          : zoom < MIN_SEARCH_ZOOM
            ? "Zoom in further to search this area"
            : "Search this area"}
      </button>
    </div>
  );
}
