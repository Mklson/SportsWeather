import { parseStringPromise } from "xml2js";
import type { Coordinate } from "@/types";

export async function parseGpx(xml: string): Promise<Coordinate[]> {
  const doc = await parseStringPromise(xml, {
    explicitArray: true,
    ignoreAttrs: false,
    mergeAttrs: true,
  });

  const coords: Coordinate[] = [];

  // Support both <trk><trkseg><trkpt> and <rte><rtept>
  const gpx = doc.gpx;

  const extractPoints = (points: unknown[]): Coordinate[] => {
    const result: Coordinate[] = [];
    if (!Array.isArray(points)) return result;
    for (const pt of points) {
      const p = pt as Record<string, unknown>;
      const lat = parseFloat(p.lat as string);
      const lon = parseFloat(p.lon as string);
      if (isNaN(lat) || isNaN(lon)) continue;
      const eleArr = p.ele as string[] | undefined;
      const ele = eleArr ? parseFloat(eleArr[0]) : undefined;
      result.push({ lat, lon, ele: isNaN(ele as number) ? undefined : ele });
    }
    return result;
  };

  // Track points
  const trks = gpx?.trk as unknown[] | undefined;
  if (trks) {
    for (const trk of trks) {
      const t = trk as Record<string, unknown>;
      const trksegs = t.trkseg as unknown[] | undefined;
      if (trksegs) {
        for (const seg of trksegs) {
          const s = seg as Record<string, unknown>;
          coords.push(...extractPoints((s.trkpt as unknown[]) ?? []));
        }
      }
    }
  }

  // Route points
  const rtes = gpx?.rte as unknown[] | undefined;
  if (rtes) {
    for (const rte of rtes) {
      const r = rte as Record<string, unknown>;
      coords.push(...extractPoints((r.rtept as unknown[]) ?? []));
    }
  }

  if (coords.length === 0) {
    throw new Error("No coordinates found in GPX file");
  }

  return coords;
}
