import { parseStringPromise } from "xml2js";
import type { Coordinate, KartverketTrail, SportType } from "@/types";
import { geocodeToBbox } from "@/lib/overpass";
import { totalDistanceKm } from "@/lib/route-sampler";

// Kartverket's national hiking/ski/cycling trail database ("Turrutebasen"),
// served as an open OGC WFS — no API key required.
// https://kartkatalog.geonorge.no/metadata/turrutebasen-wfs
const WFS_URL = "https://wfs.geonorge.no/skwms1/wfs.turogfriluftsruter";

// Geometry is returned in EPSG:4258 (ETRS89) — for this app's purposes
// (map display, weather lookups) that's indistinguishable from WGS84/EPSG:4326,
// off by at most ~1m across Europe. The WFS's native axis order for this CRS
// is lat,lon (NOT lon,lat like GeoJSON) — confirmed empirically; getting this
// backwards would silently place every imported trail in the wrong location.
const FEATURE_TYPES: { typeName: string; sport: SportType }[] = [
  { typeName: "Fotrute", sport: "running" },
  { typeName: "Skiløype", sport: "skiing" },
  { typeName: "Sykkelrute", sport: "cycling" },
];

// Kartverket stores each named trail as many short segments, not one merged
// line — a single popular trail network can have hundreds of fragments in a
// dense area. Fetch generously per type, then merge fragments sharing a name
// back into whole trails (see mergeByName), or a search like "Vestmarka"
// mostly returns arbitrary unnamed fragments instead of the real trails.
const RAW_FETCH_PER_TYPE = 200;
const MAX_RESULTS_PER_TYPE = 20;
const MIN_DISTANCE_KM = 0.3;
// Kartverket uses this literal placeholder for trail segments with no assigned name.
const PLACEHOLDER_NAMES = new Set(["ukjent", "-", ""]);

export interface Bbox {
  south: number;
  west: number;
  north: number;
  east: number;
}

export async function searchKartverketTrails(query: string): Promise<KartverketTrail[]> {
  if (!query || query.trim().length < 2) return [];

  const bbox = await geocodeToBbox(query.trim());
  if (!bbox) return [];

  return searchKartverketTrailsInBbox(bbox);
}

/** Same search, but for an explicit area (e.g. the visible bounds of a map the user panned/zoomed) instead of a geocoded place name. */
export async function searchKartverketTrailsInBbox(bbox: Bbox): Promise<KartverketTrail[]> {
  const results = await Promise.allSettled(
    FEATURE_TYPES.map((ft) => fetchFeatureType(ft.typeName, ft.sport, bbox))
  );

  const trails = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  return trails.sort((a, b) => b.distanceKm - a.distanceKm);
}

async function fetchFeatureType(
  typeName: string,
  sport: SportType,
  bbox: { south: number; west: number; north: number; east: number }
): Promise<KartverketTrail[]> {
  const params = new URLSearchParams({
    service: "WFS",
    version: "2.0.0",
    request: "GetFeature",
    typeNames: `app:${typeName}`,
    bbox: `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`,
    count: String(RAW_FETCH_PER_TYPE),
  });

  const res = await fetch(`${WFS_URL}?${params}`, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`Kartverket WFS error (${typeName}): ${res.status}`);

  const xml = await res.text();
  const doc = await parseStringPromise(xml, { explicitArray: true });

  const members = doc?.["wfs:FeatureCollection"]?.["wfs:member"] as unknown[] | undefined;
  if (!members?.length) return [];

  const fragments: KartverketTrail[] = [];
  for (const member of members) {
    const featureWrapper = member as Record<string, unknown[]>;
    const featureArr = Object.values(featureWrapper)[0];
    const feature = featureArr?.[0];
    if (!feature) continue;

    const id = (feature as { $?: Record<string, string> }).$?.["gml:id"];
    const name = collectStrings(feature, "rutenavn")[0]?.trim();
    const posLists = collectStrings(feature, "posList");
    if (!id || !name || PLACEHOLDER_NAMES.has(name.toLowerCase()) || !posLists.length) continue;

    const coordinates = posLists.flatMap(parsePosList);
    if (coordinates.length < 2) continue;

    fragments.push({ id, name, sport, distanceKm: totalDistanceKm(coordinates), coordinates });
  }

  const merged = mergeByName(fragments).filter((t) => t.distanceKm >= MIN_DISTANCE_KM);
  merged.sort((a, b) => b.distanceKm - a.distanceKm);
  return merged.slice(0, MAX_RESULTS_PER_TYPE);
}

/** Combines same-named fragments into one trail (summed length, concatenated coordinates — same approximation as the OSM search's mergeByName). */
function mergeByName(fragments: KartverketTrail[]): KartverketTrail[] {
  const map = new Map<string, KartverketTrail>();
  for (const f of fragments) {
    const key = f.name.toLowerCase();
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...f });
    } else {
      existing.coordinates = [...existing.coordinates, ...f.coordinates];
      existing.distanceKm += f.distanceKm;
    }
  }
  return Array.from(map.values());
}

/** lat,lon pairs, space-separated (WFS posList convention) — see FEATURE_TYPES comment on axis order. */
function parsePosList(posList: string): Coordinate[] {
  const nums = posList.trim().split(/\s+/).map(Number);
  const coords: Coordinate[] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const lat = nums[i];
    const lon = nums[i + 1];
    if (!Number.isNaN(lat) && !Number.isNaN(lon)) coords.push({ lat, lon });
  }
  return coords;
}

/**
 * xml2js keeps namespace prefixes as part of each key (e.g. "app:rutenavn",
 * "gml:posList"), and the exact nesting differs per feature type (fotruteInfo
 * vs. skiløypeInfo vs. sykkelruteInfo). Rather than hardcode each type's
 * schema path, walk the whole feature tree and collect every string value
 * under a key ending in `:${tagSuffix}`, in document order.
 */
function collectStrings(node: unknown, tagSuffix: string): string[] {
  if (node == null || typeof node === "string") return [];

  if (Array.isArray(node)) {
    return node.flatMap((item) => collectStrings(item, tagSuffix));
  }

  if (typeof node === "object") {
    const out: string[] = [];
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      const isMatch = key === tagSuffix || key.endsWith(`:${tagSuffix}`);
      if (isMatch) {
        if (typeof value === "string") out.push(value);
        else if (Array.isArray(value) && typeof value[0] === "string") out.push(value[0]);
        continue;
      }
      out.push(...collectStrings(value, tagSuffix));
    }
    return out;
  }

  return [];
}
