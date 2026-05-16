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

    const isRateLimit = errorMsg.startsWith("RATE_LIMIT:") || errorMsg.includes("429");
    const isUnauthorized = errorMsg.includes("401");

    // 429: token is fine, just too many requests. Don't auto-refresh — show a wait message.
    if (isRateLimit) {
      // Parse "RATE_LIMIT:<usage>:<limit>" — e.g. "RATE_LIMIT:97,850:100,1000"
      const [, usagePart, limitPart] = errorMsg.split(":");
      const [fifteenUsage, dailyUsage] = (usagePart ?? "").split(",").map(Number);
      const [fifteenLimit, dailyLimit] = (limitPart ?? "").split(",").map(Number);
      const isDailyLimit = dailyLimit > 0 && dailyUsage >= dailyLimit;
      const waitMsg = isDailyLimit
        ? "You have hit the daily request limit. Try again tomorrow."
        : "You have hit the 15-minute request limit. Wait a few minutes and try again.";
      const usageInfo = fifteenLimit > 0
        ? `${fifteenUsage}/${fifteenLimit} per 15 min · ${dailyUsage}/${dailyLimit} per day`
        : null;

      return (
        <main className="min-h-screen bg-gray-50 p-4 max-w-5xl mx-auto flex flex-col items-center justify-center gap-4">
          <p className="text-yellow-600 text-center font-medium">
            Strava rate limit reached.
          </p>
          <p className="text-gray-500 text-sm text-center">{waitMsg}</p>
          {usageInfo && (
            <p className="text-gray-400 text-xs text-center font-mono">{usageInfo}</p>
          )}
          {!isDailyLimit && (
            <a
              href="/strava/activities"
              className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-medium transition-colors"
            >
              Try again
            </a>
          )}
        </main>
      );
    }

    // 401: token expired. Auto-refresh once, then fall through to manual re-auth.
    if (isUnauthorized && !searchParams.retried) {
      redirect("/api/strava/refresh");
    }

    // Already retried, or some other error — show manual re-auth.
    return (
      <main className="min-h-screen bg-gray-50 p-4 max-w-5xl mx-auto flex flex-col items-center justify-center gap-4">
        <p className="text-red-600 text-center">
          Could not load Strava data. Try logging in again.
        </p>
        <p className="text-gray-400 text-xs text-center font-mono">{errorMsg}</p>
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
    <main className="min-h-screen bg-gray-50 p-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Import from Strava</h1>
        <a
          href="/api/strava/logout"
          className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
        >
          Disconnect Strava
        </a>
      </div>
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
