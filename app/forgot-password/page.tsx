"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { interpolate } from "@/lib/i18n/dictionary";

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSubmitted(true);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-white">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2">
          <Link href="/">
            <Image src="/Logo with text on side-cropped.png" alt="AEROUTE" width={560} height={160} priority className="h-24 w-auto drop-shadow-xl" />
          </Link>
          <p className="text-sm text-gray-500">{t.auth.forgotPassword.title}</p>
        </div>

        {submitted ? (
          <div className="flex flex-col gap-4 text-center">
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm">
              {interpolate(t.auth.forgotPassword.checkInbox, { email })}
            </div>
            <Link href="/login" className="text-sm text-brand-navy font-medium hover:underline">
              {t.auth.forgotPassword.backToSignIn}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">{t.auth.forgotPassword.email}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder={t.auth.forgotPassword.emailPlaceholder}
                className="border border-gray-300 rounded-xl px-3 py-2.5 text-base md:text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-navy"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-brand-navy hover:bg-brand-navy-dark text-white font-semibold rounded-xl py-2.5 text-sm transition-colors disabled:opacity-50 mt-1"
            >
              {loading ? t.auth.forgotPassword.sending : t.auth.forgotPassword.sendResetLink}
            </button>

            <p className="text-center text-sm text-gray-500">
              {t.auth.forgotPassword.rememberedIt}{" "}
              <Link href="/login" className="text-brand-navy font-medium hover:underline">
                {t.auth.forgotPassword.signIn}
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
