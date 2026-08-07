"use client";

import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function LogoutButton() {
  const router = useRouter();
  const { t } = useLanguage();

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="text-sm font-semibold text-white hover:text-blue-200 transition-colors px-2 py-1 rounded-lg"
    >
      {t.nav.signOut}
    </button>
  );
}
