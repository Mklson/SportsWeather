import Image from "next/image";
import Link from "next/link";
import { RouteImporter } from "@/components/route/RouteImporter";
import { FeaturedRoutes } from "@/components/FeaturedRoutes";
import { getRoute } from "@/lib/db/client";
import { FEATURED_ROUTE_IDS } from "@/lib/featuredRoutes";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const STRAVA_ERRORS: Record<string, string> = {
  strava_denied:         "You cancelled the Strava connection.",
  strava_state_mismatch: "Security check failed (state mismatch). Please try again.",
  strava_no_code:        "No authorization code received from Strava.",
  strava_token_exchange: "Could not retrieve token from Strava. Check your app configuration.",
  strava_fetch_failed:   "Connected to Strava, but could not load activities. Please try again.",
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const errorMsg = searchParams.error
    ? (STRAVA_ERRORS[searchParams.error] ?? `Unknown error: ${searchParams.error}`)
    : null;

  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const featuredRoutes = (
    await Promise.all(FEATURED_ROUTE_IDS.map((id) => getRoute(id)))
  ).filter((r): r is NonNullable<typeof r> => r !== null);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-4 bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-4">
          <Image
            src="/weather-icon.png"
            alt="SportsWeather icon"
            width={72}
            height={72}
            priority
            className="drop-shadow-xl"
          />
          <h1 className="text-4xl font-bold tracking-tight text-blue-900">
            SportsWeather
          </h1>
        </div>
        <p className="text-gray-500 text-lg text-center">
          Upload a route and see wind, rain and temperature along the way
        </p>

        {/* Auth buttons */}
        {user ? (
          <Link
            href="/dashboard"
            className="mt-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors shadow-sm"
          >
            Go to my dashboard →
          </Link>
        ) : (
          <div className="flex flex-col items-center gap-2 mt-1">
            <div className="flex gap-3">
              <Link
                href="/login"
                className="border border-gray-300 hover:border-gray-400 text-gray-700 font-medium px-5 py-2 rounded-xl text-sm transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-xl text-sm transition-colors shadow-sm"
              >
                Create account
              </Link>
            </div>
            <p className="text-xs text-gray-400 text-center">
              Create a free account to save your routes and access them anytime.
            </p>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="w-full max-w-md bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm text-center">
          {errorMsg}
        </div>
      )}

      <RouteImporter />

      <FeaturedRoutes routes={featuredRoutes} />
    </main>
  );
}
