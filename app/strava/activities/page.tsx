import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { listStravaActivities, listStravaRoutes } from "@/lib/strava";
import { StravaImportPage } from "@/components/route/StravaImportPage";

export default async function StravaActivitiesPage({
  searchParams,
}: {
  searchParams: { retried?: string };
}) {
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

    // First failure: auto-refresh the token and come back. The refresh endpoint
    // redirects to ?retried=1 so we only do this once and avoid infinite loops.
    if (!searchParams.retried) {
      redirect("/api/strava/refresh");
    }

    // Already retried — show a manual re-auth link.
    return (
      <main className="min-h-screen p-4 max-w-5xl mx-auto flex flex-col items-center justify-center gap-4">
        <p className="text-red-400 text-center">
          Kunne ikke hente Strava-data. Prøv å logge inn på nytt.
        </p>
        <a
          href="/api/strava/auth"
          className="px-5 py-2.5 bg-[#FC4C02] hover:bg-[#e04300] text-white rounded-xl font-medium transition-colors"
        >
          Logg inn med Strava
        </a>
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
