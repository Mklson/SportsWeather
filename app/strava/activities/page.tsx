import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { listStravaActivities, listStravaRoutes } from "@/lib/strava";
import { StravaImportPage } from "@/components/route/StravaImportPage";

export default async function StravaActivitiesPage() {
  const cookieStore = cookies();
  const token = cookieStore.get("strava_access_token")?.value;

  if (!token) redirect("/api/strava/auth");

  let activities: Awaited<ReturnType<typeof listStravaActivities>> = [];
  let routes: Awaited<ReturnType<typeof listStravaRoutes>> = [];

  try {
    [activities, routes] = await Promise.all([
      listStravaActivities(token, 1, 30),
      listStravaRoutes(token, 1, 30),
    ]);
  } catch {
    redirect("/?error=strava_fetch_failed");
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
