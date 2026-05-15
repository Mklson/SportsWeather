import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { listStravaActivities, listStravaRoutes } from "@/lib/strava";
import { StravaImportPage } from "@/components/route/StravaImportPage";
import { StravaAuthButton } from "@/components/route/StravaAuthButton";

export default async function StravaActivitiesPage() {
  const cookieStore = cookies();
  const token = cookieStore.get("strava_access_token")?.value;

  if (!token) redirect("/api/strava/refresh");

  let activities: Awaited<ReturnType<typeof listStravaActivities>> = [];
  let routes: Awaited<ReturnType<typeof listStravaRoutes>> = [];

  const [activitiesResult, routesResult] = await Promise.allSettled([
    listStravaActivities(token, 1, 30),
    listStravaRoutes(token, 1, 30),
  ]);

  if (activitiesResult.status === "rejected") {
    console.error("[strava/activities] activities fetch failed:", activitiesResult.reason);
    // Don't redirect — that can cause an infinite loop. Show an error with a re-auth link.
    return (
      <main className="min-h-screen p-4 max-w-5xl mx-auto flex flex-col items-center justify-center gap-4">
        <p className="text-red-400 text-center">
          Kunne ikke hente Strava-data. Token kan være utløpt.
        </p>
        <StravaAuthButton label="Logg inn med Strava på nytt" />
      </main>
    );
  }

  activities = activitiesResult.value;

  if (routesResult.status === "rejected") {
    console.error("[strava/activities] routes fetch failed (non-fatal):", routesResult.reason);
  } else {
    routes = routesResult.value;
  }

  return (
    <main className="min-h-screen p-4 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Importer fra Strava</h1>
      <StravaImportPage
        activities={activities.map((a) => ({
          id: a.id,
          name: a.name,
          distanceKm: Math.round(a.distanceM / 10) / 100,
          startDate: a.start_date,
          type: a.type,
        }))}
        routes={routes}
      />
    </main>
  );
}
