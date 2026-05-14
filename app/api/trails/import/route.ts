import { NextRequest, NextResponse } from "next/server";
import { saveRoute } from "@/lib/db/client";
import { totalDistanceKm } from "@/lib/route-sampler";
import type { OsmTrail, UploadResponse } from "@/types";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const trail = (await req.json()) as OsmTrail;

  if (!trail?.coordinates?.length) {
    return NextResponse.json({ error: "Invalid trail data" }, { status: 400 });
  }

  const distanceKm = totalDistanceKm(trail.coordinates);

  const saved = await saveRoute({
    user_id: null,
    name: trail.name,
    source: "gpx", // OSM trails stored as gpx type
    coordinates: trail.coordinates,
    distance_km: distanceKm,
    elevation_gain_m: null,
    external_id: `osm:${trail.id}`,
  });

  const response: UploadResponse = {
    route: {
      id: saved.id,
      name: saved.name,
      source: "gpx",
      coordinates: trail.coordinates,
      distanceKm,
      createdAt: saved.created_at,
    },
  };

  return NextResponse.json(response, { status: 201 });
}
