import { NextRequest, NextResponse } from "next/server";
import { getRoute } from "@/lib/db/client";
import { exploreSegments } from "@/lib/strava";
import type { Coordinate, StravaSegment } from "@/types";

export const runtime = "nodejs";

type ActivityType = "riding" | "running";

function boundingBox(coords: Coordinate[]) {
  let minLat = Infinity, maxLat = -Infinity;
  let minLon = Infinity, maxLon = -Infinity;
  for (const { lat, lon } of coords) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
  }
  // Add small padding
  const padLat = 0.005, padLon = 0.005;
  return { minLat: minLat - padLat, maxLat: maxLat + padLat, minLon: minLon - padLon, maxLon: maxLon + padLon };
}

function nearRoute(segCoord: [number, number], coords: Coordinate[], thresholdKm = 0.4): boolean {
  const [sLat, sLon] = segCoord;
  for (const { lat, lon } of coords) {
    const dlat = sLat - lat;
    const dlon = (sLon - lon) * Math.cos((lat * Math.PI) / 180);
    if (Math.sqrt(dlat * dlat + dlon * dlon) * 111 < thresholdKm) return true;
  }
  return false;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = req.cookies.get("strava_access_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Not authenticated with Strava" }, { status: 401 });
  }

  const routeId = req.nextUrl.searchParams.get("routeId");
  const sport = req.nextUrl.searchParams.get("sport") ?? "cycling";
  if (!routeId) {
    return NextResponse.json({ error: "routeId required" }, { status: 400 });
  }

  const dbRoute = await getRoute(routeId);
  if (!dbRoute) {
    return NextResponse.json({ error: "Route not found" }, { status: 404 });
  }

  const activityType: ActivityType = sport === "running" ? "running" : "riding";
  const bounds = boundingBox(dbRoute.coordinates);

  try {
    const all = await exploreSegments(token, bounds, activityType);

    // Keep only segments whose start AND end are reasonably close to the route
    const filtered: StravaSegment[] = all.filter(
      (s) =>
        nearRoute(s.startLatLng, dbRoute.coordinates) &&
        nearRoute(s.endLatLng, dbRoute.coordinates)
    );

    return NextResponse.json({ segments: filtered });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
