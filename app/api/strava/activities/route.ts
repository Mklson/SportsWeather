import { NextRequest, NextResponse } from "next/server";
import {
  listStravaActivities,
  getStravaActivity,
  decodePolyline,
  getActivityLatLngElevation,
  stravaActivityTypeToSport,
} from "@/lib/strava";
import { saveRoute } from "@/lib/db/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { totalDistanceKm, totalElevationGain } from "@/lib/route-sampler";
import type { UploadResponse } from "@/types";

/** GET /api/strava/activities  – list activities */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = req.cookies.get("strava_access_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Not authenticated with Strava" }, { status: 401 });
  }

  try {
    const page = Number(req.nextUrl.searchParams.get("page") ?? 1);
    const activities = await listStravaActivities(token, page, 30);

    return NextResponse.json({
      activities: activities.map((a) => ({
        id: a.id,
        name: a.name,
        distanceKm: Math.round(a.distanceM / 10) / 100,
        movingTimeSec: a.movingTimeS,
        startDate: a.start_date,
        type: a.type,
        hasSummaryPolyline: Boolean(a.map?.summary_polyline),
      })),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

/** POST /api/strava/activities  – import a specific activity as a route */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const token = req.cookies.get("strava_access_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Not authenticated with Strava" }, { status: 401 });
  }

  const { activityId } = (await req.json()) as { activityId: number };
  if (!activityId) {
    return NextResponse.json({ error: "activityId required" }, { status: 400 });
  }

  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const activity = await getStravaActivity(token, activityId);
    const encoded = activity.map?.summary_polyline ?? activity.map?.polyline;

    if (!encoded) {
      return NextResponse.json(
        { error: "Activity has no polyline data" },
        { status: 422 }
      );
    }

    // The summary polyline has no elevation; fetch it from the streams
    // endpoint and fall back to the flat polyline if that's unavailable.
    const coordinates =
      (await getActivityLatLngElevation(token, activityId).catch(() => null)) ?? decodePolyline(encoded);
    const distanceKm = totalDistanceKm(coordinates);
    const elevationGainM = totalElevationGain(coordinates);

    const defaultSpeedKmh = activity.average_speed
      ? Math.round(activity.average_speed * 3.6 * 10) / 10
      : null;

    const saved = await saveRoute({
      user_id: user?.id ?? null,
      name: activity.name,
      source: "strava",
      coordinates,
      distance_km: distanceKm,
      elevation_gain_m: elevationGainM || null,
      external_id: String(activityId),
      sport: stravaActivityTypeToSport(activity.type),
      default_speed_kmh: defaultSpeedKmh,
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
    console.error("[strava/activities POST]", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
