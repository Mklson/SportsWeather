import type { Coordinate, SportType, SurfacePreference } from "@/types";

const GRAPHHOPPER_URL = process.env.GRAPHHOPPER_URL!;

// GraphHopper has no dedicated Nordic-ski profile, so skiing is routed on the
// foot profiles as an approximation — XC-ski trails are frequently the same
// forestry roads/paths those profiles already traverse.
const PROFILE_BY: Record<SportType, Record<SurfacePreference, string>> = {
  running: { trail: "trail_foot", road: "road_foot" },
  skiing: { trail: "trail_foot", road: "road_foot" },
  cycling: { trail: "trail_bike", road: "road_bike" },
};

export interface GenerateRoundTripParams {
  start: Coordinate;
  distanceKm: number;
  sport: SportType;
  surfacePreference: SurfacePreference;
  seed?: number;
}

export interface GeneratedRoute {
  coordinates: Coordinate[];
  profile: string;
  seed: number;
}

export async function generateRoundTripRoute(
  params: GenerateRoundTripParams
): Promise<GeneratedRoute> {
  const profile = PROFILE_BY[params.sport][params.surfacePreference];
  const seed = params.seed ?? Math.floor(Math.random() * 1_000_000);

  const qs = new URLSearchParams({
    point: `${params.start.lat},${params.start.lon}`,
    profile,
    algorithm: "round_trip",
    "round_trip.distance": String(Math.round(params.distanceKm * 1000)),
    "round_trip.seed": String(seed),
    // No elevation provider configured on the GraphHopper instance —
    // requesting it returns a 400. Coordinates come back without `ele`,
    // same as the existing OSM/Overpass import path in this codebase.
    points_encoded: "false",
  });
  qs.set("ch.disable", "true");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  let res: Response;
  try {
    res = await fetch(`${GRAPHHOPPER_URL}/route?${qs}`, { signal: controller.signal });
  } catch {
    throw new Error("GRAPHHOPPER_UNREACHABLE");
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GRAPHHOPPER_ERROR:${res.status}:${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const coords = data?.paths?.[0]?.points?.coordinates as
    | [number, number, number?][]
    | undefined;
  if (!coords?.length) throw new Error("GRAPHHOPPER_NO_ROUTE");

  const coordinates: Coordinate[] = coords.map(([lon, lat, ele]) => ({ lat, lon, ele }));
  return { coordinates, profile, seed };
}
