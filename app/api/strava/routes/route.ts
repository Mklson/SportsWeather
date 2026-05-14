import { NextRequest, NextResponse } from "next/server";
import { listStravaRoutes, getStravaRoute, decodePolyline } from "@/lib/strava";
import { saveRoute } from "@/lib/db/client";
import { totalDistanceKm, totalElevationGain } from "@/lib/route-sampler";
import type { UploadResponse } from "@/types";

export const runtime = "nodejs";

/** GET /api/strava/routes — list saved routes for the authenticated athlete */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = req.cookies.get("strava_access_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Not authenticated with Strava" }, { status: 401 });
  }

  const page = Number(req.nextUrl.searchParams.get("page") ?? 1);
  try {
    const routes = await listStravaRoutes(token, page, 30);
    return NextResponse.json({ routes });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

/** POST /api/strava/routes — import a saved Strava route */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const token = req.cookies.get("strava_access_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Not authenticated with Strava" }, { status: 401 });
  }

  const { routeId } = (await req.json()) as { routeId: number };
  if (!routeId) {
    return NextResponse.json({ error: "routeId required" }, { status: 400 });
  }

  try {
    const stravaRoute = await getStravaRoute(token, routeId);
    const encoded = stravaRoute.map?.summary_polyline;
    if (!encoded) {
      return NextResponse.json({ error: "Route has no polyline data" }, { status: 422 });
    }

    const coordinates = decodePolyline(encoded);
    const distanceKm = totalDistanceKm(coordinates);
    const elevationGainM = totalElevationGain(coordinates);

    const saved = await saveRoute({
      user_id: null,
      name: stravaRoute.name,
      source: "strava",
      coordinates,
      distance_km: distanceKm,
      elevation_gain_m: elevationGainM || null,
      external_id: `strava-route:${routeId}`,
    } as Parameters<typeof saveRoute>[0]);

    const response: UploadResponse = {
      route: {
        id: saved.id,
        name: saved.name,
        source: "strava",
        coordinates,
        distanceKm,
        elevationGainM,
        createdAt: saved.created_at,
      },
    };

    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
