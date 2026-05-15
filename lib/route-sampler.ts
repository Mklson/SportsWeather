import type { Coordinate, SportType } from "@/types";

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

/** Default flat speed in km/h per sport. */
export const DEFAULT_SPEED_KMH: Record<SportType, number> = {
  cycling: 20,
  running: 10,
  skiing:  12,
};

/**
 * Returns effective speed adjusted for slope.
 * Uphill reduces speed, downhill increases it (capped at 2.5× base).
 */
export function gradeAdjustedSpeed(
  baseSpeedKmh: number,
  gradePercent: number,
  sport: SportType
): number {
  // Sensitivity differs per sport: cycling loses speed faster on uphills
  const factor = sport === "cycling" ? 0.055 : sport === "running" ? 0.08 : 0.10;
  const adjusted = baseSpeedKmh / (1 + factor * gradePercent);
  return Math.max(2, Math.min(adjusted, baseSpeedKmh * 2.5));
}

/**
 * For each sample point, compute the estimated wall-clock arrival time
 * using grade-adjusted speed. Returns one Date per sample.
 */
export function estimateSegmentTimes(
  samples: SamplePoint[],
  startTime: Date,
  baseSpeedKmh: number,
  sport: SportType
): Date[] {
  const times: Date[] = [new Date(startTime)];
  let cumulativeMs = 0;

  for (let i = 1; i < samples.length; i++) {
    const distM    = samples[i].distanceM - samples[i - 1].distanceM;
    const prevEle  = samples[i - 1].coordinate.ele ?? 0;
    const currEle  = samples[i].coordinate.ele ?? 0;
    const grade    = distM > 0 ? ((currEle - prevEle) / distM) * 100 : 0;
    const speed    = gradeAdjustedSpeed(baseSpeedKmh, grade, sport);
    cumulativeMs  += ((distM / 1000) / speed) * 3_600_000;
    times.push(new Date(startTime.getTime() + cumulativeMs));
  }

  return times;
}

/**
 * Total estimated route duration in hours, accounting for slope.
 * Computed directly from raw coordinates (no sampling needed).
 */
export function estimateTotalDuration(
  coords: Coordinate[],
  baseSpeedKmh: number,
  sport: SportType
): number {
  let totalHours = 0;
  for (let i = 1; i < coords.length; i++) {
    const distM   = haversineMetres(coords[i - 1], coords[i]);
    const prevEle = coords[i - 1].ele ?? 0;
    const currEle = coords[i].ele ?? 0;
    const grade   = distM > 0 ? ((currEle - prevEle) / distM) * 100 : 0;
    const speed   = gradeAdjustedSpeed(baseSpeedKmh, grade, sport);
    totalHours   += (distM / 1000) / speed;
  }
  return totalHours;
}

// ─── Douglas-Peucker simplification ──────────────────────────────────────────

/**
 * Simplify a GPS polyline using Douglas-Peucker.
 * Removes points that deviate less than `toleranceM` metres from the straight
 * line between their neighbours. Reduces GPS noise and point count while
 * preserving all meaningful turns.
 */
export function simplifyRoute(coords: Coordinate[], toleranceM = 10): Coordinate[] {
  if (coords.length <= 2) return coords;
  return dpReduce(coords, toleranceM);
}

function dpReduce(coords: Coordinate[], tolerance: number): Coordinate[] {
  if (coords.length <= 2) return [...coords];

  const first = coords[0];
  const last  = coords[coords.length - 1];

  let maxDist = 0;
  let maxIdx  = 0;

  for (let i = 1; i < coords.length - 1; i++) {
    const d = ptSegDist(coords[i], first, last);
    if (d > maxDist) { maxDist = d; maxIdx = i; }
  }

  if (maxDist > tolerance) {
    const left  = dpReduce(coords.slice(0, maxIdx + 1), tolerance);
    const right = dpReduce(coords.slice(maxIdx),         tolerance);
    return [...left.slice(0, -1), ...right];
  }

  return [first, last];
}

/** Perpendicular distance (metres) from `p` to line segment [a, b]. */
function ptSegDist(p: Coordinate, a: Coordinate, b: Coordinate): number {
  const cosLat     = Math.cos((a.lat * Math.PI) / 180);
  const mPerDegLat = 111_320;
  const mPerDegLon = 111_320 * cosLat;

  const bx = (b.lon - a.lon) * mPerDegLon;
  const by = (b.lat - a.lat) * mPerDegLat;
  const px = (p.lon  - a.lon) * mPerDegLon;
  const py = (p.lat  - a.lat) * mPerDegLat;

  const lenSq = bx * bx + by * by;
  if (lenSq === 0) return Math.sqrt(px * px + py * py);
  return Math.abs(bx * py - by * px) / Math.sqrt(lenSq);
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
