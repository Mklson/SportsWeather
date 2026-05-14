import { NextRequest, NextResponse } from "next/server";
import { fetchRouteWeather } from "@/lib/met-api";
import { getRoute, getCachedWeather, saveWeatherCache } from "@/lib/db/client";
import type { WeatherRequest, WeatherResponse, Coordinate } from "@/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = (await req.json()) as WeatherRequest & { routeId?: string };
    const { coordinates, startTime, routeId } = body;

    if (!startTime) {
      return NextResponse.json({ error: "startTime is required" }, { status: 400 });
    }

    const start = new Date(startTime);
    if (isNaN(start.getTime())) {
      return NextResponse.json({ error: "Invalid startTime" }, { status: 400 });
    }

    let coords: Coordinate[] = coordinates ?? [];

    // If routeId provided, load coordinates from DB and check cache
    if (routeId) {
      const dbRoute = await getRoute(routeId);
      if (!dbRoute) {
        return NextResponse.json({ error: "Route not found" }, { status: 404 });
      }

      const cached = await getCachedWeather(routeId, start);
      if (cached) {
        return NextResponse.json({
          segments: cached.segments,
          fetchedAt: cached.fetched_at,
          fromCache: true,
        } satisfies WeatherResponse & { fromCache: boolean });
      }

      coords = dbRoute.coordinates;
    }

    if (!coords || coords.length < 2) {
      return NextResponse.json(
        { error: "At least 2 coordinates required" },
        { status: 400 }
      );
    }

    if (coords.length > 50_000) {
      return NextResponse.json(
        { error: "Too many coordinates (max 50 000)" },
        { status: 400 }
      );
    }

    const segments = await fetchRouteWeather(coords, start, 500, 4);

    // Cache result if we have a routeId
    if (routeId && segments.length > 0) {
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour TTL
      await saveWeatherCache({
        route_id: routeId,
        start_time: start.toISOString(),
        segments,
        fetched_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      }).catch(() => {
        // Non-fatal: cache write failure
      });
    }

    const response: WeatherResponse = {
      segments,
      fetchedAt: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Weather API error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
