import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRoutesByUser } from "@/lib/db/client";
import { SavedRoutes } from "@/components/SavedRoutes";
import { DashboardRouteImporter } from "@/components/DashboardRouteImporter";
import Image from "next/image";
import { LogoutButton } from "@/components/LogoutButton";

export default async function DashboardPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const savedRoutes = await getRoutesByUser(user.id);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="flex items-stretch shadow-md">
        <Link href="/" className="flex items-center px-4 py-2 bg-white">
          <Image src="/Logo with text on side-cropped.png" alt="AEROUTE" width={480} height={120} style={{ height: '120px', width: 'auto' }} className="drop-shadow" />
        </Link>
        <div className="flex items-center gap-3 px-4 py-2 flex-1 justify-end" style={{ backgroundColor: '#003087' }}>
          <span className="text-white text-sm font-semibold hidden sm:block truncate max-w-[200px]">
            {user.email}
          </span>
          <LogoutButton />
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 flex flex-col gap-10">
        {/* Saved routes — front and center */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900">
              Saved routes
              {savedRoutes.length > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-400">
                  {savedRoutes.length}
                </span>
              )}
            </h2>
          </div>
          <SavedRoutes routes={savedRoutes} />
        </section>

        {/* Upload / import */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Add a route</h2>
          <p className="text-sm text-gray-500 mb-4">
            Upload a GPX or TCX file, connect Strava, or search cross-country trails.
            Every route you add is saved to your account and appears above — one click to open and see the weather along the way.
          </p>
          <div className="bg-white rounded-2xl border border-gray-200 p-6 flex justify-center">
            <DashboardRouteImporter />
          </div>
        </section>
      </main>
    </div>
  );
}
