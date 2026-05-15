import polyline from "@mapbox/polyline";
import type { Coordinate, SportType, StravaActivity, StravaRoute, StravaSegment } from "@/types";

const STRAVA_API = "https://www.strava.com/api/v3";

function throwRateLimitError(res: Response): never {
  const usage = res.headers.get("X-RateLimit-Usage") ?? "";
  const limit = res.headers.get("X-RateLimit-Limit") ?? "";
  throw new Error(`RATE_LIMIT:${usage}:${limit}`);
}

export function buildStravaAuthUrl(state?: string, force = false): string {
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!,
    redirect_uri: process.env.STRAVA_REDIRECT_URI!,
    response_type: "code",
    scope: "read,read_all,activity:read_all",
    ...(state ? { state } : {}),
    ...(force ? { approval_prompt: "force" } : {}),
  });
  return `https://www.strava.com/oauth/authorize?${params}`;
}

export async function exchangeStravaCode(
  code: string
): Promise<{ access_token: string; refresh_token: string; athlete: unknown }> {
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Strava token exchange failed: ${res.status}`);
  return res.json();
}

export async function refreshStravaToken(
  refreshToken: string
): Promise<{ access_token: string; refresh_token: string }> {
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Strava token refresh failed: ${res.status}`);
  return res.json();
}

export async function listStravaActivities(
  accessToken: string,
  page = 1,
  perPage = 30
): Promise<StravaActivity[]> {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });
  const res = await fetch(`${STRAVA_API}/athlete/activities?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (res.status === 429) throwRateLimitError(res);
  if (!res.ok) throw new Error(`Failed to list Strava activities: ${res.status}`);
  return res.json();
}

export async function getStravaActivity(
  accessToken: string,
  activityId: number
): Promise<StravaActivity & { map: { polyline: string } }> {
  const res = await fetch(`${STRAVA_API}/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Failed to get Strava activity: ${res.status}`);
  return res.json();
}

export async function listStravaRoutes(
  token: string,
  page = 1,
  perPage = 30
): Promise<StravaRoute[]> {
  const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
  const res = await fetch(`${STRAVA_API}/athlete/routes?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Failed to list Strava routes: ${res.status}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any[] = await res.json();
  return data.map((r) => ({
    id: r.id,
    name: r.name,
    distanceM: r.distance,
    elevationGain: r.elevation_gain,
    type: r.type,
    timestamp: r.timestamp,
    hasSummaryPolyline: Boolean(r.map?.summary_polyline),
    summaryPolyline: r.map?.summary_polyline ?? undefined,
  }));
}

export async function getStravaRoute(
  token: string,
  routeId: number
): Promise<{ name: string; type: number; map: { summary_polyline: string } }> {
  const res = await fetch(`${STRAVA_API}/routes/${routeId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Failed to get Strava route: ${res.status}`);
  return res.json();
}

export async function getStarredSegments(token: string): Promise<StravaSegment[]> {
  const res = await fetch(`${STRAVA_API}/segments/starred?per_page=100`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Strava segments/starred failed: ${res.status}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any[] = await res.json();
  return data.map((s): StravaSegment => ({
    id: s.id,
    name: s.name,
    distanceM: s.distance,
    avgGrade: s.average_grade,
    elevDifference: s.total_elevation_gain ?? 0,
    climbCategory: s.climb_category ?? 0,
    startLatLng: s.start_latlng,
    endLatLng: s.end_latlng,
    coordinates: s.map?.polyline ? decodePolyline(s.map.polyline) : [],
    starred: true,
  }));
}

export async function exploreSegments(
  token: string,
  bounds: { minLat: number; minLon: number; maxLat: number; maxLon: number },
  activityType: "riding" | "running"
): Promise<StravaSegment[]> {
  const params = new URLSearchParams({
    bounds: `${bounds.minLat},${bounds.minLon},${bounds.maxLat},${bounds.maxLon}`,
    activity_type: activityType,
  });
  const res = await fetch(`${STRAVA_API}/segments/explore?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Strava segments/explore failed: ${res.status}`);
  const data = await res.json();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data.segments ?? []).map((s: any): StravaSegment => ({
    id: s.id,
    name: s.name,
    distanceM: s.distance,
    avgGrade: s.avg_grade,
    elevDifference: s.elev_difference,
    climbCategory: s.climb_category,
    startLatLng: s.start_latlng,
    endLatLng: s.end_latlng,
    coordinates: decodePolyline(s.points),
  }));
}

/** Map Strava activity type string to SportType. */
export function stravaActivityTypeToSport(stravaType: string): SportType {
  const cycling = ["Ride", "VirtualRide", "EBikeRide", "MountainBikeRide", "GravelRide", "Handcycle"];
  const skiing = ["NordicSki", "BackcountrySki", "AlpineSki", "Snowboard", "RollerSki"];
  if (cycling.includes(stravaType)) return "cycling";
  if (skiing.includes(stravaType)) return "skiing";
  return "running";
}

/** Map Strava route type number to SportType. */
export function stravaRouteTypeToSport(routeType: number): SportType {
  if (routeType === 1) return "cycling";
  return "running"; // 2=run, 3=walk/hike
}

/** Decode Google Encoded Polyline to Coordinate array. */
export function decodePolyline(encoded: string): Coordinate[] {
  const decoded = polyline.decode(encoded);
  return decoded.map(([lat, lon]) => ({ lat, lon }));
}
