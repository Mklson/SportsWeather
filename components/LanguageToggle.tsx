"use client";

import clsx from "clsx";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  return (
    <div className="inline-flex items-center rounded-full border border-gray-200 bg-white p-0.5 text-xs font-semibold shadow-sm">
      <button
        type="button"
        onClick={() => setLang("no")}
        className={clsx(
          "px-2.5 py-1 rounded-full transition-colors",
          lang === "no" ? "bg-brand-navy text-white" : "text-gray-400 hover:text-gray-600"
        )}
      >
        NO
      </button>
      <button
        type="button"
        onClick={() => setLang("en")}
        className={clsx(
          "px-2.5 py-1 rounded-full transition-colors",
          lang === "en" ? "bg-brand-navy text-white" : "text-gray-400 hover:text-gray-600"
        )}
      >
        EN
      </button>
    </div>
  );
}
