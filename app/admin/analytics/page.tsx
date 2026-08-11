import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import clsx from "clsx";
import { format, subDays } from "date-fns";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/LogoutButton";
import { formatCount } from "@/lib/format";
import { TrendChart, RankedBarList } from "@/components/admin/AnalyticsCharts";
import {
  AnalyticsNotConfiguredError,
  getTrafficTotals,
  getDailyTrend,
  getTopRoutes,
  getTopCountries,
  getTopReferrers,
  getDeviceBreakdown,
  type DateRange,
} from "@/lib/vercel-analytics";

const RANGE_OPTIONS = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
] as const;

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: { range?: string };
}) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (user.email !== process.env.ADMIN_EMAIL) redirect("/dashboard");

  const days = RANGE_OPTIONS.find((r) => String(r.days) === searchParams.range)?.days ?? 30;
  const range: DateRange = {
    since: format(subDays(new Date(), days - 1), "yyyy-MM-dd"),
    until: format(new Date(), "yyyy-MM-dd"),
  };

  let data: {
    totals: Awaited<ReturnType<typeof getTrafficTotals>>;
    trend: Awaited<ReturnType<typeof getDailyTrend>>;
    routes: Awaited<ReturnType<typeof getTopRoutes>>;
    countries: Awaited<ReturnType<typeof getTopCountries>>;
    referrers: Awaited<ReturnType<typeof getTopReferrers>>;
    devices: Awaited<ReturnType<typeof getDeviceBreakdown>>;
  } | null = null;
  let notConfigured = false;

  try {
    const [totals, trend, routes, countries, referrers, devices] = await Promise.all([
      getTrafficTotals(range),
      getDailyTrend(range),
      getTopRoutes(range),
      getTopCountries(range),
      getTopReferrers(range),
      getDeviceBreakdown(range),
    ]);
    data = { totals, trend, routes, countries, referrers, devices };
  } catch (err) {
    if (err instanceof AnalyticsNotConfiguredError) {
      notConfigured = true;
    } else {
      throw err;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="flex items-stretch shadow-md">
        <Link href="/" className="flex items-center px-4 py-2 bg-white">
          <Image src="/Logo with text on side-cropped.png" alt="AEROUTE" width={480} height={120} style={{ height: "72px", width: "auto" }} className="drop-shadow" />
        </Link>
        <div className="flex items-center gap-3 px-4 py-2 flex-1 justify-end" style={{ backgroundColor: "#003087" }}>
          <span className="text-white text-sm font-semibold hidden sm:block">Admin</span>
          <LogoutButton />
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/admin" className="text-sm text-blue-600 hover:underline mb-2 inline-block">
            ← Admin
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Traffic</h1>
          <p className="text-sm text-gray-500 mt-1">
            Site visits via Vercel Web Analytics — cookieless, aggregated, no personal data.
          </p>
        </div>

        {notConfigured ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-2">Web Analytics isn&apos;t connected yet</h2>
            <p className="text-sm text-gray-600 mb-4">
              The traffic dashboard reads from the Vercel Web Analytics API, which needs a bit of one-time setup:
            </p>
            <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
              <li>Enable Web Analytics for this project in the Vercel dashboard (Project → Analytics → Enable).</li>
              <li>
                Create an access token at{" "}
                <span className="text-gray-500">vercel.com/account/tokens</span>.
              </li>
              <li>
                Set <code className="bg-gray-100 px-1 rounded">VERCEL_API_TOKEN</code>,{" "}
                <code className="bg-gray-100 px-1 rounded">VERCEL_PROJECT_ID</code>, and (if the project is under a
                team) <code className="bg-gray-100 px-1 rounded">VERCEL_TEAM_ID</code> as environment variables.
              </li>
            </ol>
            <p className="text-sm text-gray-500 mt-4">
              The collection script is already wired into every page, so data starts accumulating as soon as this
              deploys — this page just needs credentials to read it back.
            </p>
          </div>
        ) : (
          <>
            {/* Date range — one row, above everything it scopes */}
            <div className="flex gap-1.5 mb-5">
              {RANGE_OPTIONS.map((opt) => (
                <Link
                  key={opt.days}
                  href={`/admin/analytics?range=${opt.days}`}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                    days === opt.days
                      ? "bg-brand-green-soft text-brand-green-dark"
                      : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                  )}
                >
                  {opt.label}
                </Link>
              ))}
            </div>

            {/* Stat tiles */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Pageviews</div>
                <div className="text-3xl font-semibold text-gray-900">{formatCount(data!.totals.pageviews)}</div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Visitors</div>
                <div className="text-3xl font-semibold text-gray-900">{formatCount(data!.totals.visitors)}</div>
              </div>
            </div>

            {/* Trend */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Daily traffic</h2>
              <TrendChart data={data!.trend} />
            </div>

            {/* Ranked breakdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <h2 className="text-sm font-semibold text-gray-900 mb-3">Top routes</h2>
                <RankedBarList rows={data!.routes} />
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <h2 className="text-sm font-semibold text-gray-900 mb-3">Top countries</h2>
                <RankedBarList rows={data!.countries} />
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <h2 className="text-sm font-semibold text-gray-900 mb-3">Top referrers</h2>
                <RankedBarList rows={data!.referrers} />
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <h2 className="text-sm font-semibold text-gray-900 mb-3">Devices</h2>
                <RankedBarList rows={data!.devices} />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
