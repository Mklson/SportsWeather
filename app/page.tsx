import Image from "next/image";
import { RouteImporter } from "@/components/route/RouteImporter";

const STRAVA_ERRORS: Record<string, string> = {
  strava_denied:         "You cancelled the Strava connection.",
  strava_state_mismatch: "Security check failed (state mismatch). Please try again.",
  strava_no_code:        "No authorization code received from Strava.",
  strava_token_exchange: "Could not retrieve token from Strava. Check your app configuration.",
  strava_fetch_failed:   "Connected to Strava, but could not load activities. Please try again.",
};

export default function HomePage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const errorMsg = searchParams.error
    ? (STRAVA_ERRORS[searchParams.error] ?? `Unknown error: ${searchParams.error}`)
    : null;

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
      </div>

      {errorMsg && (
        <div className="w-full max-w-md bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm text-center">
          {errorMsg}
        </div>
      )}

      <RouteImporter />
    </main>
  );
}
