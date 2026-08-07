import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRoutesByUser } from "@/lib/db/client";
import { SavedRoutes } from "@/components/SavedRoutes";
import { DashboardRouteImporter } from "@/components/DashboardRouteImporter";
import Image from "next/image";
import { LogoutButton } from "@/components/LogoutButton";
import { getDictionary, type Lang } from "@/lib/i18n/dictionary";

export default async function DashboardPage() {
  const cookieLang = cookies().get("lang")?.value;
  const lang: Lang = cookieLang === "en" ? "en" : "no";
  const t = getDictionary(lang);

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
        <Link href="/" className="w-1/2 flex items-center justify-center bg-white px-2">
          <Image src="/Logo with text on side-cropped.png" alt="AEROUTE" width={480} height={120} className="h-9 sm:h-12 w-auto drop-shadow" />
        </Link>
        <div className="w-1/2 flex items-center gap-3 px-4 py-2 justify-end bg-brand-navy">
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
              {t.dashboard.savedRoutes}
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
          <h2 className="text-xl font-bold text-gray-900 mb-4">{t.dashboard.addRoute}</h2>
          <div className="bg-white rounded-2xl border border-gray-200 p-6 flex justify-center">
            <DashboardRouteImporter />
          </div>
        </section>
      </main>
    </div>
  );
}
