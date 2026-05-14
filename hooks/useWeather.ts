"use client";

import useSWR from "swr";
import type { WeatherResponse, WeatherSegment } from "@/types";

const fetcher = async ([, routeId, startTime]: [string, string, string]) => {
  const res = await fetch("/api/weather", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ routeId, startTime }),
  });
  if (!res.ok) {
    const { error } = await res.json();
    throw new Error(error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<WeatherResponse>;
};

export function useWeather(routeId: string, startTime: Date) {
  // Round to nearest hour for cache efficiency
  const rounded = new Date(startTime);
  rounded.setMinutes(0, 0, 0);
  const key = ["/api/weather", routeId, rounded.toISOString()] as const;

  const { data, error, isLoading } = useSWR(key, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 3600 * 1000,
    onSuccess: (d) => console.log("[weather] OK –", d.segments.length, "segmenter"),
    onError:   (e) => console.error("[weather] FEIL:", e.message),
  });

  const segments: WeatherSegment[] = data?.segments ?? [];

  return {
    segments,
    isLoading,
    error: error instanceof Error ? error.message : null,
    fetchedAt: data?.fetchedAt,
  };
}
