import { cookies } from "next/headers";
import { getRoute, getCachedWeather } from "@/lib/db/client";
import { notFound } from "next/navigation";
import { RouteView } from "@/components/RouteView";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { simplifyRoute } from "@/lib/route-sampler";
import type { SportType, WeatherSegment } from "@/types";

interface Props {
  params: { id: string };
  searchParams: { sport?: string };
}

export default async function RoutePage({ params, searchParams }: Props) {
  const route = await getRoute(params.id);
  if (!route) notFound();

  const validSports: SportType[] = ["cycling", "skiing", "running"];
  const sport: SportType =
    (route.sport && validSports.includes(route.sport) ? route.sport : null) ??
    (validSports.includes(searchParams.sport as SportType) ? (searchParams.sport as SportType) : null) ??
    "cycling";

  const stravaConnected = !!(
    cookies().get("strava_access_token")?.value ||
    cookies().get("strava_refresh_token")?.value
  );

  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const backHref = user ? "/dashboard" : "/";

  // Prefetch weather from Supabase cache only (fast, ~50ms) — no MET API call here.
  // If not cached yet, the client fires its normal SWR fetch.
  const start = new Date();
  start.setMinutes(0, 0, 0);
  const cachedWeather = await getCachedWeather(route.id, start).catch(() => null) ?? null;
  const initialSegments: WeatherSegment[] | undefined = cachedWeather?.segments ?? undefined;

  // Apply a looser simplification (50m) for the client payload.
  // Stored coords use 10m tolerance; 50m is invisible on screen but ~60% fewer points.
  const displayCoords = simplifyRoute(route.coordinates, 50);

  return (
    <RouteView
      key={route.id}
      route={{
        id: route.id,
        name: route.name,
        source: route.source,
        coordinates: displayCoords,
        distanceKm: route.distance_km,
        elevationGainM: route.elevation_gain_m ?? undefined,
        createdAt: route.created_at,
        sport: route.sport ?? undefined,
      }}
      initialSport={sport}
      stravaConnected={stravaConnected}
      backHref={backHref}
      initialSegments={initialSegments}
    />
  );
}
