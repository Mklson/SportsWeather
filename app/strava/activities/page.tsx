import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { listStravaActivities } from "@/lib/strava";
import { StravaActivityList } from "@/components/route/StravaActivityList";

export default async function StravaActivitiesPage() {
  const cookieStore = cookies();
  const token = cookieStore.get("strava_access_token")?.value;

  if (!token) redirect("/api/strava/auth");

  let activities;
  try {
    activities = await listStravaActivities(token, 1, 30);
  } catch {
    redirect("/?error=strava_fetch_failed");
  }

  return (
    <main className="min-h-screen p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">
        Velg en Strava-aktivitet
      </h1>
      <StravaActivityList
        activities={activities.map((a) => ({
          id: a.id,
          name: a.name,
          distanceKm: Math.round(a.distanceM / 10) / 100,
          startDate: a.start_date,
          type: a.type,
        }))}
      />
    </main>
  );
}
