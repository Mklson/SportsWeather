"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Coordinate } from "@/types";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

interface Props {
  start: Coordinate | null;
  onStartChange: (c: Coordinate) => void;
  previewCoordinates?: Coordinate[];
}

export function RoutePreviewMap({ start, onStartChange, previewCoordinates }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  // Latest-value refs so the map-created-once effect below can read current
  // props without re-creating the map instance on every prop change.
  const onStartChangeRef = useRef(onStartChange);
  onStartChangeRef.current = onStartChange;

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: start ? [start.lon, start.lat] : [10.5, 60],
      zoom: start ? 12 : 5,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

    map.on("click", (e) => {
      onStartChangeRef.current({ lat: e.lngLat.lat, lon: e.lngLat.lng });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !start) return;

    if (!markerRef.current) {
      markerRef.current = new mapboxgl.Marker({ draggable: true, color: "#1e3a8a" })
        .setLngLat([start.lon, start.lat])
        .addTo(map);
      markerRef.current.on("dragend", () => {
        const pos = markerRef.current!.getLngLat();
        onStartChangeRef.current({ lat: pos.lat, lon: pos.lng });
      });
    } else {
      markerRef.current.setLngLat([start.lon, start.lat]);
    }
  }, [start]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const drawRoute = () => {
      if (map.getLayer("preview-route-casing")) map.removeLayer("preview-route-casing");
      if (map.getLayer("preview-route-line")) map.removeLayer("preview-route-line");
      if (map.getSource("preview-route")) map.removeSource("preview-route");

      if (!previewCoordinates?.length) return;

      const data: GeoJSON.Feature<GeoJSON.LineString> = {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: previewCoordinates.map((c) => [c.lon, c.lat]),
        },
      };

      map.addSource("preview-route", { type: "geojson", data });
      map.addLayer({
        id: "preview-route-casing",
        type: "line",
        source: "preview-route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#ffffff", "line-width": 10, "line-opacity": 0.8 },
      });
      map.addLayer({
        id: "preview-route-line",
        type: "line",
        source: "preview-route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#3b82f6", "line-width": 6, "line-opacity": 0.9 },
      });

      const bounds = previewCoordinates.reduce(
        (b, c) => b.extend([c.lon, c.lat]),
        new mapboxgl.LngLatBounds([previewCoordinates[0].lon, previewCoordinates[0].lat], [
          previewCoordinates[0].lon,
          previewCoordinates[0].lat,
        ])
      );
      map.fitBounds(bounds, { padding: 40, duration: 500 });
    };

    if (map.isStyleLoaded()) drawRoute();
    else map.once("load", drawRoute);
  }, [previewCoordinates]);

  return (
    <div className="space-y-1">
      <div
        ref={containerRef}
        className="w-full h-64 rounded-xl overflow-hidden border border-gray-200"
      />
      <p className="text-xs text-gray-400">
        {start ? "Drag the pin or click to move the start point." : "Click the map to set a start point."}
      </p>
    </div>
  );
}
