import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/db/client";
import { LogoutButton } from "@/components/LogoutButton";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminUserPage({ params }: Props) {
  const { id } = await params;

  const supabase = createSupabaseServerClient();
  const { data: { user: admin } } = await supabase.auth.getUser();

  if (!admin || admin.email !== process.env.ADMIN_EMAIL) redirect("/dashboard");

  const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(id);
  if (error || !user) notFound();

  const { data: routes } = await supabaseAdmin
    .from("routes")
    .select("id, name, sport, distance_km, elevation_gain_m, created_at, source")
    .eq("user_id", id)
    .order("created_at", { ascending: false });

  const sportEmoji: Record<string, string> = {
    cycling: "🚴",
    running: "🏃",
    skiing: "⛷️",
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="flex items-stretch shadow-md">
        <Link href="/" className="flex items-center px-4 py-2 bg-white">
          <Image src="/Logo with text on side-cropped.png" alt="AEROUTE" width={480} height={120} style={{ height: '120px', width: 'auto' }} className="drop-shadow" />
        </Link>
        <div className="flex items-center gap-3 px-4 py-2 flex-1 justify-end" style={{ backgroundColor: '#003087' }}>
          <span className="text-white text-sm font-semibold hidden sm:block">Admin</span>
          <LogoutButton />
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/admin" className="text-sm text-blue-600 hover:underline mb-2 inline-block">
            ← All users
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 break-all">{user.email}</h1>
          <div className="flex gap-4 mt-1 text-sm text-gray-500">
            <span>Joined {new Date(user.created_at).toLocaleDateString("no-NO")}</span>
            {user.last_sign_in_at && (
              <span>Last sign-in {new Date(user.last_sign_in_at).toLocaleDateString("no-NO")}</span>
            )}
          </div>
        </div>

        <div className="flex items-baseline gap-3 mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Routes</h2>
          <span className="text-gray-400 text-sm">{routes?.length ?? 0}</span>
        </div>

        {!routes || routes.length === 0 ? (
          <p className="text-gray-400 text-sm">No routes yet.</p>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Sport</th>
                  <th className="px-5 py-3 text-right">Distance</th>
                  <th className="px-5 py-3 text-right">Elevation</th>
                  <th className="px-5 py-3">Source</th>
                  <th className="px-5 py-3">Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {routes.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <Link
                        href={`/route/${r.id}`}
                        className="text-blue-700 hover:underline font-medium"
                        target="_blank"
                      >
                        {r.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {r.sport ? `${sportEmoji[r.sport] ?? ""} ${r.sport}` : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-700">
                      {r.distance_km ? `${r.distance_km.toFixed(1)} km` : "—"}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-700">
                      {r.elevation_gain_m ? `${Math.round(r.elevation_gain_m)} m` : "—"}
                    </td>
                    <td className="px-5 py-3 text-gray-500 capitalize">{r.source ?? "—"}</td>
                    <td className="px-5 py-3 text-gray-500">
                      {new Date(r.created_at).toLocaleDateString("no-NO")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
