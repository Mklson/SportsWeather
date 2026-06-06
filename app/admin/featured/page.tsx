import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getFeaturedRouteIds, getRoute, getRoutesByUser } from "@/lib/db/client";
import { LogoutButton } from "@/components/LogoutButton";
import { addFeaturedRouteAction, removeFeaturedRouteAction } from "./actions";

const SPORT_LABELS: Record<string, string> = {
  cycling: "🚴 Cycling",
  running: "🏃 Running",
  skiing: "⛷️ Skiing",
};

export default async function AdminFeaturedPage() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (user.email !== process.env.ADMIN_EMAIL) redirect("/dashboard");

  const featuredIds = await getFeaturedRouteIds();
  const featuredIdSet = new Set(featuredIds);

  const featuredRoutes = (
    await Promise.all(featuredIds.map((id) => getRoute(id)))
  ).filter((r): r is NonNullable<typeof r> => r !== null);

  const adminRoutes = await getRoutesByUser(user.id);
  const notFeatured = adminRoutes.filter((r) => !featuredIdSet.has(r.id));

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
          <h1 className="text-2xl font-bold text-gray-900">Featured Routes</h1>
          <p className="text-sm text-gray-500 mt-1">Routes shown on the front page for all users.</p>
        </div>

        {/* Currently featured */}
        <div className="mb-10">
          <div className="flex items-baseline gap-3 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Currently Featured</h2>
            <span className="text-gray-400 text-sm">{featuredRoutes.length}</span>
          </div>

          {featuredRoutes.length === 0 ? (
            <p className="text-gray-400 text-sm">No featured routes yet.</p>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <th className="px-5 py-3">Name</th>
                    <th className="px-5 py-3">Sport</th>
                    <th className="px-5 py-3 text-right">Distance</th>
                    <th className="px-5 py-3 text-right">Elevation</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {featuredRoutes.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <Link href={`/route/${r.id}`} target="_blank" className="text-blue-700 hover:underline font-medium">
                          {r.name}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-gray-600">
                        {r.sport ? SPORT_LABELS[r.sport] ?? r.sport : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-3 text-right text-gray-700">{r.distance_km.toFixed(1)} km</td>
                      <td className="px-5 py-3 text-right text-gray-700">
                        {r.elevation_gain_m ? `${Math.round(r.elevation_gain_m)} m` : "—"}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <form action={removeFeaturedRouteAction}>
                          <input type="hidden" name="routeId" value={r.id} />
                          <button type="submit" className="text-xs text-red-600 hover:text-red-800 font-medium">
                            Remove
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add from library */}
        <div>
          <div className="flex items-baseline gap-3 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Add from your library</h2>
            <span className="text-gray-400 text-sm">{notFeatured.length}</span>
          </div>

          {notFeatured.length === 0 ? (
            <p className="text-gray-400 text-sm">All your routes are already featured.</p>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <th className="px-5 py-3">Name</th>
                    <th className="px-5 py-3">Sport</th>
                    <th className="px-5 py-3 text-right">Distance</th>
                    <th className="px-5 py-3 text-right">Elevation</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {notFeatured.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <Link href={`/route/${r.id}`} target="_blank" className="text-blue-700 hover:underline font-medium">
                          {r.name}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-gray-600">
                        {r.sport ? SPORT_LABELS[r.sport] ?? r.sport : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-3 text-right text-gray-700">
                        {r.distance_km?.toFixed(1)} km
                      </td>
                      <td className="px-5 py-3 text-right text-gray-700">
                        {r.elevation_gain_m ? `${Math.round(r.elevation_gain_m)} m` : "—"}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <form action={addFeaturedRouteAction}>
                          <input type="hidden" name="routeId" value={r.id} />
                          <button type="submit" className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                            Add to featured
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
