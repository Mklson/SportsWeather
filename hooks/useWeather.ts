"use client";

import useSWR from "swr";
import type { Coordinate, SportType, WeatherResponse, WeatherSegment } from "@/types";

export function useWeather(
  routeId: string,
  startTime: Date,
  overrideCoords?: Coordinate[],
  speedKmh?: number,
  sport?: SportType,
  initialSegments?: WeatherSegment[]
) {
  const rounded = new Date(startTime);
  rounded.setMinutes(0, 0, 0);
  const reversed = !!overrideCoords;

  // GET for the normal forward case (CDN-cacheable).
  // POST only when reversed — full coord array can't go in a URL.
  const getKey = reversed
    ? null
    : `/api/weather?routeId=${routeId}&startTime=${encodeURIComponent(rounded.toISOString())}&speedKmh=${speedKmh ?? 0}&sport=${sport ?? ""}`;
  const postKey = reversed
    ? ["/api/weather/post", routeId, rounded.toISOString(), speedKmh ?? 0]
    : null;

  const serverFallback: WeatherResponse | undefined = initialSegments
    ? { segments: initialSegments, fetchedAt: new Date().toISOString() }
    : undefined;

  const { data: getData, error: getError, isLoading: getLoading } = useSWR(
    getKey,
    (url: string) => fetch(url).then((r) => r.json() as Promise<WeatherResponse>),
    {
      revalidateOnFocus: false,
      dedupingInterval: 3600 * 1000,
      // Server gave us fresh data — skip the client fetch for the initial hour
      fallbackData: serverFallback,
      revalidateIfStale: !initialSegments,
    }
  );

  const { data: postData, error: postError, isLoading: postLoading } = useSWR(
    postKey,
    async () => {
      const res = await fetch("/api/weather", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coordinates: overrideCoords,
          startTime: rounded.toISOString(),
          speedKmh,
          sport,
        }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? `HTTP ${res.status}`);
      }
      return res.json() as Promise<WeatherResponse>;
    },
    { revalidateOnFocus: false, dedupingInterval: 3600 * 1000 }
  );

  const data      = reversed ? postData    : getData;
  const error     = reversed ? postError   : getError;
  const isLoading = reversed ? postLoading : getLoading;

  const segments: WeatherSegment[] = data?.segments ?? [];

  return {
    segments,
    isLoading,
    error: error instanceof Error ? error.message : null,
    fetchedAt: data?.fetchedAt,
  };
}
