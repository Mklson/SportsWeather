"use client";

import useSWR from "swr";
import type { Coordinate, WeatherResponse, WeatherSegment } from "@/types";

export function useWeather(
  routeId: string,
  startTime: Date,
  overrideCoords?: Coordinate[]
) {
  const rounded = new Date(startTime);
  rounded.setMinutes(0, 0, 0);
  const reversed = !!overrideCoords;
  const key = ["/api/weather", routeId, rounded.toISOString(), reversed ? "rev" : "fwd"] as const;

  const { data, error, isLoading } = useSWR(
    key,
    async () => {
      const body = reversed
        ? { coordinates: overrideCoords, startTime: rounded.toISOString() }
        : { routeId, startTime: rounded.toISOString() };

      const res = await fetch("/api/weather", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? `HTTP ${res.status}`);
      }
      return res.json() as Promise<WeatherResponse>;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 3600 * 1000,
      onSuccess: (d) => console.log("[weather] OK –", d.segments.length, "segmenter"),
      onError:   (e) => console.error("[weather] FEIL:", e.message),
    }
  );

  const segments: WeatherSegment[] = data?.segments ?? [];

  return {
    segments,
    isLoading,
    error: error instanceof Error ? error.message : null,
    fetchedAt: data?.fetchedAt,
  };
}
