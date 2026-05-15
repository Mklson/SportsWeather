import type { OsmTrail, Coordinate } from "@/types";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "SportsWeather/1.0";

interface NominatimResult {
  boundingbox: [string, string, string, string];
  display_name: string;
  lat: string;
  lon: string;
}

interface OverpassWay {
  type: "way";
  id: number;
  tags?: Record<string, string>;
  geometry?: { lat: number; lon: number }[];
}

interface OverpassRelation {
  type: "relation";
  id: number;
  tags?: Record<string, string>;
  members?: Array<{ type: string; ref: number; role: string }>;
}

interface OverpassNode {
  type: "node";
  id: number;
}

interface OverpassResponse {
  elements: (OverpassWay | OverpassRelation | OverpassNode)[];
}

export async function searchSkiTrails(query: string): Promise<OsmTrail[]> {
  if (!query || query.trim().length < 2) return [];

  const bbox = await geocodeToBbox(query.trim());
  if (!bbox) return [];

  return fetchTrailsInBbox(bbox.south, bbox.west, bbox.north, bbox.east);
}

async function geocodeToBbox(
  query: string
): Promise<{ south: number; west: number; north: number; east: number } | null> {
  const params = new URLSearchParams({
    q: query,
    format: "json",
    limit: "1",
    countrycodes: "no",
  });

  const res = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: { "User-Agent": USER_AGENT },
    next: { revalidate: 3600 },
  });

  if (!res.ok) return null;
  const results = (await res.json()) as NominatimResult[];
  if (!results.length) return null;

  const r = results[0];
  const [minlat, maxlat, minlon, maxlon] = r.boundingbox;

  const latPad = 0.05;
  const lonPad = 0.08;

  return {
    south: parseFloat(minlat) - latPad,
    north: parseFloat(maxlat) + latPad,
    west:  parseFloat(minlon) - lonPad,
    east:  parseFloat(maxlon) + lonPad,
  };
}

export async function fetchTrailsInBbox(
  south: number,
  west: number,
  north: number,
  east: number,
  limit = 30
): Promise<OsmTrail[]> {
  const bb = `${south},${west},${north},${east}`;

  // Query both ways (individual segments) and relations (named trail networks).
  // (._;>;) recurses relations → ways so every way gets geometry via out geom.
  const overpassQuery = `
[out:json][timeout:30];
(
  way["piste:type"="nordic"](${bb});
  way["piste:type"="classic"](${bb});
  way["piste:type"="skitour"](${bb});
  way["piste:grooming"~"classic|skating"](${bb});
  relation["route"="ski"](${bb});
  relation["piste:type"="nordic"](${bb});
  relation["piste:type"="classic"](${bb});
);
(._;>;);
out geom;
`.trim();

  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(overpassQuery)}`,
  });

  if (!res.ok) throw new Error(`Overpass error: ${res.status}`);

  const data = (await res.json()) as OverpassResponse;
  return parseElements(data).slice(0, limit);
}

function parseElements(data: OverpassResponse): OsmTrail[] {
  // Index all ways by ID so relation members can look them up
  const wayById = new Map<number, OverpassWay>();
  for (const el of data.elements) {
    if (el.type === "way" && (el as OverpassWay).geometry) {
      wayById.set(el.id, el as OverpassWay);
    }
  }

  const trails: OsmTrail[] = [];
  const coveredWayIds = new Set<number>();

  // Relations first — they carry the canonical name for a whole trail network
  for (const el of data.elements) {
    if (el.type !== "relation") continue;
    const rel = el as OverpassRelation;
    const tags = rel.tags ?? {};
    const name = tags.name ?? tags["name:no"] ?? tags.ref ?? null;
    if (!name) continue;

    const coords: Coordinate[] = [];
    for (const member of rel.members ?? []) {
      if (member.type !== "way") continue;
      const way = wayById.get(member.ref);
      if (way?.geometry) {
        for (const g of way.geometry) coords.push({ lat: g.lat, lon: g.lon });
        coveredWayIds.add(member.ref);
      }
    }

    if (coords.length < 2) continue;
    const distanceKm = approximateDistanceKm(coords);
    if (distanceKm < 0.5) continue;

    trails.push({
      id: rel.id,
      name,
      distanceKm,
      coordinates: coords,
      difficulty: mapDifficulty(tags["piste:difficulty"]),
      area: tags["addr:city"] ?? tags["is_in:city"] ?? undefined,
    });
  }

  // Standalone ways not already claimed by a relation
  for (const way of Array.from(wayById.values())) {
    if (coveredWayIds.has(way.id)) continue;
    const tags = way.tags ?? {};
    const name = tags.name ?? tags["name:no"] ?? tags.ref ?? null;
    if (!name) continue;

    const coords: Coordinate[] = way.geometry!.map((g: { lat: number; lon: number }) => ({ lat: g.lat, lon: g.lon }));
    const distanceKm = approximateDistanceKm(coords);
    if (distanceKm < 0.2) continue;

    trails.push({
      id: way.id,
      name,
      distanceKm,
      coordinates: coords,
      difficulty: mapDifficulty(tags["piste:difficulty"]),
      area: undefined,
    });
  }

  return mergeByName(trails).sort((a, b) => b.distanceKm - a.distanceKm);
}

function mergeByName(trails: OsmTrail[]): OsmTrail[] {
  const map = new Map<string, OsmTrail>();
  for (const t of trails) {
    const key = t.name.toLowerCase().trim();
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...t });
    } else {
      existing.distanceKm += t.distanceKm;
      existing.coordinates = [...existing.coordinates, ...t.coordinates];
    }
  }
  return Array.from(map.values());
}

function mapDifficulty(raw?: string): string | undefined {
  const map: Record<string, string> = {
    easy:         "Easy",
    novice:       "Beginner",
    intermediate: "Intermediate",
    advanced:     "Challenging",
    expert:       "Expert",
  };
  return raw ? (map[raw] ?? raw) : undefined;
}

function approximateDistanceKm(coords: Coordinate[]): number {
  let d = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const a = coords[i];
    const b = coords[i + 1];
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLon = ((b.lon - a.lon) * Math.PI) / 180;
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((a.lat * Math.PI) / 180) *
        Math.cos((b.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    d += 2 * 6371 * Math.asin(Math.sqrt(h));
  }
  return d;
}
