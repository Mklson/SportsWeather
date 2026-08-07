"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getDictionary, type Lang } from "@/lib/i18n/dictionary";

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: ReturnType<typeof getDictionary>;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const LANG_COOKIE = "lang";
const LANG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export function LanguageProvider({
  initialLang,
  children,
}: {
  initialLang: Lang;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [lang, setLangState] = useState<Lang>(initialLang);

  const setLang = useCallback(
    (next: Lang) => {
      setLangState(next);
      document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=${LANG_COOKIE_MAX_AGE}`;
      document.documentElement.lang = next;
      router.refresh();
    },
    [router]
  );

  const value = useMemo<LanguageContextValue>(
    () => ({ lang, setLang, t: getDictionary(lang) }),
    [lang, setLang]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
