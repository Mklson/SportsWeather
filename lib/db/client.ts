import { createClient } from "@supabase/supabase-js";
import type { DbRoute, DbWeatherCache, StravaSegment } from "@/types";

// Used in Server Components and API routes
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Used in Client Components (anon key, respects RLS)
export const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Typed helpers ─────────────────────────────────────────────────────────

export async function saveRoute(route: Omit<DbRoute, "id" | "created_at">): Promise<DbRoute> {
  const { data, error } = await supabaseAdmin
    .from("routes")
    .insert(route)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getRoute(id: string): Promise<DbRoute | null> {
  const { data } = await supabaseAdmin
    .from("routes")
    .select("*")
    .eq("id", id)
    .single();
  return data;
}

export async function getCachedWeather(
  routeId: string,
  startTime: Date
): Promise<DbWeatherCache | null> {
  const { data } = await supabaseAdmin
    .from("weather_cache")
    .select("*")
    .eq("route_id", routeId)
    .eq("start_time", startTime.toISOString())
    .gte("expires_at", new Date().toISOString())
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function saveWeatherCache(
  cache: Omit<DbWeatherCache, "id">
): Promise<void> {
  await supabaseAdmin.from("weather_cache").upsert(cache, {
    onConflict: "route_id,start_time",
  });
}

export async function getCachedSegments(
  routeId: string,
  sport: string
): Promise<StravaSegment[] | null> {
  const { data } = await supabaseAdmin
    .from("segment_cache")
    .select("segments")
    .eq("route_id", routeId)
    .eq("sport", sport)
    .gte("expires_at", new Date().toISOString())
    .maybeSingle();
  return data ? (data.segments as StravaSegment[]) : null;
}

export async function saveSegmentCache(
  routeId: string,
  sport: string,
  segments: StravaSegment[]
): Promise<void> {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await supabaseAdmin.from("segment_cache").upsert(
    { route_id: routeId, sport, segments, expires_at: expiresAt },
    { onConflict: "route_id,sport" }
  );
}
