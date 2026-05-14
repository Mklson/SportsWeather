import polyline from "@mapbox/polyline";
import type { Coordinate, StravaActivity, StravaSegment } from "@/types";

const STRAVA_API = "https://www.strava.com/api/v3";

export function buildStravaAuthUrl(state?: string): string {
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!,
    redirect_uri: process.env.STRAVA_REDIRECT_URI!,
    response_type: "code",
    scope: "read,activity:read_all",
    ...(state ? { state } : {}),
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
  });
  if (!res.ok) throw new Error(`Failed to list Strava activities: ${res.status}`);
  return res.json();
}

export async function getStravaActivity(
  accessToken: string,
  activityId: number
): Promise<StravaActivity & { map: { polyline: string } }> {
  const res = await fetch(`${STRAVA_API}/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Failed to get Strava activity: ${res.status}`);
  return res.json();
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

/** Decode Google Encoded Polyline to Coordinate array. */
export function decodePolyline(encoded: string): Coordinate[] {
  const decoded = polyline.decode(encoded);
  return decoded.map(([lat, lon]) => ({ lat, lon }));
}
