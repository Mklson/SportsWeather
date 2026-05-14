import type { WindClass, WindStrength } from "@/types";

/**
 * MET API reports wind direction as "from where the wind blows" in degrees.
 * Route bearing is the direction we are travelling.
 *
 * We convert to the angle the wind is blowing TOWARDS (add 180°), then
 * compare to route bearing to find relative angle.
 *
 * Relative angle (absolute, 0–180°):
 *   0–45°   → tailwind   (wind pushing us)
 *  45–135°  → crosswind
 * 135–180°  → headwind   (wind against us)
 */
export function classifyWind(
  routeBearing: number,
  windFrom: number
): { windClass: WindClass; relativeAngle: number } {
  const windTo = (windFrom + 180) % 360;
  let diff = Math.abs(routeBearing - windTo) % 360;
  if (diff > 180) diff = 360 - diff;

  let windClass: WindClass;
  if (diff <= 45) windClass = "tailwind";
  else if (diff <= 135) windClass = "crosswind";
  else windClass = "headwind";

  return { windClass, relativeAngle: diff };
}

export function windClassColor(wc: WindClass): string {
  switch (wc) {
    case "tailwind":
      return "#10b981"; // green
    case "crosswind":
      return "#f59e0b"; // amber
    case "headwind":
      return "#ef4444"; // red
  }
}

export function windClassLabel(wc: WindClass): string {
  switch (wc) {
    case "tailwind":
      return "Medvind";
    case "crosswind":
      return "Sidevind";
    case "headwind":
      return "Motvind";
  }
}

export function windStrengthLabel(ws: WindStrength): string {
  switch (ws) {
    case "calm":
      return "Stille";
    case "light":
      return "Svak";
    case "moderate":
      return "Moderat";
    case "strong":
      return "Sterk";
    case "storm":
      return "Storm";
  }
}

/** Beaufort-style wind strength icon character. */
export function windStrengthEmoji(ws: WindStrength): string {
  switch (ws) {
    case "calm":
      return "🍃";
    case "light":
      return "💨";
    case "moderate":
      return "🌬";
    case "strong":
      return "🌀";
    case "storm":
      return "⛈";
  }
}

/** Rain intensity css class based on mm/hour. */
export function precipitationColor(mmPerHour: number): string {
  if (mmPerHour <= 0) return "transparent";
  if (mmPerHour < 0.5) return "#bfdbfe"; // blue-200
  if (mmPerHour < 2) return "#93c5fd"; // blue-300
  if (mmPerHour < 5) return "#3b82f6"; // blue-500
  return "#1d4ed8"; // blue-700
}
