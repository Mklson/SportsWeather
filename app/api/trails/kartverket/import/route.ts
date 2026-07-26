import { NextRequest, NextResponse } from "next/server";
import { saveRoute } from "@/lib/db/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { simplifyRoute, totalDistanceKm, totalElevationGain } from "@/lib/route-sampler";
import type { KartverketTrail, UploadResponse } from "@/types";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const trail = (await req.json()) as KartverketTrail;
    if (!trail?.coordinates?.length) {
      return NextResponse.json({ error: "Invalid trail data" }, { status: 400 });
    }

    const coordinates = simplifyRoute(trail.coordinates, 10);
    if (coordinates.length < 2) {
      return NextResponse.json({ error: "Trail has too few coordinates" }, { status: 422 });
    }

    const distanceKm = totalDistanceKm(coordinates);
    const elevationGainM = totalElevationGain(coordinates);

    const saved = await saveRoute({
      user_id: user?.id ?? null,
      name: trail.name,
      source: "gpx", // Kartverket trails have no dedicated RouteSource value yet — same convention as OSM import
      coordinates,
      distance_km: distanceKm,
      elevation_gain_m: elevationGainM > 0 ? elevationGainM : null,
      external_id: `kartverket:${trail.id}`,
      sport: trail.sport,
      default_speed_kmh: null,
    });

    const response: UploadResponse = {
      route: {
        id: saved.id,
        name: saved.name,
        source: saved.source,
        coordinates,
        distanceKm,
        elevationGainM,
        createdAt: saved.created_at,
        sport: saved.sport ?? undefined,
      },
    };

    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
