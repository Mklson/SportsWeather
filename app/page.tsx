import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { RouteImporter } from "@/components/route/RouteImporter";
import { UTNoGuide } from "@/components/route/UTNoGuide";
import { GarminGuide } from "@/components/route/GarminGuide";
import { StravaGuide } from "@/components/route/StravaGuide";
import { AllTrailsGuide } from "@/components/route/AllTrailsGuide";
import { FeaturedRoutes } from "@/components/FeaturedRoutes";
import { LanguageToggle } from "@/components/LanguageToggle";
import { AboutDeveloper } from "@/components/AboutDeveloper";
import { FeedbackButton } from "@/components/FeedbackButton";
import { getRoute, getFeaturedRouteIds } from "@/lib/db/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDictionary, interpolate, type Lang } from "@/lib/i18n/dictionary";

const STRAVA_ERROR_KEYS: Record<string, string> = {
  strava_denied: "denied",
  strava_state_mismatch: "stateMismatch",
  strava_no_code: "noCode",
  strava_token_exchange: "tokenExchange",
  strava_fetch_failed: "fetchFailed",
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const cookieLang = cookies().get("lang")?.value;
  const lang: Lang = cookieLang === "en" ? "en" : "no";
  const t = getDictionary(lang);

  const errorKey = searchParams.error ? STRAVA_ERROR_KEYS[searchParams.error] : null;
  const errorMsg = searchParams.error
    ? errorKey
      ? (t.front.stravaErrors as Record<string, string>)[errorKey]
      : interpolate(t.front.stravaErrors.unknown, { error: searchParams.error })
    : null;

  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [weatherSourcePre, weatherSourcePost] = t.front.weatherSource.split("{{yrLink}}");

  const featuredRouteIds = await getFeaturedRouteIds();
  const featuredRoutes = (
    await Promise.all(featuredRouteIds.map((id) => getRoute(id)))
  ).filter((r): r is NonNullable<typeof r> => r !== null);

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center gap-8 p-4 bg-white">
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>

      <div className="flex flex-col items-center gap-2">
        <Image src="/Logo with text on side-cropped.png" alt="AEROUTE" width={560} height={160} priority className="h-24 w-auto drop-shadow-xl" />
      </div>

      <p className="text-sm text-gray-600 text-center max-w-lg -mt-4">
        {t.front.intro1}
        <br />
        {t.front.intro2}
      </p>
      <p className="text-xs text-gray-400 text-center max-w-lg -mt-6">
        {weatherSourcePre}
        <a
          href="https://www.yr.no"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-gray-500"
        >
          yr.no
        </a>
        {weatherSourcePost}
      </p>

      {errorMsg && (
        <div className="w-full max-w-md bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm text-center">
          {errorMsg}
        </div>
      )}

      <div className="flex flex-col items-center gap-6 w-full max-w-md">
        <div className="flex flex-col items-center gap-2 w-full">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{t.front.importFrom}</p>
          <div className="grid grid-cols-4 gap-1 w-full">
            <StravaGuide />
            <UTNoGuide />
            <GarminGuide />
            <AllTrailsGuide />
          </div>
        </div>

        <RouteImporter />
      </div>

      {user ? (
        <Link
          href="/dashboard"
          className="bg-brand-navy hover:bg-brand-navy-dark text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors shadow-sm"
        >
          {t.nav.goToDashboard}
        </Link>
      ) : (
        <div className="flex flex-col items-center gap-3 w-full max-w-md rounded-2xl border border-brand-cream-border bg-brand-cream px-5 py-4">
          <p className="text-sm text-gray-600 text-center max-w-xs">
            {t.front.createAccountText}
          </p>
          <div className="flex gap-3">
            <Link
              href="/login"
              className="border border-gray-300 hover:border-gray-400 text-gray-700 font-medium px-5 py-2 rounded-xl text-sm transition-colors"
            >
              {t.nav.signIn}
            </Link>
            <Link
              href="/register"
              className="bg-brand-navy hover:bg-brand-navy-dark text-white font-semibold px-5 py-2 rounded-xl text-sm transition-colors shadow-sm"
            >
              {t.nav.createAccount}
            </Link>
          </div>
        </div>
      )}

      <FeaturedRoutes routes={featuredRoutes} />

      <footer className="w-full flex flex-col items-center gap-2 pb-4">
        <p className="text-xs text-gray-400 text-center max-w-xs">
          {t.front.cookieNotice}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1">
          <AboutDeveloper />
          <span className="text-gray-300">·</span>
          <FeedbackButton variant="link" />
          <span className="text-gray-300">·</span>
          <Link href="/personvern" className="text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors whitespace-nowrap">
            {t.front.personvern}
          </Link>
          <span className="text-gray-300">·</span>
          <Link href="/login?next=/admin" className="text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors whitespace-nowrap">
            {t.front.admin}
          </Link>
        </div>
      </footer>
    </main>
  );
}
