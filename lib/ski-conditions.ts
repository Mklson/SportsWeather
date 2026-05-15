import type { SkiConditions, SkiQuality, PointWeather } from "@/types";

/**
 * Classify cross-country ski conditions based on temperature and weather.
 *
 * Norwegian snow quality guide:
 *  -15°C and below  → very cold, hard snow, needs cold wax
 *  -10 to -5°C      → ideal classic conditions (cold wax)
 *  -5 to -1°C       → perfect all-round (universal/violet wax)
 *  -1 to  0°C       → tricky transition zone
 *   0 to  2°C       → wet snow, klister needed
 *   above 2°C       → icy/slushy, poor conditions
 */
export function classifySkiConditions(weather: PointWeather): SkiConditions {
  const t = weather.temperature;
  const isSnowing =
    weather.precipitation > 0 &&
    (weather.symbolCode.includes("snow") || weather.symbolCode.includes("sleet") || t < 0);

  let quality: SkiQuality;
  let label: string;
  let color: string;
  let waxHint: string;

  if (t <= -15) {
    quality = "good";
    label = "Cold";
    color = "#93c5fd"; // blue-300
    waxHint = "Cold wax (green/blue)";
  } else if (t <= -5) {
    quality = "perfect";
    label = "Perfect conditions";
    color = "#10b981"; // green
    waxHint = "Cold wax (blue/purple)";
  } else if (t <= -1) {
    quality = "perfect";
    label = "Excellent conditions";
    color = "#34d399"; // green-400
    waxHint = "Universal/violet wax";
  } else if (t <= 0) {
    quality = "variable";
    label = "Transition snow";
    color = "#f59e0b"; // amber
    waxHint = "Violet wax or klister";
  } else if (t <= 3) {
    quality = "wet";
    label = "Wet snow";
    color = "#f97316"; // orange
    waxHint = "Klister (red)";
  } else {
    quality = "icy";
    label = "Poor conditions";
    color = "#ef4444"; // red
    waxHint = "Ice/slush – klister or skating";
  }

  // Bonus: fresh snow improves conditions
  if (isSnowing && quality !== "icy") {
    label = `${label} – fresh snow`;
  }

  return { quality, label, color, waxHint };
}

/** Feels-like temperature on skis (wind chill). */
export function skiFeelsLike(tempC: number, windMs: number): number {
  if (windMs < 1) return tempC;
  return Math.round(
    13.12 +
      0.6215 * tempC -
      11.37 * Math.pow(windMs, 0.16) +
      0.3965 * tempC * Math.pow(windMs, 0.16)
  );
}

/** Simple snow coverage emoji. */
export function snowCoverageIcon(symbolCode: string, tempC: number): string {
  if (symbolCode.includes("snow")) return "❄️";
  if (symbolCode.includes("sleet")) return "🌨️";
  if (tempC < -10) return "🥶";
  if (tempC < 0) return "⛄";
  if (tempC < 5) return "❄️";
  return "🌡️";
}
