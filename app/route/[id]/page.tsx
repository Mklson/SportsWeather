import { cookies } from "next/headers";
import { getRoute } from "@/lib/db/client";
import { notFound } from "next/navigation";
import { RouteView } from "@/components/RouteView";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SportType } from "@/types";

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

  return (
    <RouteView
      key={route.id}
      route={{
        id: route.id,
        name: route.name,
        source: route.source,
        coordinates: route.coordinates,
        distanceKm: route.distance_km,
        elevationGainM: route.elevation_gain_m ?? undefined,
        createdAt: route.created_at,
        sport: route.sport ?? undefined,
      }}
      initialSport={sport}
      stravaConnected={stravaConnected}
      backHref={backHref}
    />
  );
}
