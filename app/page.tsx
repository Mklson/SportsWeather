import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { RouteImporter, StravaIcon } from "@/components/route/RouteImporter";
import { KartverketTrailSearch } from "@/components/trail/KartverketTrailSearch";
import { UTNoGuide } from "@/components/route/UTNoGuide";
import { GarminGuide } from "@/components/route/GarminGuide";
import { FeaturedRoutes } from "@/components/FeaturedRoutes";
import { getRoute, getFeaturedRouteIds } from "@/lib/db/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const IMPORT_LINK_CLASS =
  "flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-xl text-xs font-medium transition-colors shadow-sm text-center";

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

  const featuredRouteIds = await getFeaturedRouteIds();
  const featuredRoutes = (
    await Promise.all(featuredRouteIds.map((id) => getRoute(id)))
  ).filter((r): r is NonNullable<typeof r> => r !== null);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-4 bg-white">
      <div className="flex flex-col items-center gap-2">
        <Image src="/Logo with text on side-cropped.png" alt="AEROUTE" width={560} height={160} priority className="h-24 w-auto drop-shadow-xl" />
      </div>

      {user ? (
        <Link
          href="/dashboard"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors shadow-sm"
        >
          Go to my dashboard →
        </Link>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-gray-500 text-center max-w-xs">
            Create a free account to save your routes and access them anytime from your dashboard.
          </p>
          <div className="flex gap-3">
            <Link
              href="/login"
              className="border border-gray-300 hover:border-gray-400 text-gray-700 font-medium px-5 py-2 rounded-xl text-sm transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="text-white font-semibold px-5 py-2 rounded-xl text-sm transition-colors shadow-sm" style={{ backgroundColor: '#003087' }}
            >
              Create account
            </Link>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="w-full max-w-md bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm text-center">
          {errorMsg}
        </div>
      )}

      <div className="flex flex-col items-center gap-3 w-full max-w-md">
        <RouteImporter />

        <div className="flex flex-col items-center gap-2 w-full">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Or import a route from</p>
          <div className="grid grid-cols-4 gap-2 w-full">
            <KartverketTrailSearch />
            <a
              href="/api/strava/auth"
              className={clsx(IMPORT_LINK_CLASS, "bg-[#FC4C02] hover:bg-[#e04300] text-white")}
            >
              <StravaIcon />
              Strava
            </a>
            <UTNoGuide />
            <GarminGuide />
          </div>
        </div>
      </div>

      <FeaturedRoutes routes={featuredRoutes} />

      <footer className="w-full flex justify-center pb-4">
        <Link href="/login?next=/admin" className="text-xs text-gray-300 hover:text-gray-400 transition-colors">
          Admin
        </Link>
      </footer>
    </main>
  );
}
