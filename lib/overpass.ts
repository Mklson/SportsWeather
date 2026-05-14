import type { OsmTrail, Coordinate } from "@/types";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "SportsWeather/1.0";

interface NominatimResult {
  boundingbox: [string, string, string, string]; // [minlat, maxlat, minlon, maxlon]
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

interface OverpassResponse {
  elements: OverpassWay[];
}

/**
 * Search for Nordic ski trails by area name.
 * Step 1: Geocode the query with Nominatim to get a bounding box.
 * Step 2: Query Overpass for ski pistes within that bbox.
 */
export async function searchSkiTrails(query: string): Promise<OsmTrail[]> {
  if (!query || query.trim().length < 2) return [];

  // Step 1: Geocode
  const bbox = await geocodeToBbox(query.trim());
  if (!bbox) return [];

  // Step 2: Fetch ski trails in bbox
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

  // Expand bbox a bit to catch trails on the edges
  const latPad = 0.05;
  const lonPad = 0.08;

  return {
    south: parseFloat(minlat) - latPad,
    north: parseFloat(maxlat) + latPad,
    west: parseFloat(minlon) - lonPad,
    east: parseFloat(maxlon) + lonPad,
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

  // Cast a wide net: nordic pistes, ski routes, and classic tracks
  const overpassQuery = `
[out:json][timeout:25];
(
  way["piste:type"="nordic"](${bb});
  way["piste:type"="classic"](${bb});
  way["route"="ski"](${bb});
  way["sport"="skiing"]["highway"](${bb});
);
out geom;
`.trim();

  const res = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(overpassQuery)}`,
  });

  if (!res.ok) throw new Error(`Overpass error: ${res.status}`);

  const data = (await res.json()) as OverpassResponse;
  return parseWays(data).slice(0, limit);
}

function parseWays(data: OverpassResponse): OsmTrail[] {
  const trails: OsmTrail[] = [];

  for (const el of data.elements) {
    if (el.type !== "way" || !el.geometry || el.geometry.length < 2) continue;

    const tags = el.tags ?? {};
    const name =
      tags.name ??
      tags["name:no"] ??
      tags.ref ??
      null;

    if (!name) continue; // skip unnamed fragments

    const coords: Coordinate[] = el.geometry.map((g) => ({ lat: g.lat, lon: g.lon }));
    const distanceKm = approximateDistanceKm(coords);
    if (distanceKm < 0.2) continue;

    const difficulty = mapDifficulty(tags["piste:difficulty"]);
    const area = tags["addr:city"] ?? tags["is_in:city"] ?? undefined;

    trails.push({ id: el.id, name, distanceKm, coordinates: coords, difficulty, area });
  }

  // Merge segments with same name, sort by length
  return mergeByName(trails).sort((a, b) => b.distanceKm - a.distanceKm);
}

/** Merge short segments that share the same name into one trail. */
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
    easy: "Enkel",
    novice: "Nybegynner",
    intermediate: "Middels",
    advanced: "Krevende",
    expert: "Ekspert",
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
