// Server-side client for the Vercel Web Analytics query API
// (https://vercel.com/docs/analytics/web-analytics-api). Reads the same
// aggregated data the Vercel dashboard shows — not the collection script
// (that's <Analytics /> in app/layout.tsx), just the read side.

const API_BASE = "https://api.vercel.com/v1/query/web-analytics";

export class AnalyticsNotConfiguredError extends Error {}

function requiredEnv(name: "VERCEL_API_TOKEN" | "VERCEL_PROJECT_ID"): string {
  const value = process.env[name];
  if (!value) {
    throw new AnalyticsNotConfiguredError(`Missing ${name}`);
  }
  return value;
}

function baseParams(): URLSearchParams {
  const params = new URLSearchParams();
  params.set("projectId", requiredEnv("VERCEL_PROJECT_ID"));
  const teamId = process.env.VERCEL_TEAM_ID;
  if (teamId) params.set("teamId", teamId);
  return params;
}

async function query<T>(path: string, params: URLSearchParams): Promise<T> {
  const token = requiredEnv("VERCEL_API_TOKEN");
  const res = await fetch(`${API_BASE}/${path}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    // Aggregated traffic stats don't need to be second-fresh — a short cache
    // keeps repeated admin page loads from re-querying the API every time.
    next: { revalidate: 300 },
  });
  if (!res.ok) {
    throw new Error(`Vercel Web Analytics API ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

export interface DateRange {
  since: string; // yyyy-MM-dd
  until: string; // yyyy-MM-dd
}

export interface TrafficTotals {
  pageviews: number;
  visitors: number;
}

export interface DailyPoint {
  date: string; // yyyy-MM-dd
  pageviews: number;
  visitors: number;
}

export interface RankedRow {
  label: string;
  pageviews: number;
  visitors: number;
}

export async function getTrafficTotals(range: DateRange): Promise<TrafficTotals> {
  const params = baseParams();
  params.set("since", range.since);
  params.set("until", range.until);
  const res = await query<{ data: TrafficTotals }>("visits/count", params);
  return res.data;
}

export async function getDailyTrend(range: DateRange): Promise<DailyPoint[]> {
  const params = baseParams();
  params.set("since", range.since);
  params.set("until", range.until);
  params.set("by", "day");
  const res = await query<{ data: { timestamp: string; pageviews: number; visitors: number }[] }>(
    "visits/aggregate",
    params
  );
  return res.data.map((row) => ({
    date: row.timestamp.slice(0, 10),
    pageviews: row.pageviews,
    visitors: row.visitors,
  }));
}

async function getTopBy(
  dimension: "route" | "country" | "referrerHostname" | "deviceType",
  range: DateRange,
  limit: number,
  fallbackLabel: string
): Promise<RankedRow[]> {
  const params = baseParams();
  params.set("since", range.since);
  params.set("until", range.until);
  params.set("by", dimension);
  params.set("limit", String(limit));
  const res = await query<{ data: Record<string, string | number>[] }>("visits/aggregate", params);
  return res.data.map((row) => ({
    label: (row[dimension] as string) || fallbackLabel,
    pageviews: Number(row.pageviews) || 0,
    visitors: Number(row.visitors) || 0,
  }));
}

export const getTopRoutes = (range: DateRange, limit = 8) =>
  getTopBy("route", range, limit, "/");

export const getTopCountries = (range: DateRange, limit = 8) =>
  getTopBy("country", range, limit, "Unknown");

export const getTopReferrers = (range: DateRange, limit = 8) =>
  getTopBy("referrerHostname", range, limit, "Direct");

export const getDeviceBreakdown = (range: DateRange, limit = 6) =>
  getTopBy("deviceType", range, limit, "Unknown");
