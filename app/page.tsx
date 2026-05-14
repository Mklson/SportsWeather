import Image from "next/image";
import { RouteImporter } from "@/components/route/RouteImporter";

const STRAVA_ERRORS: Record<string, string> = {
  strava_denied:         "Du avbrøt Strava-tilkoblingen.",
  strava_state_mismatch: "Sikkerhetssjekk feilet (state mismatch). Prøv igjen.",
  strava_no_code:        "Ingen autoriseringskode mottatt fra Strava.",
  strava_token_exchange: "Klarte ikke å hente token fra Strava. Sjekk at app-konfigurasjonen er riktig.",
  strava_fetch_failed:   "Koblet til Strava, men klarte ikke laste aktiviteter. Prøv igjen.",
};

export default function HomePage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const errorMsg = searchParams.error
    ? (STRAVA_ERRORS[searchParams.error] ?? `Ukjent feil: ${searchParams.error}`)
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
