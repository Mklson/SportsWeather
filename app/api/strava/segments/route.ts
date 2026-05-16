import { NextRequest, NextResponse } from "next/server";
import { getRoute, getCachedSegments, saveSegmentCache, getCachedStarred, saveStarredCache } from "@/lib/db/client";
import { exploreSegments, getStarredSegments } from "@/lib/strava";
import type { Coordinate, StravaSegment } from "@/types";

export const runtime = "nodejs";

type ActivityType = "riding" | "running";
type BoundingBox = { minLat: number; maxLat: number; minLon: number; maxLon: number };

function boundingBox(coords: Coordinate[]): BoundingBox {
  let minLat = Infinity, maxLat = -Infinity;
  let minLon = Infinity, maxLon = -Infinity;
  for (const { lat, lon } of coords) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
  }
  const pad = 0.005;
  return { minLat: minLat - pad, maxLat: maxLat + pad, minLon: minLon - pad, maxLon: maxLon + pad };
}

// Split route coordinates into overlapping chunks so each chunk gets its own
// bounding box query. Strava returns max 10 segments per call, so chunking a
// long route multiplies the total segments we can discover.
function routeChunks(coords: Coordinate[], maxChunks = 4): Coordinate[][] {
  if (coords.length < 20) return [coords];
  const step = Math.ceil(coords.length / maxChunks);
  const stride = Math.ceil(step * 0.85); // 15% overlap between chunks
  const chunks: Coordinate[][] = [];
  for (let i = 0; i < coords.length; i += stride) {
    chunks.push(coords.slice(i, Math.min(i + step, coords.length)));
    if (i + step >= coords.length) break;
  }
  return chunks;
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

// Returns true only if start, end, AND intermediate points all stay close to the route.
// Prevents segments whose polyline detours far off-route from being included.
function segmentAlongsideRoute(seg: StravaSegment, routeCoords: Coordinate[]): boolean {
  if (!nearRoute(seg.startLatLng, routeCoords)) return false;
  if (!nearRoute(seg.endLatLng, routeCoords)) return false;
  if (seg.coordinates.length > 4) {
    for (const frac of [0.25, 0.5, 0.75]) {
      const pt = seg.coordinates[Math.floor(frac * (seg.coordinates.length - 1))];
      if (!nearRoute([pt.lat, pt.lon], routeCoords)) return false;
    }
  }
  return true;
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

  const activityType: ActivityType = sport === "cycling" ? "riding" : "running";
  const athleteIdRaw = req.cookies.get("strava_athlete_id")?.value;
  const athleteId = athleteIdRaw ? Number(athleteIdRaw) : null;

  try {
    // Both explore (per route, 24 h) and starred (per athlete, 1 h) are cached
    const [cachedStarred, cachedExplore] = await Promise.all([
      athleteId ? getCachedStarred(athleteId) : Promise.resolve(null),
      getCachedSegments(routeId, activityType),
    ]);

    // Fetch starred from Strava only on cache miss
    let starred: StravaSegment[];
    if (cachedStarred) {
      starred = cachedStarred;
    } else {
      starred = await getStarredSegments(token);
      if (athleteId) saveStarredCache(athleteId, starred).catch(() => {});
    }

    let filteredExplore: StravaSegment[];

    if (cachedExplore) {
      filteredExplore = cachedExplore;
    } else {
      const chunks = routeChunks(dbRoute.coordinates);
      const exploreBatches = await Promise.all(
        chunks.map((chunk) => exploreSegments(token, boundingBox(chunk), activityType))
      );

      const seen = new Set<number>();
      const deduped: StravaSegment[] = [];
      for (const batch of exploreBatches) {
        for (const seg of batch) {
          if (!seen.has(seg.id)) {
            seen.add(seg.id);
            deduped.push(seg);
          }
        }
      }

      filteredExplore = deduped.filter((s) => segmentAlongsideRoute(s, dbRoute.coordinates));
      // Fire-and-forget — don't block the response on the write
      saveSegmentCache(routeId, activityType, filteredExplore).catch(() => {});
    }

    // Starred segments near the route go first, marked with starred: true
    const starredNearRoute = starred.filter((s) => segmentAlongsideRoute(s, dbRoute.coordinates));
    const starredIds = new Set(starredNearRoute.map((s) => s.id));

    // Merge: starred first, then explore results not already in starred
    const segments = [
      ...starredNearRoute,
      ...filteredExplore.filter((s) => !starredIds.has(s.id)),
    ];

    return NextResponse.json({ segments });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
