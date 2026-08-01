import type { WeatherSegment } from "@/types";

export function nearestWeatherSegment(
  latLng: [number, number],
  weatherSegments: WeatherSegment[]
): WeatherSegment | null {
  if (!weatherSegments.length) return null;
  let nearest = weatherSegments[0];
  let minDist = Infinity;
  for (const ws of weatherSegments) {
    const dlat = latLng[0] - ws.coordinate.lat;
    const dlon = latLng[1] - ws.coordinate.lon;
    const d = dlat * dlat + dlon * dlon;
    if (d < minDist) { minDist = d; nearest = ws; }
  }
  return nearest;
}

export function nearestWindClass(
  startLatLng: [number, number],
  weatherSegments: WeatherSegment[]
): WeatherSegment["windClass"] | null {
  return nearestWeatherSegment(startLatLng, weatherSegments)?.windClass ?? null;
}

export function weatherEmoji(code: string): string {
  const c = code.toLowerCase();
  const isNight    = c.includes("_night");
  const isTwilight = c.includes("_polartwilight");
  if (c.includes("thunder"))      return "⛈️";
  if (c.includes("heavyrain"))    return "⛈️";
  if (c.includes("rain"))         return "🌧️";
  if (c.includes("snow"))         return "❄️";
  if (c.includes("sleet"))        return "🌨️";
  if (c.includes("fog"))          return "🌫️";
  if (c.includes("clearsky"))     return isNight ? "🌙" : isTwilight ? "🌅" : "☀️";
  if (c.includes("fair"))         return isNight ? "🌙" : isTwilight ? "🌅" : "🌤️";
  if (c.includes("partlycloudy")) return isNight ? "☁️" : "⛅";
  return "☁️";
}

export function windClassBorderColor(wc: WeatherSegment["windClass"] | null): string {
  if (wc === "tailwind")  return "#10b981";
  if (wc === "crosswind") return "#f59e0b";
  if (wc === "headwind")  return "#ef4444";
  return "#e5e7eb";
}

export interface WindBreakdown {
  tailPct: number;
  crossPct: number;
  headPct: number;
}

// Distance-weighted so a long flat headwind stretch counts more than a short one —
// shared by WindBreakdownBar's bar chart and the Conditions panel's summary.
export function windBreakdown(segments: WeatherSegment[]): WindBreakdown | null {
  const totalKm = segments.reduce((sum, s) => sum + (s.endKm - s.startKm), 0);
  if (totalKm === 0) return null;

  const tail = segments.filter(s => s.windClass === "tailwind").reduce((sum, s) => sum + (s.endKm - s.startKm), 0);
  const head = segments.filter(s => s.windClass === "headwind").reduce((sum, s) => sum + (s.endKm - s.startKm), 0);

  const tailPct = Math.round((tail / totalKm) * 100);
  const headPct = Math.round((head / totalKm) * 100);
  const crossPct = 100 - tailPct - headPct;

  return { tailPct, crossPct, headPct };
}

export interface ConditionsSummary {
  wind: WindBreakdown | null;
  avgTempC: number;
  dominantSymbolCode: string;
  wetSegmentPct: number; // % of segments with meaningful precipitation
}

// Precipitation is a rate (mm/hour) sampled at each segment's estimated arrival time,
// not a total — "wetSegmentPct" is how much of the route is expected to see any rain/snow,
// which reads more usefully to a rider than an averaged mm/hour figure would.
export function summarizeConditions(segments: WeatherSegment[]): ConditionsSummary | null {
  if (segments.length === 0) return null;

  const avgTempC = segments.reduce((sum, s) => sum + s.weather.temperature, 0) / segments.length;

  const wetCount = segments.filter((s) => s.weather.precipitation > 0.1).length;
  const wetSegmentPct = Math.round((wetCount / segments.length) * 100);

  const symbolCounts = new Map<string, number>();
  for (const s of segments) {
    symbolCounts.set(s.weather.symbolCode, (symbolCounts.get(s.weather.symbolCode) ?? 0) + 1);
  }
  let dominantSymbolCode = segments[0].weather.symbolCode;
  let maxCount = 0;
  symbolCounts.forEach((count, code) => {
    if (count > maxCount) { maxCount = count; dominantSymbolCode = code; }
  });

  return { wind: windBreakdown(segments), avgTempC, dominantSymbolCode, wetSegmentPct };
}
