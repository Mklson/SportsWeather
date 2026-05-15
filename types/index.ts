// ─── Sport type ────────────────────────────────────────────────────────────

export type SportType = "cycling" | "skiing" | "running";

export interface SportConfig {
  type: SportType;
  label: string;
  emoji: string;
}

export const SPORT_CONFIGS: SportConfig[] = [
  { type: "cycling", label: "Sykkel", emoji: "🚴" },
  { type: "skiing", label: "Langrenn", emoji: "⛷️" },
  { type: "running", label: "Løping", emoji: "🏃" },
];

// ─── Ski conditions ────────────────────────────────────────────────────────

export type SkiQuality = "perfect" | "good" | "wet" | "icy" | "variable";

export interface SkiConditions {
  quality: SkiQuality;
  label: string;
  color: string;
  waxHint: string;
}

// ─── OSM trail ─────────────────────────────────────────────────────────────

export interface OsmTrail {
  id: number;
  name: string;
  distanceKm: number;
  coordinates: Coordinate[];
  difficulty?: string; // easy / intermediate / advanced
  area?: string;
}

// ─── Geo primitives ────────────────────────────────────────────────────────

export interface Coordinate {
  lat: number;
  lon: number;
  ele?: number; // elevation in metres
}

// ─── Route ─────────────────────────────────────────────────────────────────

export type RouteSource = "strava" | "garmin" | "gpx" | "tcx";

export interface Route {
  id: string;
  name: string;
  source: RouteSource;
  coordinates: Coordinate[];
  distanceKm: number;
  elevationGainM?: number;
  createdAt: string; // ISO
  userId?: string;
  sport?: SportType;
}

export interface StravaActivity {
  id: number;
  name: string;
  distanceM: number;
  movingTimeS: number;
  map: { summary_polyline: string };
  start_date: string;
  type: string;
}

// ─── Weather ───────────────────────────────────────────────────────────────

export interface PointWeather {
  temperature: number; // °C
  windSpeed: number; // m/s
  windDirection: number; // meteorological degrees (0 = from north)
  precipitation: number; // mm/hour
  cloudCover: number; // %
  symbolCode: string; // MET symbol e.g. "clearsky_day"
  humidity?: number; // %
  feelsLike?: number; // °C
}

// ─── Wind classification ───────────────────────────────────────────────────

export type WindClass = "tailwind" | "crosswind" | "headwind";

export type WindStrength = "calm" | "light" | "moderate" | "strong" | "storm";

export function windStrengthFromMs(ms: number): WindStrength {
  if (ms < 1) return "calm";
  if (ms < 6) return "light";
  if (ms < 12) return "moderate";
  if (ms < 20) return "strong";
  return "storm";
}

// ─── Weather segment ───────────────────────────────────────────────────────

export interface WeatherSegment {
  index: number;
  startKm: number;
  endKm: number;
  coordinate: Coordinate;
  bearing: number; // route direction in degrees (0 = north)
  weather: PointWeather;
  windClass: WindClass;
  windRelativeAngle: number; // angle between wind and route
  windStrength: WindStrength;
  color: string; // tailwind/crosswind/headwind hex color
}

// ─── API payloads ──────────────────────────────────────────────────────────

export interface WeatherRequest {
  coordinates: Coordinate[];
  startTime: string; // ISO datetime
}

export interface WeatherResponse {
  segments: WeatherSegment[];
  fetchedAt: string;
}

export interface UploadResponse {
  route: Route;
}

// ─── Database schema types (mirrors Supabase tables) ──────────────────────

export interface DbRoute {
  id: string;
  user_id: string | null;
  name: string;
  source: RouteSource;
  coordinates: Coordinate[]; // stored as JSONB
  distance_km: number;
  elevation_gain_m: number | null;
  external_id: string | null;
  sport: SportType | null;
  created_at: string;
}

// ─── Strava segments ──────────────────────────────────────────────────────────

export interface StravaRoute {
  id: number;
  name: string;
  distanceM: number;
  elevationGain: number;
  type: 1 | 2 | 3; // 1=ride, 2=run, 3=walk
  timestamp: number; // unix
  hasSummaryPolyline: boolean;
  summaryPolyline?: string;
}

export interface StravaSegment {
  id: number;
  name: string;
  distanceM: number;
  avgGrade: number;
  elevDifference: number;
  climbCategory: number; // 0 = not categorised, 1–5 = HC
  startLatLng: [number, number];
  endLatLng: [number, number];
  coordinates: Coordinate[]; // decoded from Strava's encoded polyline
  starred?: boolean;
}

export interface DbWeatherCache {
  id: string;
  route_id: string;
  start_time: string;
  segments: WeatherSegment[]; // stored as JSONB
  fetched_at: string;
  expires_at: string;
}
