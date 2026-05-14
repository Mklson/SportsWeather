import { cookies } from "next/headers";
import { getRoute } from "@/lib/db/client";
import { notFound } from "next/navigation";
import { RouteView } from "@/components/RouteView";
import type { SportType } from "@/types";

interface Props {
  params: { id: string };
  searchParams: { sport?: string };
}

export default async function RoutePage({ params, searchParams }: Props) {
  const route = await getRoute(params.id);
  if (!route) notFound();

  const validSports: SportType[] = ["cycling", "skiing", "running"];
  const sport: SportType = validSports.includes(searchParams.sport as SportType)
    ? (searchParams.sport as SportType)
    : "cycling";

  const stravaConnected = !!cookies().get("strava_access_token")?.value;

  return (
    <RouteView
      route={{
        id: route.id,
        name: route.name,
        source: route.source,
        coordinates: route.coordinates,
        distanceKm: route.distance_km,
        elevationGainM: route.elevation_gain_m ?? undefined,
        createdAt: route.created_at,
      }}
      initialSport={sport}
      stravaConnected={stravaConnected}
    />
  );
}
