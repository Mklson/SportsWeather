import type { WeatherSegment } from "@/types";

export interface WaxRecommendation {
  product: string;
  code: string;
  colorHex: string;
  tempRangeLabel: string;
  snowState: "new" | "old";
  avgTemp: number;
}

export type WaxResult =
  | { kind: "no-data" }
  | { kind: "no-snow"; avgTemp: number }
  | ({ kind: "recommendation" } & WaxRecommendation);

// Above this average temperature, with no snowfall anywhere in the forecast,
// natural snow cover is unlikely to exist at all — recommending a klister
// here would be misleading (there'd be nothing to wax for).
const NO_SNOW_TEMP_C = 5;

/**
 * Recommends a Swix kick wax (hardwax, new/fine-grained snow) or klister
 * (old/transformed/icy snow) for the route, based on the average forecast
 * temperature and humidity across all weather segments, plus whether snow
 * is forecast to be falling anywhere along the route — used as a proxy for
 * new vs. old snow, since yr.no has no actual snow-surface-type field.
 *
 * Product names/codes/ranges are Swix's real festevoks (V-series hardwax)
 * and klister (K-series) lineup as published on swixsport.com. Their real
 * ranges overlap (a skier picks within the overlap based on exact snow age/
 * grain); the cutoffs below are a simplified non-overlapping picks for a
 * single deterministic recommendation, not a race-day guarantee.
 *
 * yr.no has no snow-cover field either, so "is there snow at all" is also
 * inferred: above NO_SNOW_TEMP_C with no snowfall forecast, assume there's
 * no snow to ski on rather than guessing a wax for a route that isn't
 * skiable.
 */
export function recommendWax(segments: WeatherSegment[]): WaxResult {
  if (!segments.length) return { kind: "no-data" };

  const avgTemp =
    segments.reduce((sum, s) => sum + s.weather.temperature, 0) / segments.length;

  const humidities = segments
    .map((s) => s.weather.humidity)
    .filter((h): h is number => h != null);
  const avgHumidity = humidities.length
    ? humidities.reduce((a, b) => a + b, 0) / humidities.length
    : null;

  const isSnowing = segments.some(
    (s) => s.weather.precipitation > 0 && s.weather.symbolCode.toLowerCase().includes("snow")
  );

  if (!isSnowing && avgTemp > NO_SNOW_TEMP_C) {
    return { kind: "no-snow", avgTemp };
  }

  // Very damp air near freezing behaves like wet/transformed snow even if
  // fresh snow is technically falling — treat it as "old" (klister territory).
  const wetBias = avgHumidity !== null && avgHumidity > 90 && avgTemp > -3;
  const snowState: "new" | "old" = isSnowing && !wetBias ? "new" : "old";

  if (snowState === "new") {
    if (avgTemp <= -13) return pick("V05 Polar Hardwax", "V05", "#166534", "−25°C to −12°C", snowState, avgTemp);
    if (avgTemp <= -9)  return pick("V20 Green Hardwax", "V20", "#16a34a", "−15°C to −8°C", snowState, avgTemp);
    if (avgTemp <= -5)  return pick("V30 Blue Hardwax", "V30", "#2563eb", "−10°C to −2°C", snowState, avgTemp);
    if (avgTemp <= -2)  return pick("V40 Blue Extra Hardwax", "V40", "#3b82f6", "−7°C to −1°C", snowState, avgTemp);
    if (avgTemp <= 0)   return pick("V45 Violet Special Hardwax", "V45", "#8b5cf6", "−3°C to 0°C", snowState, avgTemp);
    if (avgTemp <= 1)   return pick("V55 Red Special Hardwax", "V55", "#dc2626", "0°C to +1°C", snowState, avgTemp);
    if (avgTemp <= 3)   return pick("V60 Red/Silver Hardwax", "V60", "#ef4444", "0°C to +3°C", snowState, avgTemp);
    return pick("KX75 Red Extra Wet Klister", "KX75", "#eab308", "+2°C to +15°C", snowState, avgTemp);
  }

  if (avgTemp <= -8) return pick("KX30 Blue Ice Klister", "KX30", "#1d4ed8", "−12°C to 0°C", snowState, avgTemp);
  if (avgTemp <= -3)  return pick("KX35N Blue Extra Klister", "KX35N", "#3b82f6", "−8°C to 0°C", snowState, avgTemp);
  if (avgTemp <= 0)   return pick("KX45N Violet Special Klister", "KX45N", "#a855f7", "−4°C to +1°C", snowState, avgTemp);
  if (avgTemp <= 2)   return pick("K21S Universal Silver Klister", "K21S", "#94a3b8", "−5°C to +3°C", snowState, avgTemp);
  if (avgTemp <= 5)   return pick("KX65 Red Klister", "KX65", "#dc2626", "+1°C to +5°C", snowState, avgTemp);
  return pick("KX75 Red Extra Wet Klister", "KX75", "#eab308", "+2°C to +15°C", snowState, avgTemp);
}

function pick(
  product: string,
  code: string,
  colorHex: string,
  tempRangeLabel: string,
  snowState: "new" | "old",
  avgTemp: number
): WaxResult {
  return { kind: "recommendation", product, code, colorHex, tempRangeLabel, snowState, avgTemp };
}
