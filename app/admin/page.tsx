import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/db/client";
import { LogoutButton } from "@/components/LogoutButton";

export default async function AdminPage() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (user.email !== process.env.ADMIN_EMAIL) redirect("/dashboard");

  // Fetch all auth users
  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;

  // Fetch route counts per user
  const { data: routeCounts } = await supabaseAdmin
    .from("routes")
    .select("user_id")
    .not("user_id", "is", null);

  const countByUser = (routeCounts ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.user_id] = (acc[r.user_id] ?? 0) + 1;
    return acc;
  }, {});

  const sorted = [...users].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="flex items-stretch shadow-md">
        <Link href="/" className="flex items-center px-4 py-2 bg-white">
          <Image src="/Logo with text on side-cropped.png" alt="AEROUTE" width={480} height={120} style={{ height: '72px', width: 'auto' }} className="drop-shadow" />
        </Link>
        <div className="flex items-center gap-3 px-4 py-2 flex-1 justify-end" style={{ backgroundColor: '#003087' }}>
          <span className="text-white text-sm font-semibold hidden sm:block">Admin</span>
          <LogoutButton />
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-baseline gap-3 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <span className="text-gray-400 text-sm">{users.length} total</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Joined</th>
                <th className="px-5 py-3">Last sign-in</th>
                <th className="px-5 py-3 text-right">Routes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="text-blue-700 hover:underline font-medium"
                    >
                      {u.email ?? <span className="text-gray-400 italic">no email</span>}
                    </Link>
                    {u.email === process.env.ADMIN_EMAIL && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-semibold">admin</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-gray-500">
                    {new Date(u.created_at).toLocaleDateString("no-NO")}
                  </td>
                  <td className="px-5 py-3 text-gray-500">
                    {u.last_sign_in_at
                      ? new Date(u.last_sign_in_at).toLocaleDateString("no-NO")
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="font-semibold text-gray-900 hover:text-blue-700"
                    >
                      {countByUser[u.id] ?? 0}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
