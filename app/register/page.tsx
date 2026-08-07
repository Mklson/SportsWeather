"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError(t.auth.register.passwordMismatch);
      return;
    }
    if (password.length < 6) {
      setError(t.auth.register.passwordTooShort);
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-white">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2">
          <Link href="/">
            <Image src="/Logo with text on side-cropped.png" alt="AEROUTE" width={560} height={160} priority className="h-32 w-auto drop-shadow-xl" />
          </Link>
          <p className="text-sm text-gray-500">{t.auth.register.freeNoCard}</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">{t.auth.register.email}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder={t.auth.register.emailPlaceholder}
              className="border border-gray-300 rounded-xl px-3 py-2.5 text-base md:text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-navy"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-gray-700">{t.auth.register.password}</label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder={t.auth.register.passwordPlaceholder}
              className="border border-gray-300 rounded-xl px-3 py-2.5 text-base md:text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-navy"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirm" className="text-sm font-medium text-gray-700">{t.auth.register.confirmPassword}</label>
            <input
              id="confirm"
              name="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="off"
              placeholder={t.auth.register.confirmPasswordPlaceholder}
              className="border border-gray-300 rounded-xl px-3 py-2.5 text-base md:text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-navy"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-brand-navy hover:bg-brand-navy-dark text-white font-semibold rounded-xl py-2.5 text-sm transition-colors disabled:opacity-50 mt-1"
          >
            {loading ? t.auth.register.creating : t.auth.register.createAccount}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500">
          {t.auth.register.alreadyHaveAccount}{" "}
          <Link href="/login" className="text-brand-navy font-medium hover:underline">
            {t.auth.register.signIn}
          </Link>
        </p>
      </div>
    </main>
  );
}
