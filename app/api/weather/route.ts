import { NextRequest, NextResponse } from "next/server";
import { fetchRouteWeather } from "@/lib/met-api";
import { getRoute, getCachedWeather, saveWeatherCache } from "@/lib/db/client";
import type { WeatherRequest, WeatherResponse, Coordinate } from "@/types";

export const runtime = "nodejs";

// Shared logic for fetching/caching weather by routeId or raw coords
async function resolveWeather(
  routeId: string | undefined,
  coordinates: Coordinate[] | undefined,
  startTime: string,
  speedKmh: number | undefined,
  sport: string | undefined
): Promise<NextResponse> {
  const start = new Date(startTime);
  if (isNaN(start.getTime())) {
    return NextResponse.json({ error: "Invalid startTime" }, { status: 400 });
  }

  let coords: Coordinate[] = coordinates ?? [];

  if (routeId) {
    const cached = await getCachedWeather(routeId, start);
    if (cached) {
      const res = NextResponse.json({
        segments: cached.segments,
        fetchedAt: cached.fetched_at,
        fromCache: true,
      } satisfies WeatherResponse & { fromCache: boolean });
      res.headers.set("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=300");
      return res;
    }

    const dbRoute = await getRoute(routeId);
    if (!dbRoute) {
      return NextResponse.json({ error: "Route not found" }, { status: 404 });
    }
    coords = dbRoute.coordinates;
  }

  if (!coords || coords.length < 2) {
    return NextResponse.json({ error: "At least 2 coordinates required" }, { status: 400 });
  }
  if (coords.length > 50_000) {
    return NextResponse.json({ error: "Too many coordinates (max 50 000)" }, { status: 400 });
  }

  const validSport = (["cycling", "running", "skiing"] as const).find((s) => s === sport);
  const segments = await fetchRouteWeather(coords, start, 1000, 20, speedKmh, validSport);

  if (routeId && segments.length > 0) {
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await saveWeatherCache({
      route_id: routeId,
      start_time: start.toISOString(),
      segments,
      fetched_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    }).catch(() => {});
  }

  const res = NextResponse.json({ segments, fetchedAt: new Date().toISOString() } satisfies WeatherResponse);
  if (routeId) {
    res.headers.set("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=300");
  }
  return res;
}

// GET — used for normal (forward) route loads; cacheable by Vercel CDN
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = req.nextUrl;
    const routeId   = searchParams.get("routeId")   ?? undefined;
    const startTime = searchParams.get("startTime")  ?? "";
    const speedKmh  = searchParams.get("speedKmh")   ? Number(searchParams.get("speedKmh"))  : undefined;
    const sport     = searchParams.get("sport")      ?? undefined;

    if (!startTime) return NextResponse.json({ error: "startTime is required" }, { status: 400 });
    return await resolveWeather(routeId, undefined, startTime, speedKmh, sport);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Weather GET error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST — used for reversed routes where full coordinate array must be in the body
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = (await req.json()) as WeatherRequest & { routeId?: string; speedKmh?: number; sport?: string };
    const { coordinates, startTime, routeId, speedKmh, sport } = body;

    if (!startTime) return NextResponse.json({ error: "startTime is required" }, { status: 400 });
    return await resolveWeather(routeId, coordinates, startTime, speedKmh, sport);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Weather POST error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
