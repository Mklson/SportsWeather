import { NextRequest, NextResponse } from "next/server";
import { saveRoute } from "@/lib/db/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateRoundTripRoute } from "@/lib/graphhopper";
import { simplifyRoute, totalDistanceKm, totalElevationGain } from "@/lib/route-sampler";
import type { GenerateRouteRequest, UploadResponse } from "@/types";

const MIN_KM = 1;
const MAX_KM = 60; // safety cap — long round_trip requests are slow and serverless has a hard timeout

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = (await req.json()) as GenerateRouteRequest;
    if (!body?.start || typeof body.start.lat !== "number" || typeof body.start.lon !== "number") {
      return NextResponse.json({ error: "Missing or invalid start point" }, { status: 400 });
    }
    if (!body.distanceKm || body.distanceKm < MIN_KM || body.distanceKm > MAX_KM) {
      return NextResponse.json(
        { error: `Distance must be between ${MIN_KM} and ${MAX_KM} km` },
        { status: 400 }
      );
    }
    if (!body.sport || !body.surfacePreference) {
      return NextResponse.json({ error: "Missing sport or surfacePreference" }, { status: 400 });
    }

    let generated;
    try {
      generated = await generateRoundTripRoute({
        start: body.start,
        distanceKm: body.distanceKm,
        sport: body.sport,
        surfacePreference: body.surfacePreference,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.startsWith("GRAPHHOPPER_NO_ROUTE")) {
        return NextResponse.json(
          {
            error:
              "Could not generate a loop of that distance near this location — try a different distance or start point.",
          },
          { status: 422 }
        );
      }
      if (msg.startsWith("GRAPHHOPPER_UNREACHABLE")) {
        return NextResponse.json(
          {
            error:
              "Route generation service is unavailable right now (it may be waking up — try again in a few seconds).",
          },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: "Route generation failed." }, { status: 502 });
    }

    const coordinates = simplifyRoute(generated.coordinates, 10);
    if (coordinates.length < 2) {
      return NextResponse.json({ error: "Generated route has too few points" }, { status: 422 });
    }

    // Never trust the requested distance — GraphHopper's round_trip.distance
    // is a target, not a guarantee, so recompute from the actual coordinates.
    const distanceKm = totalDistanceKm(coordinates);
    const elevationGainM = totalElevationGain(coordinates);

    const saved = await saveRoute({
      user_id: user?.id ?? null,
      name: body.name?.trim() || `Generated ${body.sport} loop, ${distanceKm.toFixed(1)} km`,
      source: "generated",
      coordinates,
      distance_km: distanceKm,
      elevation_gain_m: elevationGainM > 0 ? elevationGainM : null,
      external_id: null,
      sport: body.sport,
      default_speed_kmh: null,
      generation_params: {
        requestedDistanceKm: body.distanceKm,
        surfacePreference: body.surfacePreference,
        start: body.start,
        profile: generated.profile,
        seed: generated.seed,
      },
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
