import type { Coordinate } from "@/types";

const EARTH_RADIUS_M = 6_371_000;

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number) {
  return (rad * 180) / Math.PI;
}

/** Haversine distance between two coordinates in metres. */
export function haversineMetres(a: Coordinate, b: Coordinate): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLon * sinDLon;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** Forward bearing (degrees, 0 = north) from a to b. */
export function bearing(a: Coordinate, b: Coordinate): number {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLon = toRad(b.lon - a.lon);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Linear interpolation between two coordinates by fraction t ∈ [0,1]. */
function interpolate(a: Coordinate, b: Coordinate, t: number): Coordinate {
  return {
    lat: a.lat + (b.lat - a.lat) * t,
    lon: a.lon + (b.lon - a.lon) * t,
    ele:
      a.ele !== undefined && b.ele !== undefined
        ? a.ele + (b.ele - a.ele) * t
        : undefined,
  };
}

export interface SamplePoint {
  coordinate: Coordinate;
  distanceM: number;
  bearing: number;
}

/**
 * Walk the polyline and emit one sample point per `intervalM` metres.
 * The first point is always at 0 m; the last point always at total distance.
 */
export function sampleRoute(
  coords: Coordinate[],
  intervalM = 500
): SamplePoint[] {
  if (coords.length < 2) return [];

  const samples: SamplePoint[] = [];
  let accumulated = 0; // metres walked so far
  let nextSampleAt = 0; // metres at which to emit next sample

  for (let i = 0; i < coords.length - 1; i++) {
    const a = coords[i];
    const b = coords[i + 1];
    const segLen = haversineMetres(a, b);
    const segBearing = bearing(a, b);

    // Emit samples that fall within this segment
    while (nextSampleAt <= accumulated + segLen) {
      const t = segLen > 0 ? (nextSampleAt - accumulated) / segLen : 0;
      const coord = interpolate(a, b, Math.min(t, 1));
      samples.push({ coordinate: coord, distanceM: nextSampleAt, bearing: segBearing });
      nextSampleAt += intervalM;
    }

    accumulated += segLen;
  }

  // Always include the final point
  const last = coords[coords.length - 1];
  const secondLast = coords[coords.length - 2];
  const finalBearing = bearing(secondLast, last);
  if (samples.length === 0 || samples[samples.length - 1].distanceM < accumulated) {
    samples.push({ coordinate: last, distanceM: accumulated, bearing: finalBearing });
  }

  return samples;
}

/** Total route distance in kilometres. */
export function totalDistanceKm(coords: Coordinate[]): number {
  let total = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    total += haversineMetres(coords[i], coords[i + 1]);
  }
  return total / 1000;
}

/** Total elevation gain in metres. */
export function totalElevationGain(coords: Coordinate[]): number {
  let gain = 0;
  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i - 1].ele ?? 0;
    const curr = coords[i].ele ?? 0;
    if (curr > prev) gain += curr - prev;
  }
  return gain;
}
