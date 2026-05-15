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

    const errorMsg =
      activitiesResult.reason instanceof Error
        ? activitiesResult.reason.message
        : String(activitiesResult.reason);

    const isRateLimit = errorMsg.includes("429");
    const isUnauthorized = errorMsg.includes("401");

    // 429: token is fine, just too many requests. Don't auto-refresh — show a wait message.
    if (isRateLimit) {
      return (
        <main className="min-h-screen p-4 max-w-5xl mx-auto flex flex-col items-center justify-center gap-4">
          <p className="text-yellow-400 text-center font-medium">
            You have reached Strava&apos;s rate limit.
          </p>
          <p className="text-zinc-400 text-sm text-center">
            Wait a few minutes and try again.
          </p>
          <a
            href="/strava/activities"
            className="px-5 py-2.5 bg-zinc-700 hover:bg-zinc-600 text-white rounded-xl font-medium transition-colors"
          >
            Try again
          </a>
        </main>
      );
    }

    // 401: token expired. Auto-refresh once, then fall through to manual re-auth.
    if (isUnauthorized && !searchParams.retried) {
      redirect("/api/strava/refresh");
    }

    // Already retried, or some other error — show manual re-auth.
    return (
      <main className="min-h-screen p-4 max-w-5xl mx-auto flex flex-col items-center justify-center gap-4">
        <p className="text-red-400 text-center">
          Could not load Strava data. Try logging in again.
        </p>
        <p className="text-zinc-400 text-xs text-center font-mono">{errorMsg}</p>
        <a
          href="/api/strava/auth?force=1"
          className="px-5 py-2.5 bg-[#FC4C02] hover:bg-[#e04300] text-white rounded-xl font-medium transition-colors"
        >
          Log in with Strava
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
      <h1 className="text-2xl font-bold text-white mb-6">Import from Strava</h1>
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
